/**
 * @file fileSystem.test.ts
 * @description Unit tests for the file system tools.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { writeAtomically } from "./fileSystem.js";

describe("fileSystem writeAtomically", () => {
  it("should write a file atomically and successfully", async () => {
    const testPath = "output/test-report.txt";
    const res = await writeAtomically("Test Content 123", testPath);
    
    expect(res.success).toBe(true);

    const fullPath = join(process.cwd(), testPath);
    const content = await fs.readFile(fullPath, "utf-8");
    expect(content).toBe("Test Content 123");

    // Cleanup
    await fs.unlink(fullPath);
  });
});
