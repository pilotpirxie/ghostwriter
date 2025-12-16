import OpenAI from "openai";
import {
  LLMClient,
  ParaphraseOptions,
  ParaphraseResult,
  Chapter,
} from "../types.js";
import { buildPrompt } from "../utils/prompt.js";

export class OpenAIClient implements LLMClient {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string, client?: OpenAI) {
    if (!apiKey && !client)
      throw new Error(
        "API key is required for OpenAI. Provide via --api-key or OPENAI_API_KEY.",
      );
    this.client = client || new OpenAI({ apiKey });
  }

  async paraphrase(
    chapter: Chapter,
    options: ParaphraseOptions,
  ): Promise<ParaphraseResult> {
    const prompt = buildPrompt(options.promptHeader, chapter);
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature,
      top_p: options.topP,
      max_tokens: options.maxTokens,
    });

    const output = response.choices?.[0]?.message?.content ?? "";
    return { output: output.trim() };
  }
}
