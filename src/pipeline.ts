import path from 'node:path';
import { createSplitter, detectFormat } from './splitters/Splitter.js';
import { LLMClient, SplitOptions, ParaphraseOptions, SplitResult, Chapter, EbookFormat } from './types.js';
import { saveChapters, loadChapters, saveParaphrased } from './utils/io.js';

function chunkText(text: string, maxChars: number, overlap = 300): string[] {
  const chunks: string[] = [];
  const safeMax = Math.max(maxChars, 2000);
  let start = 0;

  while (start < text.length) {
    const end = start + safeMax;
    const slice = text.slice(start, end);
    chunks.push(slice.trim());
    start = end - overlap;
  }
  return chunks;
}

async function paraphraseChapter(
  chapter: Chapter,
  client: LLMClient,
  options: ParaphraseOptions,
): Promise<string> {
  if (chapter.content.length <= options.maxCharsPerCall) {
    const result = await client.paraphrase(chapter, options);
    return result.output;
  }

  const pieces = chunkText(chapter.content, options.maxCharsPerCall);
  const outputs: string[] = [];
  for (let idx = 0; idx < pieces.length; idx += 1) {
    const pieceChapter: Chapter = {
      ...chapter,
      title: `${chapter.title} (part ${idx + 1}/${pieces.length})`,
      content: pieces[idx],
    };
    const result = await client.paraphrase(pieceChapter, options);
    outputs.push(result.output);
  }

  return outputs.join('\n\n');
}

export async function splitFile(
  inputPath: string,
  outputDir: string,
  options: SplitOptions & { format?: EbookFormat },
): Promise<SplitResult> {
  const format = options.format ?? detectFormat(inputPath);
  const splitter = createSplitter(format);
  const splitResult = await splitter.split(inputPath, options);
  await saveChapters(splitResult.chapters, outputDir);
  return splitResult;
}

export async function paraphraseDirectory(
  chaptersDir: string,
  outputDir: string,
  client: LLMClient,
  options: ParaphraseOptions,
): Promise<void> {
  const chapters = await loadChapters(chaptersDir);
  for (const chapter of chapters) {
    // Preserve hint to original chapter location in filename
    const reference = path.basename(chaptersDir);
    const chapterWithRef: Chapter = { ...chapter, reference };
    const output = await paraphraseChapter(chapterWithRef, client, options);
    await saveParaphrased(chapter.index, output, outputDir);
  }
}

