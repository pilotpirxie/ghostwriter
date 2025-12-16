import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { PdfSplitter } from "./pdfSplitter.js";
import { ensureTestDir } from "../test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output-pdf");

describe("PdfSplitter", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("canHandle", () => {
    const splitter = new PdfSplitter();

    it("should return true for .pdf files", () => {
      assert.equal(splitter.canHandle("document.pdf"), true);
      assert.equal(splitter.canHandle("Document.PDF"), true);
      assert.equal(splitter.canHandle("/path/to/document.pdf"), true);
    });

    it("should return false for non-pdf files", () => {
      assert.equal(splitter.canHandle("document.txt"), false);
      assert.equal(splitter.canHandle("document.epub"), false);
      assert.equal(splitter.canHandle("document"), false);
      assert.equal(splitter.canHandle("document.pdf.txt"), false);
    });
  });

  describe("format", () => {
    it("should have pdf format", () => {
      const splitter = new PdfSplitter();
      assert.equal(splitter.format, "pdf");
    });
  });

  describe("split", () => {
    it("should successfully split real PDF file", async () => {
      const splitter = new PdfSplitter();
      const pdfPath = "samples/sampledoc.pdf";

      const result = await splitter.split(pdfPath, {});

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
    });

    it("should handle non-existent files gracefully", async () => {
      const splitter = new PdfSplitter();

      await assert.rejects(
        () => splitter.split("/nonexistent/file.pdf", {}),
        /Pandoc conversion failed/,
        "Should reject with pandoc error for non-existent files when pdf-parse fails",
      );
    });

    it("should pass options through to fallback splitter", async () => {
      const splitter = new PdfSplitter();

      const result = await splitter.split("samples/sampledoc.pdf", {
        maxCharsPerChapter: 1000,
        mdHeadingLevel: 2,
      });

      assert.ok(
        result.chapters.length > 0,
        "Should extract chapters with custom options",
      );
    });

    it("should handle different pandoc paths", async () => {
      const splitter = new PdfSplitter();

      const result = await splitter.split("samples/sampledoc.pdf", {
        pandocPath: "/custom/pandoc/path",
      });

      assert.ok(
        result.chapters.length > 0,
        "Should extract chapters even with custom pandoc path",
      );
    });

    it("should extract text from PDF and split by content", async () => {
      const splitter = new PdfSplitter();
      const result = await splitter.split("samples/sampledoc.pdf", {});

      const totalContent = result.chapters.reduce(
        (sum, chapter) => sum + chapter.content.length,
        0,
      );
      assert.ok(
        totalContent > 100,
        "Should extract substantial text content from PDF",
      );

      result.chapters.forEach((chapter, index) => {
        const trimmedContent = chapter.content.trim();
        assert.ok(
          trimmedContent.length > 0,
          `Chapter ${index} should have non-empty content`,
        );
        assert.ok(
          /\w{3,}/.test(trimmedContent),
          `Chapter ${index} should contain readable words`,
        );
      });
    });
  });
});
