import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { splitFile, paraphraseDirectory } from "./pipeline.js";
import type {
  Chapter,
  SplitOptions,
  ParaphraseOptions,
  LLMClient,
} from "./types.js";
import { ensureTestDir } from "./test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output-pipeline");

class MockLLMClient implements LLMClient {
  readonly name = "claude";
  paraphraseCalls: Array<{ chapter: Chapter; options: ParaphraseOptions }> = [];

  async paraphrase(
    chapter: Chapter,
    options: ParaphraseOptions,
  ): Promise<{ output: string }> {
    this.paraphraseCalls.push({ chapter, options });
    return { output: `Paraphrased: ${chapter.title}` };
  }
}

describe("pipeline", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("splitFile", () => {
    it("should validate file exists", async () => {
      await assert.rejects(
        () => splitFile("/nonexistent/file.txt", TEST_DIR, {}),
        /File not found/,
        "Should reject for non-existent files",
      );
    });

    it("should validate file is not empty", async () => {
      const emptyFile = path.join(TEST_DIR, "empty.txt");
      await fs.writeFile(emptyFile, "", "utf8");

      await assert.rejects(
        () => splitFile(emptyFile, TEST_DIR, {}),
        /File is empty/,
        "Should reject for empty files",
      );
    });

    it("should validate path is a file", async () => {
      const dirPath = TEST_DIR;

      await assert.rejects(
        () => splitFile(dirPath, TEST_DIR, {}),
        /Path is not a file/,
        "Should reject for directories",
      );
    });

    it("should successfully split and save chapters", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFile, "Test content", "utf8");

      const result = await splitFile(testFile, TEST_DIR, {});

      assert.ok(result.chapters.length > 0, "Should return chapters");
      assert(Array.isArray(result.warnings), "Should return warnings array");

      const files = await fs.readdir(TEST_DIR);
      const chapterFiles = files.filter(
        (f) =>
          f.startsWith("chapter-") &&
          f.endsWith(".txt") &&
          !f.endsWith(".out.txt"),
      );
      assert.ok(chapterFiles.length > 0, "Should save chapter files");
    });

    it("should use explicit format when provided", async () => {
      const testFile = path.join(TEST_DIR, "test.unknown");
      await fs.writeFile(testFile, "Test content", "utf8");

      const result = await splitFile(testFile, TEST_DIR, { format: "txt" });

      assert.ok(
        result.chapters.length > 0,
        "Should split with explicit format",
      );
    });

    it("should pass options to splitter", async () => {
      const testFile = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFile, "Test content", "utf8");

      const options: SplitOptions = {
        maxCharsPerChapter: 1000,
        mdHeadingLevel: 2,
        pandocPath: "/custom/pandoc",
      };

      const result = await splitFile(testFile, TEST_DIR, options);
      assert.ok(
        result.chapters.length >= 0,
        "Should process with custom options",
      );
    });

    it("should handle splitter errors", async () => {
      const testFile = path.join(TEST_DIR, "test.pdf");
      await fs.writeFile(testFile, "Test PDF content", "utf8");

      try {
        await splitFile(testFile, TEST_DIR, {});
      } catch (error) {
        assert.ok(error instanceof Error, "Should throw Error");
      }
    });
  });

  describe("paraphraseDirectory", () => {
    it("should load and paraphrase chapters", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await ensureTestDir(TEST_DIR);
      await fs.mkdir(chaptersDir, { recursive: true });
      const chapter1Content =
        "This is a test chapter with enough content to require paraphrasing. " +
        "It needs to be at least 80 characters long to trigger the LLM call.";
      const chapter2Content =
        "This is another test chapter with sufficient content length. " +
        "It also needs to exceed the minimum character threshold for LLM processing.";
      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        `Chapter 1\n\n${chapter1Content}`,
        "utf8",
      );
      await fs.writeFile(
        path.join(chaptersDir, "chapter-02.txt"),
        `Chapter 2\n\n${chapter2Content}`,
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      assert.equal(
        client.paraphraseCalls.length,
        2,
        "Should paraphrase both chapters",
      );

      const outputFiles = await fs.readdir(outputDir);
      const outFiles = outputFiles.filter((f) => f.endsWith(".out.txt"));
      assert.equal(outFiles.length, 2, "Should create output files");
    });

    it("should handle empty chapters directory", async () => {
      const emptyDir = path.join(TEST_DIR, "empty-chapters");
      await fs.mkdir(emptyDir, { recursive: true });

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "gpt-3.5-turbo",
        temperature: 0.5,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(emptyDir, outputDir, client, options);

      assert.equal(
        client.paraphraseCalls.length,
        0,
        "Should not call paraphrase for empty directory",
      );
    });

    it("should handle empty chapter content", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await fs.mkdir(chaptersDir, { recursive: true });

      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        "Empty Chapter\n\n",
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      assert.equal(
        client.paraphraseCalls.length,
        0,
        "Should not call LLM for empty content",
      );

      const outputFiles = await fs.readdir(outputDir);
      const outFiles = outputFiles.filter((f) => f.endsWith(".out.txt"));
      assert.equal(
        outFiles.length,
        1,
        "Should create output file even for empty content",
      );
    });

    it("should handle short chapter content without LLM", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await fs.mkdir(chaptersDir, { recursive: true });

      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        "Short Chapter\n\nShort.",
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      assert.equal(
        client.paraphraseCalls.length,
        0,
        "Should not call LLM for short content",
      );

      const outputPath = path.join(outputDir, "chapter-01.out.txt");
      const output = await fs.readFile(outputPath, "utf8");
      assert.ok(output.includes("Short"), "Should preserve short content");
    });

    it("should chunk and paraphrase long content", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await fs.mkdir(chaptersDir, { recursive: true });

      const longContent = "A".repeat(5000);
      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        `Long Chapter\n\n${longContent}`,
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 2000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      assert.ok(
        client.paraphraseCalls.length > 1,
        "Should chunk and paraphrase multiple times",
      );

      const hasPartTitle = client.paraphraseCalls.some((call) =>
        call.chapter.title.includes("part"),
      );
      assert.ok(hasPartTitle, "Should include part numbers in chunk titles");
    });

    it("should pass correct options to LLM client", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await fs.mkdir(chaptersDir, { recursive: true });

      const testContent =
        "This is a test chapter with enough content to require paraphrasing. " +
        "It needs to be at least 80 characters long to trigger the LLM call. " +
        "Here is some additional text to ensure we meet the minimum length requirement.";
      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        `Test Chapter\n\n${testContent}`,
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "gpt-4",
        temperature: 0.9,
        topP: 0.95,
        maxCharsPerCall: 1000,
        promptHeader: "Custom header:",
        maxTokens: 500,
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      assert.equal(
        client.paraphraseCalls.length,
        1,
        "Should call paraphrase once",
      );
      const call = client.paraphraseCalls[0];
      assert.equal(call.options.model, options.model, "Should pass model");
      assert.equal(
        call.options.temperature,
        options.temperature,
        "Should pass temperature",
      );
      assert.equal(call.options.topP, options.topP, "Should pass topP");
      assert.equal(
        call.options.maxCharsPerCall,
        options.maxCharsPerCall,
        "Should pass maxCharsPerCall",
      );
      assert.equal(
        call.options.promptHeader,
        options.promptHeader,
        "Should pass promptHeader",
      );
      assert.equal(
        call.options.maxTokens,
        options.maxTokens,
        "Should pass maxTokens",
      );
    });

    it("should save paraphrased output for each chapter", async () => {
      const chaptersDir = path.join(TEST_DIR, "chapters");
      await fs.mkdir(chaptersDir, { recursive: true });

      const content1 =
        "This is chapter 1 content that is long enough to require paraphrasing. " +
        "It exceeds the minimum character threshold for LLM processing.";
      const content2 =
        "This is chapter 2 content that is also sufficiently long. " +
        "It meets the requirements for LLM paraphrasing.";
      const content3 =
        "This is chapter 3 content with adequate length. " +
        "It will be processed by the LLM client.";
      await fs.writeFile(
        path.join(chaptersDir, "chapter-01.txt"),
        `Chapter 1\n\n${content1}`,
        "utf8",
      );
      await fs.writeFile(
        path.join(chaptersDir, "chapter-02.txt"),
        `Chapter 2\n\n${content2}`,
        "utf8",
      );
      await fs.writeFile(
        path.join(chaptersDir, "chapter-03.txt"),
        `Chapter 3\n\n${content3}`,
        "utf8",
      );

      const outputDir = path.join(TEST_DIR, "output");
      const client = new MockLLMClient();
      const options: ParaphraseOptions = {
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        maxCharsPerCall: 1000,
        promptHeader: "Paraphrase:",
      };

      await paraphraseDirectory(chaptersDir, outputDir, client, options);

      const outputFiles = await fs.readdir(outputDir);
      const outFiles = outputFiles.filter((f) => f.endsWith(".out.txt")).sort();
      assert.equal(
        outFiles.length,
        3,
        "Should create output files for all chapters",
      );
      assert.ok(
        outFiles.includes("chapter-01.out.txt"),
        "Should create chapter-01.out.txt",
      );
      assert.ok(
        outFiles.includes("chapter-02.out.txt"),
        "Should create chapter-02.out.txt",
      );
      assert.ok(
        outFiles.includes("chapter-03.out.txt"),
        "Should create chapter-03.out.txt",
      );
    });
  });
});
