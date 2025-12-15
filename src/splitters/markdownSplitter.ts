import fs from "node:fs/promises";
import { Splitter } from "./Splitter.js";
import { Chapter, SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../splitterFallback.js";

function splitMarkdownByHeadings(
  text: string,
  headingLevel: number = 1,
): Chapter[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chapters: Chapter[] = [];
  let currentTitle = "Introduction";
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length === 0) return;
    const index = chapters.length;
    chapters.push({
      index,
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = /^(#{1,6})\s+/.exec(trimmed);
    if (match) {
      const level = match[1].length;
      if (level <= headingLevel) {
        flush();
        currentTitle =
          trimmed.replace(/^#{1,6}\s+/, "").trim() || "Untitled section";
        continue;
      }
    }
    currentLines.push(line);
  }

  flush();
  return chapters.filter((c) => c.content.length > 0);
}

export class MarkdownSplitter implements Splitter {
  readonly format = "md" as const;

  canHandle(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return lower.endsWith(".md") || lower.endsWith(".markdown");
  }

  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const raw = await fs.readFile(filePath, "utf8");
    const headingLevel =
      options.mdHeadingLevel &&
      options.mdHeadingLevel >= 1 &&
      options.mdHeadingLevel <= 6
        ? options.mdHeadingLevel
        : 1;

    const markdownChapters = splitMarkdownByHeadings(raw, headingLevel);

    if (markdownChapters.length > 1) {
      return { chapters: markdownChapters, warnings: [] };
    }

    const fallback = splitWithFallback(raw, options);
    return {
      chapters: fallback.chapters,
      warnings: [
        "Markdown headings not detected; using generic fallback splitter.",
        ...fallback.warnings,
      ],
    };
  }
}
