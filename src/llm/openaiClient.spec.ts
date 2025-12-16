import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { OpenAIClient } from "./openaiClient.js";
import type { Chapter, ParaphraseOptions } from "../types.js";

class MockOpenAIClient {
  chat = {
    completions: {
      create: async (params: any) => {
        (this.chat.completions as any).lastCall = params;

        return {
          choices: [
            {
              message: {
                content:
                  "Mock paraphrased content from OpenAI with additional text",
              },
            },
          ],
        };
      },
    },
  };
}

describe("OpenAIClient", () => {
  describe("constructor", () => {
    it("should create client with valid API key", () => {
      const apiKey = "test-api-key";
      const client = new OpenAIClient(apiKey);
      assert.equal(client.name, "openai");
    });

    it("should throw error with empty API key", () => {
      assert.throws(
        () => new OpenAIClient(""),
        /API key is required for OpenAI/,
        "Should throw error for empty API key",
      );
    });

    it("should throw error with undefined API key", () => {
      assert.throws(
        () => new OpenAIClient(undefined as any),
        /API key is required for OpenAI/,
        "Should throw error for undefined API key",
      );
    });

    it("should accept mock client without API key", () => {
      const mockClient = new MockOpenAIClient();
      const client = new OpenAIClient("", mockClient as any);
      assert.equal(client.name, "openai");
    });

    it("should create real client when no mock provided", () => {
      try {
        const client = new OpenAIClient("test-key");
        assert.equal(client.name, "openai");
      } catch (error) {
        assert.ok((error as Error).message.includes("API key"));
      }
    });
  });

  describe("name", () => {
    it("should have openai name", () => {
      const client = new OpenAIClient("test-key");
      assert.equal(client.name, "openai");
    });
  });

  describe("paraphrase", () => {
    let mockClient: MockOpenAIClient;
    let client: OpenAIClient;

    beforeEach(() => {
      mockClient = new MockOpenAIClient();
      client = new OpenAIClient("test-key", mockClient as any);
    });

    it("should call OpenAI API with correct parameters", async () => {
      const chapter: Chapter = {
        index: 1,
        title: "Test Chapter",
        content: "This is test content to paraphrase.",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        topP: 0.9,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase this chapter:",
        maxTokens: 800,
      };

      const result = await client.paraphrase(chapter, options);

      const lastCall = (mockClient.chat.completions as any).lastCall;
      assert(lastCall, "API should have been called");

      assert.equal(lastCall.model, options.model);
      assert.equal(lastCall.max_tokens, options.maxTokens);
      assert.equal(lastCall.temperature, options.temperature);
      assert.equal(lastCall.top_p, options.topP);
      assert(Array.isArray(lastCall.messages), "Should have messages array");
      assert.equal(lastCall.messages.length, 1);
      assert.equal(lastCall.messages[0].role, "user");
      assert(
        typeof lastCall.messages[0].content === "string",
        "Should have string content",
      );
    });

    it("should handle options without optional fields", async () => {
      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-4",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await client.paraphrase(chapter, options);

      const lastCall = (mockClient.chat.completions as any).lastCall;
      assert.equal(lastCall.model, options.model);
      assert.equal(lastCall.temperature, options.temperature);
      assert.equal(
        lastCall.top_p,
        undefined,
        "Should not set top_p when not provided",
      );
      assert.equal(
        lastCall.max_tokens,
        undefined,
        "Should not set max_tokens when not provided",
      );
    });

    it("should process response content correctly", async () => {
      const chapter: Chapter = {
        index: 2,
        title: "Another Chapter",
        content: "Different content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        maxCharsPerCall: 500,
        promptHeader: "Rewrite this:",
      };

      const result = await client.paraphrase(chapter, options);

      assert.equal(
        result.output,
        "Mock paraphrased content from OpenAI with additional text",
      );
      assert(typeof result.output === "string", "Should return string output");
    });

    it("should handle empty response content", async () => {
      mockClient.chat.completions.create = async () => ({
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(result.output, "", "Should handle empty content");
    });

    it("should handle null response content", async () => {
      mockClient.chat.completions.create = async () => ({
        choices: [
          {
            message: {
              content: null as any,
            },
          },
        ],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(result.output, "", "Should handle null content");
    });

    it("should handle missing choices in response", async () => {
      mockClient.chat.completions.create = async () => ({
        choices: [],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(result.output, "", "Should handle missing choices");
    });

    it("should handle missing message in choice", async () => {
      mockClient.chat.completions.create = async () => ({
        choices: [
          {
            message: null as any,
          },
        ],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(result.output, "", "Should handle missing message");
    });

    it("should return ParaphraseResult interface", async () => {
      const chapter: Chapter = {
        index: 0,
        title: "Test Chapter",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);

      assert(typeof result === "object", "Should return object");
      assert("output" in result, "Should have output property");
      assert(typeof result.output === "string", "Output should be string");
    });
  });
});
