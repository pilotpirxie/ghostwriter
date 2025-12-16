import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { ClaudeClient } from "./claudeClient.js";
import type { Chapter, ParaphraseOptions } from "../types.js";

class MockAnthropicClient {
  messages = {
    create: async (params: any) => {
      (this.messages as any).lastCall = params;

      return {
        content: [
          { type: "text", text: "Mock paraphrased content" },
          { type: "text", text: " with additional text" },
        ],
      };
    },
  };
}

describe("ClaudeClient", () => {
  describe("constructor", () => {
    it("should create client with valid API key", () => {
      const apiKey = "test-api-key";
      const client = new ClaudeClient(apiKey);
      assert.equal(client.name, "claude");
    });

    it("should throw error with empty API key", () => {
      assert.throws(
        () => new ClaudeClient(""),
        /API key is required for Claude/,
        "Should throw error for empty API key",
      );
    });

    it("should throw error with undefined API key", () => {
      assert.throws(
        () => new ClaudeClient(undefined as any),
        /API key is required for Claude/,
        "Should throw error for undefined API key",
      );
    });

    it("should accept mock client without API key", () => {
      const mockClient = new MockAnthropicClient();
      const client = new ClaudeClient("", mockClient as any);
      assert.equal(client.name, "claude");
    });

    it("should create real client when no mock provided", () => {
      try {
        const client = new ClaudeClient("test-key");
        assert.equal(client.name, "claude");
      } catch (error) {
        assert.ok((error as Error).message.includes("API key"));
      }
    });
  });

  describe("name", () => {
    it("should have claude name", () => {
      const client = new ClaudeClient("test-key");
      assert.equal(client.name, "claude");
    });
  });

  describe("paraphrase", () => {
    let mockClient: MockAnthropicClient;
    let client: ClaudeClient;

    beforeEach(() => {
      mockClient = new MockAnthropicClient();
      client = new ClaudeClient("test-key", mockClient as any);
    });

    it("should call Anthropic API with correct parameters", async () => {
      const chapter: Chapter = {
        index: 1,
        title: "Test Chapter",
        content: "This is test content to paraphrase.",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase this chapter:",
        maxTokens: 800,
      };

      const result = await client.paraphrase(chapter, options);

      const lastCall = (mockClient.messages as any).lastCall;
      assert(lastCall, "API should have been called");

      assert.equal(lastCall.model, options.model);
      assert.equal(lastCall.max_tokens, options.maxTokens);
      assert.equal(lastCall.temperature, options.temperature);
      assert(Array.isArray(lastCall.messages), "Should have messages array");
      assert.equal(lastCall.messages.length, 1);
      assert.equal(lastCall.messages[0].role, "user");
      assert(
        typeof lastCall.messages[0].content === "string",
        "Should have string content",
      );
    });

    it("should use default max tokens when not specified", async () => {
      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Content",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-haiku-20240307",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await client.paraphrase(chapter, options);

      const lastCall = (mockClient.messages as any).lastCall;
      assert.equal(lastCall.max_tokens, 1200, "Should use default max tokens");
    });

    it("should process response content correctly", async () => {
      const chapter: Chapter = {
        index: 2,
        title: "Another Chapter",
        content: "Different content",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.3,
        maxCharsPerCall: 500,
        promptHeader: "Rewrite this:",
      };

      const result = await client.paraphrase(chapter, options);

      assert.equal(
        result.output,
        "Mock paraphrased content with additional text",
      );
      assert(typeof result.output === "string", "Should return string output");
    });

    it("should handle response with only text content", async () => {
      mockClient.messages.create = async () => ({
        content: [{ type: "text", text: "  Single response text  " }],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-haiku-20240307",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(
        result.output,
        "Single response text",
        "Should trim whitespace",
      );
    });

    it("should handle response with empty text content", async () => {
      mockClient.messages.create = async () => ({
        content: [{ type: "text", text: "" }],
      });

      const chapter: Chapter = {
        index: 0,
        title: "Test",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      const result = await client.paraphrase(chapter, options);
      assert.equal(result.output, "", "Should handle empty text content");
    });

    it("should return ParaphraseResult interface", async () => {
      const chapter: Chapter = {
        index: 0,
        title: "Test Chapter",
        content: "Test content",
      };

      const options: ParaphraseOptions = {
        model: "claude-3-haiku-20240307",
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
