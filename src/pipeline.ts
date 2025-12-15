import fs from "node:fs/promises";
import { createSplitter, detectFormat } from "./splitters/Splitter.js";
import {
  LLMClient,
  SplitOptions,
  ParaphraseOptions,
  SplitResult,
  Chapter,
  EbookFormat,
} from "./types.js";
import { saveChapters, loadChapters, saveParaphrased } from "./utils/io.js";

async function validateInputFile(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
    if (stats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error.code === "EACCES") {
      throw new Error(`Permission denied: ${filePath}`);
    }
    throw error;
  }
}

const MIN_CHUNK_SIZE = 2000;
const DEFAULT_OVERLAP = 300;
const MIN_CHAPTER_LENGTH_FOR_LLM = 80;

function chunkText(
  text: string,
  maxChars: number,
  overlap = DEFAULT_OVERLAP,
): string[] {
  const chunks: string[] = [];
  const safeMax = Math.max(maxChars, MIN_CHUNK_SIZE);
  const safeOverlap = Math.min(overlap, Math.floor(safeMax * 0.5));
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + safeMax, text.length);
    const slice = text.slice(start, end);
    chunks.push(slice.trim());
    start = end - safeOverlap;

    if (end === text.length) break;
    if (start >= end - safeOverlap) {
      start = end;
    }
  }
  return chunks.filter((c) => c.length > 0);
}

async function paraphraseChapter(
  chapter: Chapter,
  client: LLMClient,
  options: ParaphraseOptions,
): Promise<string> {
  const trimmed = chapter.content.trim();

  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.length < MIN_CHAPTER_LENGTH_FOR_LLM) {
    return trimmed;
  }

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

  return outputs.join("\n\n");
}

export async function splitFile(
  inputPath: string,
  outputDir: string,
  options: SplitOptions & { format?: EbookFormat },
): Promise<SplitResult> {
  await validateInputFile(inputPath);
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
  const total = chapters.length;
  console.log(
    `Starting paraphrase of ${total} chapter(s) from ${chaptersDir} into ${outputDir}...`,
  );

  for (let i = 0; i < total; i += 1) {
    const chapter = chapters[i];
    console.log(
      `Paraphrasing chapter ${i + 1}/${total}: "${chapter.title}" (index ${
        chapter.index
      })`,
    );
    const output = await paraphraseChapter(chapter, client, options);
    await saveParaphrased(chapter.index, output, outputDir);
    console.log(
      `Finished chapter ${i + 1}/${total}: wrote chapter-${String(
        chapter.index + 1,
      ).padStart(2, "0")}.out.txt`,
    );
  }
}
