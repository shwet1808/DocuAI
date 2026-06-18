import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIRS = [join(import.meta.dirname, "..", ".agents", "skills")];

let violations = 0;

function walkSkills(base) {
  if (!existsSync(base)) return [];
  const results = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const skillPath = join(base, entry.name, "SKILL.md");
      if (existsSync(skillPath)) results.push(skillPath);
    }
  }
  return results;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\S\s]*?)\r?\n---/);
  if (!match) return null;
  const yaml = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) yaml[kv[1]] = yaml[kv[1]] = kv[2].trim();
  }
  return yaml;
}

function validateSkill(path) {
  const content = readFileSync(path, "utf-8");
  const yaml = parseFrontmatter(content);
  const dirName = path.split(/[/\\]/).slice(-2, -1)[0];

  if (!yaml) {
    console.error(`${path}: missing YAML frontmatter (required: name, description)`);
    violations++;
    return;
  }
  if (!yaml.name) {
    console.error(`${path}: missing "name" in frontmatter`);
    violations++;
  } else if (yaml.name !== dirName) {
    console.error(`${path}: name "${yaml.name}" does not match directory "${dirName}"`);
    violations++;
  }
  if (!yaml.description) {
    console.error(`${path}: missing "description" in frontmatter`);
    violations++;
  }
}

function main() {
  let files = [];
  for (const dir of SKILLS_DIRS) {
    files = files.concat(walkSkills(dir));
  }
  for (const f of files) validateSkill(f);

  if (violations === 0) {
    console.log("All SKILL.md files pass validation.");
    process.exit(0);
  }
  console.log(`\n${violations} violation(s).`);
  process.exit(1);
}

main();
