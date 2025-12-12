import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../utils/prompt.js';
import { Chapter, LLMClient, ParaphraseOptions, ParaphraseResult } from '../types.js';

export class ClaudeClient implements LLMClient {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required. Provide via --anthropic-key or ANTHROPIC_API_KEY.');
    }
    this.client = new Anthropic({ apiKey });
  }

  async paraphrase(chapter: Chapter, options: ParaphraseOptions): Promise<ParaphraseResult> {
    const prompt = buildPrompt(options.promptHeader, chapter);
    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: 1200,
      temperature: options.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .map((part) => ('text' in part ? part.text : ''))
      .join('')
      .trim();

    return { output: text };
  }
}
