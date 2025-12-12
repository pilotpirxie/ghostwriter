import { Splitter } from './Splitter.js';
import { SplitOptions, SplitResult } from '../types.js';
import { splitWithFallback } from '../splitterFallback.js';
import { convertToText, hasPandoc } from '../utils/pandoc.js';

export class MobiSplitter implements Splitter {
  readonly format = 'mobi' as const;

  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.mobi');
  }

  async split(filePath: string, options: SplitOptions): Promise<SplitResult> {
    const warnings: string[] = [];
    const available = await hasPandoc(options.pandocPath);
    if (!available) {
      throw new Error('Pandoc is required to process .mobi files. Install pandoc or provide --pandoc-path.');
    }

    warnings.push('Using pandoc to extract mobi text.');
    const text = await convertToText(filePath, options.pandocPath);
    const result = splitWithFallback(text, options);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
}

