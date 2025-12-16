import { describe, it } from "node:test";
import assert from "node:assert";
import { buildPrompt } from "./prompt.js";

describe("buildPrompt", () => {
  it("should include header, title, and content", () => {
    const header = "Paraphrase this chapter";
    const chapter = {
      index: 0,
      title: "Introduction",
      content: "This is the content of the chapter.",
    };
    const result = buildPrompt(header, chapter);
    assert.ok(result.includes(header), "Should include header");
    assert.ok(
      result.includes("Chapter title: Introduction"),
      "Should include chapter title",
    );
    assert.ok(result.includes("Content:"), "Should include content label");
    assert.ok(
      result.includes("This is the content of the chapter."),
      "Should include chapter content",
    );
  });

  it("should handle empty content", () => {
    const header = "Header";
    const chapter = {
      index: 0,
      title: "Empty Chapter",
      content: "",
    };
    const result = buildPrompt(header, chapter);
    assert.ok(
      result.includes("Content:"),
      "Should include content label even with empty content",
    );
    assert.ok(
      result.endsWith("Content:\n"),
      "Should end with content label when content is empty",
    );
  });

  it("should preserve special characters", () => {
    const header = "Test & Header";
    const chapter = {
      index: 0,
      title: "Chapter with \"quotes\" and 'apostrophes'",
      content: "Content with\nnewlines,\ttabs, and symbols: @#$%^&*()",
    };
    const result = buildPrompt(header, chapter);
    assert.ok(result.includes("Test & Header"), "Should preserve ampersands");
    assert.ok(
      result.includes("Chapter with \"quotes\" and 'apostrophes'"),
      "Should preserve quotes",
    );
    assert.ok(
      result.includes("Content with\nnewlines,\ttabs, and symbols: @#$%^&*()"),
      "Should preserve newlines, tabs, and symbols",
    );
  });
});
