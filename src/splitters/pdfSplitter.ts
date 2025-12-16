import fs from "node:fs/promises";
import pdf from "pdf-parse";
import { Splitter } from "./Splitter.js";
import { SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../utils/splitterFallback.js";
import { convertToText } from "../utils/pandoc.js";

export class PdfSplitter implements Splitter {
  readonly format = "pdf";

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".pdf");
  }

  async split(filePath: string, options: SplitOptions) {
    let text = null;

    try {
      const data = await fs.readFile(filePath);
      const parsed = await pdf(data);
      text = parsed.text;
    } catch (error) {
      console.warn(
        `pdf-parse failed (${(error as Error).message}); trying pandoc if available.`,
      );
    }

    if (!text?.trim()) {
      text = await convertToText(filePath, options.pandocPath);
      console.warn("Used pandoc to extract text from PDF.");
    }

    const result = splitWithFallback(text, options);
    return { ...result, warnings: result.warnings };
  }
}
