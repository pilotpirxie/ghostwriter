import { Splitter } from "./Splitter.js";
import { Chapter, SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../splitterFallback.js";
import { convertToText } from "../utils/pandoc.js";
import { EPub } from "epub2";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function tryEpub2Extraction(
  filePath: string,
): Promise<{ chapters: Chapter[] | null; error?: string }> {
  try {
    const epub = new EPub(filePath);

    await new Promise<void>((resolve, reject) => {
      epub.on("error", reject);
      epub.on("end", resolve);
      epub.parse();
    });

    const flow: any[] = Array.isArray((epub as any).flow)
      ? (epub as any).flow
      : [];
    const chapters: Chapter[] = [];

    for (let i = 0; i < flow.length; i += 1) {
      const item = flow[i];
      const title = item?.title || item?.id || `Chapter ${i + 1}`;
      const content: string = await new Promise((resolve, reject) => {
        epub.getChapter(item.id, (err: Error, text?: string) => {
          if (err) reject(err);
          else resolve(text ?? "");
        });
      });
      chapters.push({ index: i, title, content: stripHtml(content) });
    }

    if (chapters.length === 0) {
      return { chapters: null, error: "No chapters found in EPUB" };
    }
    return { chapters };
  } catch (error) {
    return {
      chapters: null,
      error: `epub2 extraction failed: ${(error as Error).message}`,
    };
  }
}

export class EpubSplitter implements Splitter {
  readonly format = "epub" as const;

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".epub");
  }

  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const warnings: string[] = [];
    const extractionResult = await tryEpub2Extraction(filePath);

    if (extractionResult.chapters && extractionResult.chapters.length > 0) {
      return { chapters: extractionResult.chapters, warnings };
    }

    if (extractionResult.error) {
      warnings.push(extractionResult.error);
    }
    warnings.push("Falling back to pandoc for epub text extraction.");
    const text = await convertToText(filePath, options.pandocPath);
    const result = splitWithFallback(text, options);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
}
