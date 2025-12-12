import fs from 'node:fs/promises';
import { Splitter } from './Splitter.js';
import { SplitOptions, SplitResult } from '../types.js';
import { splitWithFallback } from '../splitterFallback.js';

export class TxtSplitter implements Splitter {
  readonly format = 'txt' as const;

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.txt');
  }

  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const raw = await fs.readFile(filePath, 'utf8');
    const result = splitWithFallback(raw, options);
    return { ...result, warnings: [...result.warnings] };
  }
}

