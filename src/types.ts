export type EbookFormat = "pdf" | "epub" | "txt" | "md";

export interface Chapter {
  index: number;
  title: string;
  content: string;
}

export interface SplitOptions {
  pandocPath?: string;
  maxCharsPerChapter?: number;
  mdHeadingLevel?: number;
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
  maxTokens?: number;
}

export interface ParaphraseResult {
  output: string;
}

export interface LLMClient {
  readonly name: "openai" | "claude";
  paraphrase(
    chapter: Chapter,
    options: ParaphraseOptions,
  ): Promise<ParaphraseResult>;
}
