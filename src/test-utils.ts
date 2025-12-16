import fs from "node:fs/promises";

export async function ensureTestDir(testDir: string): Promise<void> {
  await fs.mkdir(testDir, { recursive: true }).catch(() => {});
}

export async function cleanupTestDir(testDir: string): Promise<void> {
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
}
