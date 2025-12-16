import { Chapter, SplitOptions, SplitResult } from "../types.js";

const headingRegex = /^(chapter|chap\.?|ch\.?|section)\s+([0-9ivx]+)/i;

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function createChunksFromHeadings(lines: string[]) {
  const chapters: Chapter[] = [];
  let currentTitle = "Introduction";
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length === 0) return;
    chapters.push({
      index: chapters.length,
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
    currentLines = [];
  };

  for (const line of lines) {
    if (headingRegex.test(line.trim())) {
      flush();
      currentTitle = line.trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return chapters.filter((c) => c.content.length > 0);
}

function chunkBySize(text: string, maxChars: number) {
  const safeMax = Math.max(1000, maxChars);
  const chunks: Chapter[] = [];
  let start = 0;
  let index = 0;
  while (start < text.length) {
    chunks.push({
      index,
      title: `Part ${index + 1}`,
      content: text.slice(start, start + safeMax).trim(),
    });
    start += safeMax;
    index++;
  }
  return chunks;
}

export function splitWithFallback(text: string, options: SplitOptions = {}) {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");
  const byHeading = createChunksFromHeadings(lines);

  if (byHeading.length > 1) return { chapters: byHeading, warnings: [] };

  console.warn("Headings not detected; using size-based chunks.");
  const maxChars = options.maxCharsPerChapter ?? 10_000;
  const bySize = chunkBySize(normalized, maxChars);
  return { chapters: bySize, warnings: [] };
}
