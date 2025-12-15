import fs from "node:fs/promises";
import path from "node:path";
import { Chapter } from "../types.js";

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function chapterFileName(index: number, ext = "txt"): string {
  const padded = String(index + 1).padStart(2, "0");
  return `chapter-${padded}.${ext}`;
}

export async function saveChapters(
  chapters: Chapter[],
  outputDir: string,
): Promise<string[]> {
  await ensureDir(outputDir);
  const written: string[] = [];

  for (const chapter of chapters) {
    const fileName = chapterFileName(chapter.index);
    const filePath = path.join(outputDir, fileName);
    const body = `${chapter.title}\n\n${chapter.content}`;
    await fs.writeFile(filePath, body, "utf8");
    written.push(filePath);
  }
  return written;
}

export async function loadChapters(inputDir: string): Promise<Chapter[]> {
  const files = await fs.readdir(inputDir);
  const chapterFiles = files
    .filter((f) => f.endsWith(".txt") && !f.endsWith(".out.txt"))
    .sort();

  const chapters: Chapter[] = [];
  for (let idx = 0; idx < chapterFiles.length; idx += 1) {
    const fileName = chapterFiles[idx];
    const content = await fs.readFile(path.join(inputDir, fileName), "utf8");
    const [titleLine, ...rest] = content.split("\n");
    chapters.push({
      index: idx,
      title: titleLine?.trim() || `Chapter ${idx + 1}`,
      content: rest.join("\n").trim(),
    });
  }

  return chapters;
}

export async function saveParaphrased(
  chapterIndex: number,
  output: string,
  outputDir: string,
): Promise<string> {
  await ensureDir(outputDir);
  const fileName = chapterFileName(chapterIndex, "out.txt");
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, output, "utf8");
  return filePath;
}
