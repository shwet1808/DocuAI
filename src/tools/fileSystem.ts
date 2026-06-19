/**
 * @file fileSystem.ts
 * @description File system utilities for atomic writing.
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";

import type { Result } from "../types.js";

/**
 * Atomically writes content to a target file path.
 * It writes to a temporary file first, and then renames it.
 * 
 * @param content The content string to write.
 * @param relativePath The target file path relative to the workspace root.
 * @returns A promise resolving to a Result containing void.
 */
export async function writeAtomically(content: string, relativePath: string = "output/report.txt"): Promise<Result<void>> {
  const rootDir = process.cwd();
  const targetPath = join(rootDir, relativePath);
  const dir = dirname(targetPath);
  const tempPath = `${targetPath}.tmp`;

  // eslint-disable-next-line functional/no-try-statements
  try {
    // Ensure the output directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write to a temporary file
    await fs.writeFile(tempPath, content, "utf-8");

    // Atomically rename the temp file to the target path
    await fs.rename(tempPath, targetPath);

    return { success: true, value: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
