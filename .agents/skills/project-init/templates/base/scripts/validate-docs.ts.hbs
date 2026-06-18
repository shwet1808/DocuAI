import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DOCS_DIR = join(import.meta.dirname, "..", "docs");
const DECISIONS_DIR = join(DOCS_DIR, "decisions");

let violations = 0;

function checkFrontmatter(path, content) {
  const hasFrontmatter = content.startsWith("---");
  if (!hasFrontmatter) {
    if (path.includes("decisions/")) {
      console.error(`${path}: missing YAML frontmatter (required for decisions)`);
      violations++;
    }
  }
}

function checkBreadcrumb(path, content) {
  const filename = path.split("/").pop();
  if (filename === "README.md" || filename === "DOC_FORMATS.md") return;
  if (!content.includes("AGENTS.md") && !content.includes("[AGENTS.md]")) {
    console.warn(`${path}: missing breadcrumb link to AGENTS.md`);
  }
}

function checkDecisionsIndex() {
  const indexPath = join(DECISIONS_DIR, "README.md");
  if (!existsSync(indexPath)) return;
  const indexContent = readFileSync(indexPath, "utf-8");
  const files = readdirSync(DECISIONS_DIR).filter(f => f.endsWith(".md") && f !== "README.md");
  for (const f of files) {
    const name = f.replace(".md", "");
    if (!indexContent.includes(name)) {
      console.warn(`${indexPath}: decision "${name}" not listed in index`);
    }
  }
}

function walkDocs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDocs(fullPath);
    } else if (entry.name.endsWith(".md")) {
      const content = readFileSync(fullPath, "utf-8");
      checkFrontmatter(fullPath, content);
      checkBreadcrumb(fullPath, content);
    }
  }
}

console.log("Validating docs...");
walkDocs(DOCS_DIR);
checkDecisionsIndex();

if (violations > 0) {
  console.error(`\n${violations} violation(s) found.`);
  process.exit(1);
}
console.log("All docs pass validation.");
