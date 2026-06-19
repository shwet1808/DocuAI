import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DOCS_DIR = join(import.meta.dirname, "..", "docs");
const MAX_DOC_LINES = 300;
const DOC_TOLERANCE = 30;
const MAX_CODE_LINES = 500;

let warnings = 0;
let errors = 0;

function countLines(path) {
  return readFileSync(path, "utf-8").split("\n").length;
}

function scan(dir, isCode) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git", ".firecrawl", ".mastra", "archive"].includes(entry.name)) continue;
      scan(fullPath, isCode);
    } else {
      const max = isCode ? MAX_CODE_LINES : MAX_DOC_LINES;
      const tolerance = isCode ? 0 : DOC_TOLERANCE;
      const ext = entry.name.split(".").pop();
      const isTarget = isCode
        ? ["ts", "tsx", "js", "jsx"].includes(ext)
        : ext === "md";

      if (!isTarget) continue;
      if (entry.name === "DOC_FORMATS.md") continue;

      const lines = countLines(fullPath);
      const relPath = relative(join(import.meta.dirname, ".."), fullPath);

      if (lines > max + tolerance) {
        console.error(`  ERROR: ${relPath} has ${lines} lines (max ${max}+${tolerance})`);
        errors++;
      } else if (lines > max && tolerance > 0) {
        console.warn(`  WARN: ${relPath} has ${lines} lines (condense, do not split)`);
        warnings++;
      }
    }
  }
}

function existsSync(path) {
  try { statSync(path); return true; }
  catch { return false; }
}

console.log("Checking file sizes...\n");
scan(DOCS_DIR, false);

const srcDir = join(import.meta.dirname, "..", "src");
if (existsSync(srcDir)) {
  scan(srcDir, true);
}

const scriptsDir = join(import.meta.dirname, "..", "scripts");
if (existsSync(scriptsDir)) {
  scan(scriptsDir, true);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
