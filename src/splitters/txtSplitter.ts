import fs from "node:fs/promises";
import { Splitter } from "./Splitter.js";
import { SplitOptions, SplitResult } from "../types.js";
import { splitWithFallback } from "../utils/splitterFallback.js";

export class TxtSplitter implements Splitter {
  readonly format = "txt";

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(".txt");
  }

  async split(filePath: string, options: SplitOptions) {
    const raw = await fs.readFile(filePath, "utf8");
    return splitWithFallback(raw, options);
  }
}
