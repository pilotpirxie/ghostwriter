import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function hasPandoc(pandocPath?: string): Promise<boolean> {
  try {
    await execFileAsync(pandocPath ?? 'pandoc', ['-v']);
    return true;
  } catch {
    return false;
  }
}

export async function convertToText(inputPath: string, pandocPath?: string): Promise<string> {
  const binary = pandocPath ?? 'pandoc';
  const { stdout } = await execFileAsync(binary, ['-t', 'plain', inputPath], {
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout.toString();
}
