import path from 'node:path';
import { EbookFormat, SplitOptions, SplitResult } from '../types.js';
import { PdfSplitter } from './pdfSplitter.js';
import { EpubSplitter } from './epubSplitter.js';
import { TxtSplitter } from './txtSplitter.js';

export interface Splitter {
  readonly format: EbookFormat;
  canHandle(filePath: string): boolean;
  split(filePath: string, options: SplitOptions): Promise<SplitResult>;
}

export function detectFormat(filePath: string): EbookFormat {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  if (ext === 'pdf' || ext === 'epub' || ext === 'txt') {
    return ext as EbookFormat;
  }
  throw new Error(`Unsupported format for ${filePath}. Expected pdf, epub, or txt.`);
}

export function createSplitter(format: EbookFormat): Splitter {
  switch (format) {
    case 'pdf':
      return new PdfSplitter();
    case 'epub':
      return new EpubSplitter();
    case 'txt':
      return new TxtSplitter();
    default:
      throw new Error(`No splitter for format ${format}`);
  }
}

