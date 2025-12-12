#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import path from 'node:path';
import { splitFile, paraphraseDirectory } from './pipeline.js';
import { createSplitter, detectFormat } from './splitters/Splitter.js';
import { OpenAIClient } from './llm/openaiClient.js';
import { ClaudeClient } from './llm/claudeClient.js';
import { EbookFormat, LLMClient, SplitOptions, ParaphraseOptions } from './types.js';

function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

function getClient(provider: string, apiKey?: string, anthropicKey?: string): LLMClient {
  if (provider === 'claude') {
    return new ClaudeClient(anthropicKey || process.env.ANTHROPIC_API_KEY || '');
  }
  return new OpenAIClient(apiKey || process.env.OPENAI_API_KEY || '');
}

function buildParaphraseOptions(opts: any): ParaphraseOptions {
  return {
    model: opts.modelName,
    temperature: Number(opts.temperature ?? 0.4),
    topP: opts.topP ? Number(opts.topP) : undefined,
    maxCharsPerCall: Number(opts.maxCharsPerCall ?? 8000),
    promptHeader:
      'You are creating a concise, engaging article that highlights this book chapter. Provide citations so readers can locate the referenced parts in the book.',
  };
}

async function handleSplit(input: string, opts: any) {
  const inputPath = resolvePath(input);
  const outputDir = resolvePath(opts.output);
  const splitOptions: SplitOptions & { format?: EbookFormat } = {
    format: opts.format as EbookFormat | undefined,
    pandocPath: opts.pandocPath,
  };

  const format = splitOptions.format ?? detectFormat(inputPath);
  const splitter = createSplitter(format);
  if (!splitter.canHandle(inputPath)) {
    throw new Error(`Splitter for ${format} cannot handle file: ${inputPath}`);
  }

  const result = await splitFile(inputPath, outputDir, splitOptions);
  console.log(`Chapters written to ${outputDir}. Total: ${result.chapters.length}`);
  if (result.warnings.length) {
    result.warnings.forEach((w) => console.warn(`Warning: ${w}`));
  }
}

async function handleParaphrase(inputDir: string, opts: any) {
  const chaptersDir = resolvePath(inputDir);
  const outputDir = resolvePath(opts.output);
  const client = getClient(opts.provider, opts.apiKey, opts.anthropicKey);
  const paraphraseOpts = buildParaphraseOptions(opts);
  await paraphraseDirectory(chaptersDir, outputDir, client, paraphraseOpts);
  console.log(`Paraphrased files written to ${outputDir}`);
}

async function handleRun(input: string, opts: any) {
  const tmpOut = resolvePath(opts.output);
  await handleSplit(input, opts);
  await handleParaphrase(tmpOut, opts);
}

const program = new Command();
program
  .name('ghostwriter')
  .description('Split ebooks per chapter and paraphrase with citations.')
  .option('--api-key <key>', 'OpenAI API key')
  .option('--anthropic-key <key>', 'Anthropic API key')
  .option('--pandoc-path <path>', 'Path to pandoc binary')
  .option('--max-chars-per-call <number>', 'Max characters to send per LLM call', '8000')
  .option('--model-name <name>', 'Underlying model name', 'gpt-4o-mini')
  .option('--temperature <number>', 'Sampling temperature', '0.4')
  .option('--top-p <number>', 'Top-p nucleus sampling', undefined)
  .option('--provider <provider>', 'LLM provider: openai|claude', 'openai');

program
  .command('split')
  .argument('<input>', 'Input ebook path (pdf|epub|mobi|txt)')
  .requiredOption('-o, --output <dir>', 'Directory to write chapter txt files')
  .option('-f, --format <format>', 'Force format: pdf|epub|mobi|txt')
  .action((input, options) => {
    handleSplit(input, options).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program
  .command('paraphrase')
  .argument('<chaptersDir>', 'Directory containing chapter txt files')
  .requiredOption('-o, --output <dir>', 'Directory to write paraphrased outputs')
  .action((dir, options) => {
    handleParaphrase(dir, options).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program
  .command('run')
  .argument('<input>', 'Input ebook path (pdf|epub|mobi|txt)')
  .requiredOption('-o, --output <dir>', 'Output directory for both steps')
  .option('-f, --format <format>', 'Force format: pdf|epub|mobi|txt')
  .action((input, options) => {
    handleRun(input, options).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program.parse();

