import { Splitter } from "./Splitter.js";
import { Chapter, SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../utils/splitterFallback.js";
import { convertToText } from "../utils/pandoc.js";
import { EPub } from "epub2";

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function tryEpub2Extraction(filePath: string) {
  try {
    const epub = await EPub.createAsync(filePath);

    const flow = Array.isArray(epub.flow) ? epub.flow : [];

    if (flow.length === 0) {
      return { chapters: null, error: "No chapters found in EPUB" };
    }

    const chapters = [];

    for (let i = 0; i < flow.length; i++) {
      const item = flow[i];
      if (!item?.id) continue;

      const title = item?.title || item?.id || `Chapter ${i + 1}`;

      try {
        const content = await new Promise<string>((resolve, reject) => {
          epub.getChapter(item.id, (err: Error, text?: string) => {
            if (err) reject(err);
            else resolve(text ?? "");
          });
        });
        chapters.push({ index: i, title, content: stripHtml(content) });
      } catch (error) {
        console.warn(
          `Failed to read chapter ${item.id}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (chapters.length === 0) {
      return { chapters: null, error: "No readable chapters found in EPUB" };
    }
    return { chapters };
  } catch (error) {
    return {
      chapters: null,
      error: `epub2 extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export class EpubSplitter implements Splitter {
  readonly format = "epub";

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".epub");
  }

  // TODO: add better epub parsing with chapter metadata extraction
  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const extractionResult = await tryEpub2Extraction(filePath);

    if (extractionResult.chapters?.length) {
      const filtered = extractionResult.chapters.filter(
        (c) => c.content.length > 0,
      );
      if (filtered.length > 0) return { chapters: filtered, warnings: [] };
    }

    if (extractionResult.error) console.warn(extractionResult.error);
    console.warn("Falling back to pandoc for epub text extraction.");
    const text = await convertToText(filePath, options.pandocPath);
    const result = splitWithFallback(text, options);
    return { ...result, warnings: result.warnings };
  }
}
