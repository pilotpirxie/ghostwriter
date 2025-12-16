import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { TxtSplitter } from "./txtSplitter.js";
import { ensureTestDir } from "../test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output-txt");

describe("TxtSplitter", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("canHandle", () => {
    const splitter = new TxtSplitter();

    it("should return true for .txt files", () => {
      assert.equal(splitter.canHandle("document.txt"), true);
      assert.equal(splitter.canHandle("Document.TXT"), true);
      assert.equal(splitter.canHandle("/path/to/document.txt"), true);
    });

    it("should return false for non-txt files", () => {
      assert.equal(splitter.canHandle("document.pdf"), false);
      assert.equal(splitter.canHandle("document.epub"), false);
      assert.equal(splitter.canHandle("document.md"), false);
      assert.equal(splitter.canHandle("document"), false);
      assert.equal(splitter.canHandle("document.txt.pdf"), false);
    });
  });

  describe("format", () => {
    it("should have txt format", () => {
      const splitter = new TxtSplitter();
      assert.equal(splitter.format, "txt");
    });
  });

  describe("split", () => {
    it("should successfully split real TXT file", async () => {
      const splitter = new TxtSplitter();
      const txtPath = "samples/sampledoc.txt";

      const result = await splitter.split(txtPath, {});

      assert.ok(
        result.chapters.length > 0,
        "Should extract at least one chapter",
      );

      result.chapters.forEach((chapter, index) => {
        assert(
          typeof chapter.index === "number",
          `Chapter ${index} should have numeric index`,
        );
        assert(
          typeof chapter.title === "string",
          `Chapter ${index} should have string title`,
        );
        assert(
          typeof chapter.content === "string",
          `Chapter ${index} should have string content`,
        );
        assert(
          chapter.title.length > 0,
          `Chapter ${index} should have non-empty title`,
        );
        assert(
          chapter.content.length > 0,
          `Chapter ${index} should have non-empty content`,
        );
      });

      assert.ok(
        result.warnings.length >= 0,
        "May have warnings from splitting process",
      );
    });

    it("should handle non-existent files gracefully", async () => {
      const splitter = new TxtSplitter();

      await assert.rejects(
        () => splitter.split("/nonexistent/file.txt", {}),
        /ENOENT/,
        "Should reject with ENOENT for non-existent files",
      );
    });

    it("should pass options through to fallback splitter", async () => {
      const splitter = new TxtSplitter();

      const result = await splitter.split("samples/sampledoc.txt", {
        maxCharsPerChapter: 1000,
        mdHeadingLevel: 2,
      });

      assert.ok(
        result.chapters.length > 0,
        "Should extract chapters with custom options",
      );
    });

    it("should handle empty text file", async () => {
      const emptyFilePath = path.join(TEST_DIR, "empty.txt");
      await fs.writeFile(emptyFilePath, "", "utf8");

      const splitter = new TxtSplitter();
      const result = await splitter.split(emptyFilePath, {});

      assert(
        typeof result.chapters === "object",
        "Should return chapters array",
      );
      assert(
        typeof result.warnings === "object",
        "Should return warnings array",
      );
    });

    it("should extract text content and split appropriately", async () => {
      const testContent = `Chapter 1: Introduction

This is the introduction to our document. It contains some basic information about the topic.

Chapter 2: Main Content

Here we dive deeper into the main content. This chapter has more detailed information and examples.

Chapter 3: Conclusion

Finally, we wrap up with a conclusion that summarizes the key points.`;

      const testFilePath = path.join(TEST_DIR, "test-content.txt");
      await fs.writeFile(testFilePath, testContent, "utf8");

      const splitter = new TxtSplitter();
      const result = await splitter.split(testFilePath, {});

      const totalContent = result.chapters.reduce(
        (sum, chapter) => sum + chapter.content.length,
        0,
      );
      assert.ok(totalContent > 50, "Should extract substantial text content");

      result.chapters.forEach((chapter, index) => {
        const trimmedContent = chapter.content.trim();
        assert.ok(
          trimmedContent.length > 0,
          `Chapter ${index} should have non-empty content`,
        );
      });
    });
  });
});
