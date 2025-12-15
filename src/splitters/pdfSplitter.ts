import fs from "node:fs/promises";
import pdf from "pdf-parse";
import { Splitter } from "./Splitter.js";
import { SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../splitterFallback.js";
import { convertToText } from "../utils/pandoc.js";

export class PdfSplitter implements Splitter {
  readonly format = "pdf" as const;

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".pdf");
  }

  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const warnings: string[] = [];
    let text: string | null = null;

    try {
      const data = await fs.readFile(filePath);
      const parsed = await pdf(data);
      text = parsed.text;
    } catch (error) {
      warnings.push(
        `pdf-parse failed (${(error as Error).message}); trying pandoc if available.`,
      );
    }

    if (!text) {
      text = await convertToText(filePath, options.pandocPath);
      warnings.push("Used pandoc to extract text from PDF.");
    }

    const result = splitWithFallback(text, options);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
}
