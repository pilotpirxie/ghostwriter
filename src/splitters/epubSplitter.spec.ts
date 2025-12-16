import { describe, it } from "node:test";
import assert from "node:assert";
import { EpubSplitter, stripHtml } from "./epubSplitter.js";

describe("stripHtml", () => {
  it("should strip HTML tags and normalize whitespace", () => {
    const html = "<p>Hello <b>world</b>!</p><br>  <i>test</i>";
    const result = stripHtml(html);
    assert.equal(result, "Hello world ! test");
  });

  it("should handle empty strings", () => {
    assert.equal(stripHtml(""), "");
  });

  it("should handle strings with only tags", () => {
    assert.equal(stripHtml("<div><span></span></div>"), "");
  });

  it("should normalize multiple whitespace", () => {
    assert.equal(stripHtml("a   b\n\tc"), "a b c");
  });

  it("should trim leading and trailing whitespace", () => {
    assert.equal(stripHtml("  hello world  "), "hello world");
  });

  it("should handle complex HTML structures", () => {
    const html =
      '<div class="content"><h1>Title</h1><p>Some <em>emphasized</em> text.</p><ul><li>Item 1</li><li>Item 2</li></ul></div>';
    const result = stripHtml(html);
    assert.equal(result, "Title Some emphasized text. Item 1 Item 2");
  });
});

describe("EpubSplitter", () => {
  describe("canHandle", () => {
    const splitter = new EpubSplitter();

    it("should return true for .epub files", () => {
      assert.equal(splitter.canHandle("book.epub"), true);
      assert.equal(splitter.canHandle("Book.EPUB"), true);
      assert.equal(splitter.canHandle("/path/to/book.epub"), true);
    });

    it("should return false for non-epub files", () => {
      assert.equal(splitter.canHandle("book.pdf"), false);
      assert.equal(splitter.canHandle("book.txt"), false);
      assert.equal(splitter.canHandle("book"), false);
      assert.equal(splitter.canHandle("book.epub.txt"), false);
    });
  });

  describe("format", () => {
    it("should have epub format", () => {
      const splitter = new EpubSplitter();
      assert.equal(splitter.format, "epub");
    });
  });

  describe("split", () => {
    it("should successfully split real EPUB file", async () => {
      const splitter = new EpubSplitter();
      const epubPath = "samples/sampledoc.epub";

      const result = await splitter.split(epubPath, {});

      assert(
        result.chapters.length > 0,
        "Should extract at least one chapter with content",
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
          `Chapter ${index} should have non-empty content after HTML stripping`,
        );
      });

      assert.equal(
        result.warnings.length,
        0,
        "Should have no warnings for successful extraction",
      );

      result.chapters.forEach((chapter, index) => {
        assert(
          !chapter.content.includes("<"),
          `Chapter ${index} content should not contain HTML tags`,
        );
        assert(
          !chapter.content.includes(">"),
          `Chapter ${index} content should not contain HTML tags`,
        );
      });

      result.chapters.forEach((chapter, index) => {
        const trimmedContent = chapter.content.trim();
        assert(
          trimmedContent.length > 0,
          `Chapter ${index} should have non-whitespace content`,
        );
        assert(
          trimmedContent.split(/\s+/).length > 1,
          `Chapter ${index} should contain multiple words`,
        );
      });
    });

    it("should handle non-existent files gracefully", async () => {
      const splitter = new EpubSplitter();

      await assert.rejects(
        () =>
          splitter.split("/nonexistent/file.epub", {
            pandocPath: "/nonexistent/pandoc",
          }),
        /Pandoc not found/,
      );
    });

    it("should pass options through to fallback splitter", async () => {
      const splitter = new EpubSplitter();

      await assert.rejects(
        () =>
          splitter.split("/nonexistent/file.epub", {
            pandocPath: "/nonexistent/pandoc",
            maxCharsPerChapter: 1000,
            mdHeadingLevel: 2,
          }),
        /Pandoc not found/,
      );
    });

    it("should handle different pandoc paths", async () => {
      const splitter = new EpubSplitter();

      await assert.rejects(
        () =>
          splitter.split("/nonexistent/file.epub", {
            pandocPath: "/custom/pandoc/path",
          }),
        /Pandoc not found/,
      );
    });
  });
});
