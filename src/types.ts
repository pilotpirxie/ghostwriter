export type EbookFormat = 'pdf' | 'epub' | 'txt';

export interface Chapter {
  index: number;
  title: string;
  content: string;
  reference?: string;
}

export interface SplitOptions {
  pandocPath?: string;
  maxCharsPerChapter?: number;
}

export interface SplitResult {
  chapters: Chapter[];
  warnings: string[];
}

export interface ParaphraseOptions {
  model: string;
  temperature: number;
  topP?: number;
  maxCharsPerCall: number;
  promptHeader: string;
}

export interface ParaphraseResult {
  output: string;
  tokensUsed?: number;
}

export interface LLMClient {
  readonly name: 'openai' | 'claude';
  paraphrase(chapter: Chapter, options: ParaphraseOptions): Promise<ParaphraseResult>;
}

