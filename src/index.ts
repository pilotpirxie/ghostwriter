#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import path from "node:path";
import { splitFile, paraphraseDirectory } from "./pipeline.js";
import { OpenAIClient } from "./llm/openaiClient.js";
import { ClaudeClient } from "./llm/claudeClient.js";
import {
  EbookFormat,
  LLMClient,
  SplitOptions,
  ParaphraseOptions,
} from "./types.js";

function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

function getClient(provider: string, apiKey?: string): LLMClient {
  if (provider === "claude") {
    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    return new ClaudeClient(resolvedKey);
  }
  const resolvedKey = apiKey || process.env.OPENAI_API_KEY || "";
  return new OpenAIClient(resolvedKey);
}

function buildParaphraseOptions(opts: any): ParaphraseOptions {
  const provider = opts.provider || "openai";
  const model =
    opts.modelName ||
    (provider === "claude" ? "claude-3-haiku-20240307" : "gpt-4o-mini");

  return {
    model,
    temperature: Number(opts.temperature ?? 0.4),
    topP: opts.topP ? Number(opts.topP) : undefined,
    maxCharsPerCall: Number(opts.maxCharsPerCall ?? 8000),
    maxTokens: opts.maxTokens ? Number(opts.maxTokens) : undefined,
    promptHeader:
      opts.promptHeader ??
      "You are writer assistant that helps the user to summarize and paraphrase the provided content. Do not invent details that are not supported by the chapter. If you answer to academic or analytical content, refer to specific parts, include simple inline references (for example: page or section numbers). Follow the content's style, tone and language.",
  };
}

async function handleSplit(input: string, opts: any) {
  const inputPath = resolvePath(input);
  const outputDir = resolvePath(opts.output);
  const splitOptions: SplitOptions & { format?: EbookFormat } = {
    format: opts.format as EbookFormat | undefined,
    pandocPath: opts.pandocPath,
    mdHeadingLevel: opts.mdHeadingLevel
      ? Number(opts.mdHeadingLevel)
      : undefined,
  };

  const result = await splitFile(inputPath, outputDir, splitOptions);
  console.info(
    `Chapters written to ${outputDir}. Total: ${result.chapters.length}`,
  );
}

async function handleParaphrase(inputDir: string, opts: any) {
  const chaptersDir = resolvePath(inputDir);
  const outputDir = resolvePath(opts.output);
  const client = getClient(opts.provider, opts.apiKey);
  const paraphraseOpts = buildParaphraseOptions(opts);
  await paraphraseDirectory(chaptersDir, outputDir, client, paraphraseOpts);
  console.info(`Paraphrased files written to ${outputDir}`);
}

async function handleRun(input: string, opts: any) {
  const tmpOut = resolvePath(opts.output);
  await handleSplit(input, opts);
  await handleParaphrase(tmpOut, opts);
}

const program = new Command();
program
  .name("ghostwriter")
  .description("Split ebooks per chapter and paraphrase with citations.")
  .option(
    "--api-key <key>",
    "API key for the selected provider (OPENAI_API_KEY or ANTHROPIC_API_KEY env var)",
  )
  .option("--pandoc-path <path>", "Path to pandoc binary")
  .option(
    "--prompt-header <text>",
    "Custom instruction/prompt used to guide the paraphrased output",
  )
  .option(
    "--max-chars-per-call <number>",
    "Max characters to send per LLM call",
    "8000",
  )
  .option(
    "--max-tokens <number>",
    "Maximum tokens to generate per LLM call",
    undefined,
  )
  .option("--model-name <name>", "Underlying model name", "gpt-4o-mini")
  .option("--temperature <number>", "Sampling temperature", "0.4")
  .option("--top-p <number>", "Top-p nucleus sampling", undefined)
  .option("--provider <provider>", "LLM provider: openai|claude", "openai");

program
  .command("split")
  .argument("<input>", "Input ebook path (pdf|epub|txt|md)")
  .requiredOption("-o, --output <dir>", "Directory to write chapter txt files")
  .option("-f, --format <format>", "Force format: pdf|epub|txt|md")
  .option(
    "--md-heading-level <number>",
    "Minimum markdown heading level to start a new chapter (1-6)",
    "2",
  )
  .action((input, options) => {
    const globalOptions = program.opts();
    const merged = { ...globalOptions, ...options };
    handleSplit(input, merged).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program
  .command("paraphrase")
  .argument("<chaptersDir>", "Directory containing chapter txt files")
  .requiredOption(
    "-o, --output <dir>",
    "Directory to write paraphrased outputs",
  )
  .action((dir, options) => {
    const globalOptions = program.opts();
    const merged = { ...globalOptions, ...options };
    handleParaphrase(dir, merged).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program
  .command("run")
  .argument("<input>", "Input ebook path (pdf|epub|txt|md)")
  .requiredOption("-o, --output <dir>", "Output directory for both steps")
  .option("-f, --format <format>", "Force format: pdf|epub|txt|md")
  .action((input, options) => {
    const globalOptions = program.opts();
    const merged = { ...globalOptions, ...options };
    handleRun(input, merged).catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
  });

program.parse();
