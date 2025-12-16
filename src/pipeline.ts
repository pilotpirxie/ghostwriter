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

async function validateInputFile(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
    if (stats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }
  } catch (error: any) {
    if (error.code === "ENOENT") throw new Error(`File not found: ${filePath}`);
    if (error.code === "EACCES")
      throw new Error(`Permission denied: ${filePath}`);
    throw error;
  }
}

const MIN_CHUNK_SIZE = 2000;
const DEFAULT_OVERLAP = 300;
const MIN_CHAPTER_LENGTH_FOR_LLM = 80;

function chunkText(text: string, maxChars: number, overlap = DEFAULT_OVERLAP) {
  const chunks = [];
  const safeMax = Math.max(maxChars, MIN_CHUNK_SIZE);
  const safeOverlap = Math.min(overlap, Math.floor(safeMax * 0.5));
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + safeMax, text.length);
    chunks.push(text.slice(start, end).trim());
    start = end - safeOverlap;
    if (end === text.length || start >= end - safeOverlap) start = end;
  }
  return chunks.filter((c) => c.length > 0);
}

async function paraphraseChapter(
  chapter: Chapter,
  client: LLMClient,
  options: ParaphraseOptions,
) {
  const trimmed = chapter.content.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.length < MIN_CHAPTER_LENGTH_FOR_LLM) return trimmed;

  if (chapter.content.length <= options.maxCharsPerCall) {
    const result = await client.paraphrase(chapter, options);
    return result.output;
  }

  const pieces = chunkText(chapter.content, options.maxCharsPerCall);
  const outputs = [];
  for (let idx = 0; idx < pieces.length; idx++) {
    const pieceChapter = {
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
) {
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
) {
  const chapters = await loadChapters(chaptersDir);
  const total = chapters.length;
  console.info(
    `Starting paraphrase of ${total} chapter(s) from ${chaptersDir} into ${outputDir}...`,
  );

  for (let i = 0; i < total; i++) {
    const chapter = chapters[i];
    console.info(
      `Paraphrasing chapter ${i + 1}/${total}: "${chapter.title}" (index ${chapter.index})`,
    );
    const output = await paraphraseChapter(chapter, client, options);
    await saveParaphrased(chapter.index, output, outputDir);
    console.info(
      `Finished chapter ${i + 1}/${total}: wrote chapter-${String(chapter.index + 1).padStart(2, "0")}.out.txt`,
    );
  }
}
