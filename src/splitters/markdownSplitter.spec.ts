import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { MarkdownSplitter } from "./markdownSplitter.js";
import { ensureTestDir } from "../test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output-markdown");

describe("MarkdownSplitter", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("canHandle", () => {
    const splitter = new MarkdownSplitter();

    it("should return true for .md files", () => {
      assert.equal(splitter.canHandle("document.md"), true);
      assert.equal(splitter.canHandle("Document.MD"), true);
      assert.equal(splitter.canHandle("/path/to/document.md"), true);
    });

    it("should return true for .markdown files", () => {
      assert.equal(splitter.canHandle("document.markdown"), true);
      assert.equal(splitter.canHandle("Document.MARKDOWN"), true);
      assert.equal(splitter.canHandle("/path/to/document.markdown"), true);
    });

    it("should return false for non-markdown files", () => {
      assert.equal(splitter.canHandle("document.txt"), false);
      assert.equal(splitter.canHandle("document.pdf"), false);
      assert.equal(splitter.canHandle("document"), false);
      assert.equal(splitter.canHandle("document.md.txt"), false);
    });
  });

  describe("format", () => {
    it("should have md format", () => {
      const splitter = new MarkdownSplitter();
      assert.equal(splitter.format, "md");
    });
  });

  describe("split", () => {
    it("should split markdown by headings (default level 2)", async () => {
      const markdown = `## Chapter 1

Content of chapter 1.

## Chapter 2

Content of chapter 2.

### Subsection 2.1

This should stay in chapter 2.
`;

      const filePath = path.join(TEST_DIR, "test.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();
      const result = await splitter.split(filePath, {});

      assert.equal(result.chapters.length, 2, "Should split into 2 chapters");
      assert.equal(result.chapters[0].title, "Chapter 1");
      assert.equal(result.chapters[1].title, "Chapter 2");
      assert.ok(result.chapters[0].content.includes("Content of chapter 1"));
      assert.ok(result.chapters[1].content.includes("Content of chapter 2"));
      assert.ok(
        result.chapters[1].content.includes("This should stay in chapter 2"),
      );
      assert.equal(
        result.warnings.length,
        0,
        "Should have no warnings for successful heading split",
      );
    });

    it("should handle custom heading levels", async () => {
      const markdown = `# Level 1A

Level 1A content.

# Level 1B

Level 1B content.

## Level 2

Level 2 content.

### Level 3

Level 3 content.
`;

      const filePath = path.join(TEST_DIR, "test-levels.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();

      const result1 = await splitter.split(filePath, { mdHeadingLevel: 1 });
      assert.equal(
        result1.chapters.length,
        2,
        "Should split on level 1 headings",
      );
      assert.equal(result1.chapters[0].title, "Level 1A");
      assert.equal(result1.chapters[1].title, "Level 1B");

      const result3 = await splitter.split(filePath, { mdHeadingLevel: 3 });
      assert.equal(
        result3.chapters.length,
        4,
        "Should split on levels 1, 2, and 3",
      );
      assert.equal(result3.chapters[0].title, "Level 1A");
      assert.equal(result3.chapters[1].title, "Level 1B");
      assert.equal(result3.chapters[2].title, "Level 2");
      assert.equal(result3.chapters[3].title, "Level 3");
    });

    it("should handle edge cases with heading levels", async () => {
      const markdown = `# Level 1A

Content A.

# Level 1B

Content B.

## Level 2

More content.
`;

      const filePath = path.join(TEST_DIR, "test-edge.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();

      const resultInvalid = await splitter.split(filePath, {
        mdHeadingLevel: 7,
      });
      assert.equal(
        resultInvalid.chapters.length,
        3,
        "Should default to level 2 and split successfully",
      );
      assert.equal(
        resultInvalid.warnings.length,
        0,
        "Should have no warnings for successful split",
      );

      const result1 = await splitter.split(filePath, { mdHeadingLevel: 1 });
      assert.equal(result1.chapters.length, 2, "Should split on level 1");
      assert.equal(result1.chapters[0].title, "Level 1A");
      assert.equal(result1.chapters[1].title, "Level 1B");
      assert.equal(
        result1.warnings.length,
        0,
        "Should have no warnings for successful split",
      );
    });

    it("should use fallback when no headings detected", async () => {
      const markdown = `This is just plain text without any headings.

It has multiple paragraphs but no markdown headers.
`;

      const filePath = path.join(TEST_DIR, "no-headings.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();
      const result = await splitter.split(filePath, {});

      assert.ok(
        result.chapters.length >= 1,
        "Should have at least one chapter from fallback",
      );
      assert.equal(
        result.warnings.length,
        1,
        "Should have warnings from fallback splitter only",
      );
    });

    it("should use fallback when only one chapter found", async () => {
      const markdown = `## Single Heading

This is content under a single heading.
No other headings exist.
`;

      const filePath = path.join(TEST_DIR, "single-heading.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();
      const result = await splitter.split(filePath, {});

      assert.ok(
        result.chapters.length >= 1,
        "Should have chapters from fallback",
      );
      assert.equal(
        result.warnings.length,
        1,
        "Should have warnings from fallback splitter only",
      );
    });

    it("should handle empty content", async () => {
      const filePath = path.join(TEST_DIR, "empty.md");
      await fs.writeFile(filePath, "", "utf8");

      const splitter = new MarkdownSplitter();
      const result = await splitter.split(filePath, {});

      assert.equal(
        result.chapters.length,
        0,
        "Should have no chapters for empty content",
      );
      assert.equal(
        result.warnings.length,
        1,
        "Should have warnings from fallback splitter only",
      );
    });

    it("should handle headings with minimal content", async () => {
      const markdown = `# Heading 1A

Some content here.

# Heading 1B

More content here.
`;

      const filePath = path.join(TEST_DIR, "minimal-content.md");
      await fs.writeFile(filePath, markdown, "utf8");

      const splitter = new MarkdownSplitter();
      const result = await splitter.split(filePath, { mdHeadingLevel: 1 });

      assert.equal(result.chapters.length, 2, "Should have two chapters");
      assert.equal(result.chapters[0].title, "Heading 1A");
      assert.equal(result.chapters[1].title, "Heading 1B");
      assert.ok(
        result.chapters[0].content.includes("Some content here"),
        "First chapter should have content",
      );
      assert.ok(
        result.chapters[1].content.includes("More content here"),
        "Second chapter should have content",
      );
    });

    it("should successfully split real markdown file", async () => {
      const splitter = new MarkdownSplitter();
      const result = await splitter.split("samples/sampledoc.md", {});

      assert.ok(
        result.chapters.length > 0,
        "Should extract chapters from sample file",
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

      if (result.chapters.length > 1) {
        assert.equal(
          result.warnings.length,
          0,
          "Should have no warnings for successful heading split",
        );
      }
    });
  });
});
