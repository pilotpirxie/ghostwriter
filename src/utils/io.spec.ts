import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { saveChapters, loadChapters, saveParaphrased } from "./io.js";
import { ensureTestDir } from "../test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output");

describe("I/O operations", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("saveChapters", () => {
    it("should save multiple chapters to files", async () => {
      await ensureTestDir(TEST_DIR);
      const chapters = [
        { index: 0, title: "Chapter One", content: "Content of chapter one." },
        { index: 1, title: "Chapter Two", content: "Content of chapter two." },
      ];
      const written = await saveChapters(chapters, TEST_DIR);
      assert.strictEqual(written.length, 2, "Should write 2 files");
      const content0 = await fs.readFile(written[0], "utf8");
      assert.ok(
        content0.includes("Chapter One"),
        "First file should have title",
      );
      assert.ok(
        content0.includes("Content of chapter one."),
        "First file should have content",
      );
      const content1 = await fs.readFile(written[1], "utf8");
      assert.ok(
        content1.includes("Chapter Two"),
        "Second file should have title",
      );
    });

    it("should pad chapter numbers correctly", async () => {
      await ensureTestDir(TEST_DIR);
      const chapters = [
        { index: 0, title: "First", content: "A" },
        { index: 9, title: "Tenth", content: "B" },
      ];
      await ensureTestDir(TEST_DIR);
      const written = await saveChapters(chapters, TEST_DIR);
      assert.ok(
        written[0].includes("chapter-01.txt"),
        "Should pad single digits",
      );
      assert.ok(
        written[1].includes("chapter-10.txt"),
        "Should handle double digits",
      );
    });
  });

  describe("loadChapters", () => {
    it("should load saved chapters correctly", async () => {
      await ensureTestDir(TEST_DIR);
      const chapters = [
        { index: 0, title: "Test Chapter", content: "Test content here" },
        { index: 1, title: "Another Chapter", content: "More content" },
      ];
      await ensureTestDir(TEST_DIR);
      await saveChapters(chapters, TEST_DIR);
      await ensureTestDir(TEST_DIR);
      const loaded = await loadChapters(TEST_DIR);
      assert.strictEqual(loaded.length, 2, "Should load 2 chapters");
      assert.strictEqual(
        loaded[0].title,
        "Test Chapter",
        "Should load correct title",
      );
      assert.ok(
        loaded[0].content.includes("Test content here"),
        "Should load correct content",
      );
      assert.strictEqual(
        loaded[1].title,
        "Another Chapter",
        "Should load second chapter title",
      );
    });

    it("should ignore .out.txt files", async () => {
      await ensureTestDir(TEST_DIR);
      const chapters = [{ index: 0, title: "Chapter 1", content: "Content 1" }];
      await ensureTestDir(TEST_DIR);
      await saveChapters(chapters, TEST_DIR);
      await ensureTestDir(TEST_DIR);
      await saveParaphrased(0, "Paraphrased content", TEST_DIR);
      await ensureTestDir(TEST_DIR);
      const loaded = await loadChapters(TEST_DIR);
      assert.strictEqual(
        loaded.length,
        1,
        "Should only load chapter files, not .out.txt files",
      );
    });
  });

  describe("saveParaphrased", () => {
    it("should save paraphrased output with .out.txt extension", async () => {
      await ensureTestDir(TEST_DIR);
      const output = "This is the paraphrased output.";
      await ensureTestDir(TEST_DIR);
      const filePath = await saveParaphrased(0, output, TEST_DIR);
      await ensureTestDir(TEST_DIR);
      assert.ok(filePath.endsWith(".out.txt"), "Should use .out.txt extension");
      const content = await fs.readFile(filePath, "utf8");
      assert.strictEqual(content, output, "Should save correct content");
    });
  });
});
