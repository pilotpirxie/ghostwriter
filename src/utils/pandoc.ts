import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PANDOC_TIMEOUT_MS = 60_000;

export async function hasPandoc(pandocPath?: string) {
  try {
    await execFileAsync(pandocPath ?? "pandoc", ["-v"], {
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function convertToText(inputPath: string, pandocPath?: string) {
  const binary = pandocPath ?? "pandoc";
  try {
    const { stdout } = await execFileAsync(binary, ["-t", "plain", inputPath], {
      maxBuffer: 50 * 1024 * 1024,
      timeout: PANDOC_TIMEOUT_MS,
    });
    return stdout.toString();
  } catch (error: any) {
    if (error.killed && error.signal === "SIGTERM")
      throw new Error(
        `Pandoc conversion timed out after ${PANDOC_TIMEOUT_MS / 1000} seconds. The file may be too large or in an unsupported format.`,
      );
    if (error.code === "ENOENT")
      throw new Error(
        `Pandoc not found. Install pandoc or provide --pandoc-path.`,
      );
    throw new Error(`Pandoc conversion failed: ${error.message}`);
  }
}
