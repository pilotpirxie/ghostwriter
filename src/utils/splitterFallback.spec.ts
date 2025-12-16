import { describe, it } from "node:test";
import assert from "node:assert";
import { splitWithFallback } from "./splitterFallback.js";

describe("splitWithFallback", () => {
  it("should split text by chapter headings", () => {
    const text = `Chapter 1
This is the first chapter content.

Chapter 2
This is the second chapter content.`;

    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 2);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.chapters[0].title, "Chapter 1");
    assert.equal(
      result.chapters[0].content,
      "This is the first chapter content.",
    );
    assert.equal(result.chapters[1].title, "Chapter 2");
    assert.equal(
      result.chapters[1].content,
      "This is the second chapter content.",
    );
  });

  it("should handle various heading formats", () => {
    const text = `CHAP. 1
Content 1.

SECTION 2
Content 2.

Ch. 3
Content 3.`;

    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 3);
    assert.equal(result.chapters[0].title, "CHAP. 1");
    assert.equal(result.chapters[1].title, "SECTION 2");
    assert.equal(result.chapters[2].title, "Ch. 3");
  });

  it("should handle roman numerals in headings", () => {
    const text = `Chapter I
First chapter.

Chapter II
Second chapter.`;

    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 2);
    assert.equal(result.chapters[0].title, "Chapter I");
    assert.equal(result.chapters[1].title, "Chapter II");
  });

  it("should fallback to size-based chunking when no headings", () => {
    const text = "This is a long text without any chapter headings. ".repeat(
      100,
    );
    const result = splitWithFallback(text, { maxCharsPerChapter: 100 });
    assert(result.chapters.length > 1);
    assert.equal(result.warnings.length, 0);
    assert(result.chapters[0].title.startsWith("Part "));
  });

  it("should normalize text by removing carriage returns and trimming", () => {
    const text = "  Chapter 1\r\nContent  \r\n\r\nChapter 2\r\nMore content  ";
    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 2);
    assert.equal(result.chapters[0].content, "Content");
    assert.equal(result.chapters[1].content, "More content");
  });

  it("should use default maxChars when no headings and no option provided", () => {
    const text = "a".repeat(15000);
    const result = splitWithFallback(text);
    assert(result.chapters.length > 1);
    assert(result.chapters.every((chapter) => chapter.content.length <= 10000));
  });

  it("should respect custom maxChars option", () => {
    const text = "a".repeat(1500);
    const result = splitWithFallback(text, { maxCharsPerChapter: 500 });
    assert.equal(result.chapters.length, 2);
    assert(result.chapters.every((chapter) => chapter.content.length <= 1000));
  });

  it("should handle empty text", () => {
    const result = splitWithFallback("");
    assert.equal(result.chapters.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it("should handle text with only whitespace", () => {
    const result = splitWithFallback("   \n\t  \n  ");
    assert.equal(result.chapters.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it("should filter out empty chapters", () => {
    const text = `Chapter 1
Content

Chapter 2


Chapter 3
More content`;

    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 2);
    assert.equal(result.chapters[0].title, "Chapter 1");
    assert.equal(result.chapters[1].title, "Chapter 3");
  });

  it("should handle single line text without headings", () => {
    const text = "Single line of text";
    const result = splitWithFallback(text);
    assert.equal(result.chapters.length, 1);
    assert.equal(result.chapters[0].title, "Part 1");
    assert.equal(result.chapters[0].content, "Single line of text");
    assert.equal(result.warnings.length, 0);
  });

  it("should enforce minimum chunk size of 1000 characters", () => {
    const text = "a".repeat(2000);
    const result = splitWithFallback(text, { maxCharsPerChapter: 500 });
    assert.equal(result.chapters.length, 2);
    assert(result.chapters.every((chapter) => chapter.content.length <= 1000));
  });
});
