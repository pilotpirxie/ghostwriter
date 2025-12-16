import fs from "node:fs/promises";
import path from "node:path";
import { Chapter } from "../types.js";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function chapterFileName(index: number, ext = "txt") {
  return `chapter-${String(index + 1).padStart(2, "0")}.${ext}`;
}

export async function saveChapters(chapters: Chapter[], outputDir: string) {
  const written = [];

  for (const chapter of chapters) {
    await ensureDir(outputDir);
    const fileName = chapterFileName(chapter.index);
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(
      filePath,
      `${chapter.title}\n\n${chapter.content}`,
      "utf8",
    );
    written.push(filePath);
  }
  return written;
}

export async function loadChapters(inputDir: string) {
  const files = await fs.readdir(inputDir);
  const chapterFiles = files
    .filter((f) => f.endsWith(".txt") && !f.endsWith(".out.txt"))
    .sort();

  const chapters = [];
  for (let idx = 0; idx < chapterFiles.length; idx++) {
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
) {
  await ensureDir(outputDir);
  const fileName = chapterFileName(chapterIndex, "out.txt");
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, output, "utf8");
  return filePath;
}
