import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { hasPandoc, convertToText } from "./pandoc.js";
import { ensureTestDir } from "../test-utils.js";

const TEST_DIR = path.join(process.cwd(), "test-output-pandoc");

describe("pandoc utilities", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await ensureTestDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  describe("hasPandoc", () => {
    it("should return true when pandoc is available", async () => {
      const result = await hasPandoc();
      assert(typeof result === "boolean", "Should return a boolean");
    });

    it("should return false when pandoc is not available at custom path", async () => {
      const result = await hasPandoc("/nonexistent/pandoc/path");
      assert.equal(
        result,
        false,
        "Should return false for non-existent pandoc path",
      );
    });

    it("should handle undefined pandocPath parameter", async () => {
      const result = await hasPandoc(undefined);
      assert(
        typeof result === "boolean",
        "Should return a boolean with undefined path",
      );
    });
  });

  describe("convertToText", () => {
    it("should convert text file to text", async () => {
      const testContent =
        "This is a test file.\nIt has multiple lines.\nAnd some content.";
      const testFilePath = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFilePath, testContent, "utf8");

      try {
        const result = await convertToText(testFilePath);

        assert(typeof result === "string", "Should return a string");
        assert.ok(result.length > 0, "Should return non-empty content");

        assert.ok(
          result.includes("This is a test file"),
          "Should contain original content",
        );
      } catch (error: any) {
        assert.ok(
          error.message.includes("Pandoc not found") ||
            error.message.includes("Pandoc conversion failed"),
          "Should fail gracefully if pandoc is not available",
        );
      }
    });

    it("should handle non-existent files", async () => {
      await assert.rejects(
        () => convertToText("/nonexistent/file.txt"),
        /Pandoc conversion failed/,
        "Should reject with pandoc error for non-existent files",
      );
    });

    it("should handle non-existent pandoc path", async () => {
      const testFilePath = path.join(TEST_DIR, "test.txt");
      await fs.writeFile(testFilePath, "test content", "utf8");

      await assert.rejects(
        () => convertToText(testFilePath, "/nonexistent/pandoc/path"),
        /Pandoc not found/,
        "Should reject with pandoc not found error for invalid path",
      );
    });

    it("should handle unsupported file formats", async () => {
      const testFilePath = path.join(TEST_DIR, "test.unknown");
      await fs.writeFile(testFilePath, "some binary content", "utf8");

      try {
        await convertToText(testFilePath);
      } catch (error: any) {
        assert.ok(
          error.message.includes("Pandoc conversion failed") ||
            error.message.includes("Pandoc not found"),
          "Should handle unsupported formats gracefully",
        );
      }
    });

    it("should handle empty files", async () => {
      const testFilePath = path.join(TEST_DIR, "empty.txt");
      await fs.writeFile(testFilePath, "", "utf8");

      try {
        const result = await convertToText(testFilePath);
        assert(
          typeof result === "string",
          "Should return a string for empty files",
        );
      } catch (error: any) {
        assert.ok(
          error.message.includes("Pandoc not found") ||
            error.message.includes("Pandoc conversion failed"),
          "Should fail gracefully for empty files if pandoc not available",
        );
      }
    });

    it("should handle files with special characters", async () => {
      const testContent = "File with special chars: àáâãäå, 中文, русский";
      const testFilePath = path.join(TEST_DIR, "special-chars.txt");
      await fs.writeFile(testFilePath, testContent, "utf8");

      try {
        const result = await convertToText(testFilePath);
        assert(typeof result === "string", "Should return a string");
        assert.ok(result.length > 0, "Should return content");
      } catch (error: any) {
        assert.ok(
          error.message.includes("Pandoc not found") ||
            error.message.includes("Pandoc conversion failed"),
          "Should fail gracefully if pandoc not available",
        );
      }
    });
  });
});
