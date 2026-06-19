#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, symlinkSync } from "node:fs";
import { join, dirname, resolve, relative, normalize } from "node:path";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(__dirname, "..");
const TEMPLATES_DIR = join(SKILL_DIR, "templates");
const PRESETS_DIR = join(SKILL_DIR, "presets");
const STRUCTURES_DIR = join(SKILL_DIR, "structures");
const SCHEMA_PATH = join(SKILL_DIR, "schemas", "config.schema.json");

const SCHEMA = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
const NODE_MIN = 18;

// ==== CLI ======================================================================

function printHelp() {
  console.log(`
scaffold.mjs — generate agent-governed project structure

USAGE:
  node scaffold.mjs [OPTIONS]

MODES:
  --wizard              interactive Q&A
  --config <path>       read answers from JSON file
  --preset <name>       use a predefined preset
  --dry-run             preview only, write nothing

OPTIONS:
  --target <path>       output directory (default: current directory)
  --force               skip overwrite and non-empty directory prompts
  --quiet               suppress progress output, only errors + summary
  --help                show this help

LIST COMMANDS:
  --list-presets        show available presets
  --list-languages      show supported languages

EXAMPLES:
  node scaffold.mjs --wizard
  node scaffold.mjs --preset ts-monorepo-backend --target ~/my-project
  node scaffold.mjs --preset ts-cli-tool --dry-run
`);
}

function printPresets() {
  console.log("Available presets:");
  for (const f of readdirSync(PRESETS_DIR).filter(f => f.endsWith(".json"))) {
    const p = JSON.parse(readFileSync(join(PRESETS_DIR, f), "utf-8"));
    console.log(`  ${f.replace(".json", "")}  — ${p.description}`);
  }
}

function printLanguages() {
  console.log("Supported languages:");
  const langs = SCHEMA.properties.language.enum || [];
  for (const l of langs) console.log(`  ${l}`);
}

// ==== VALIDATION ===============================================================

function validateConfig(cfg) {
  const errors = [];
  for (const key of SCHEMA.required || []) {
    if (cfg[key] === undefined || cfg[key] === "") {
      errors.push(`Missing required field: ${key}`);
    }
  }
  for (const [key, spec] of Object.entries(SCHEMA.properties || {})) {
    if (cfg[key] === undefined) continue;
    if (spec.enum && !spec.enum.includes(cfg[key])) {
      errors.push(`Invalid ${key}: "${cfg[key]}". Must be one of: ${spec.enum.join(", ")}`);
    }
    if (spec.pattern && typeof cfg[key] === "string" && !new RegExp(spec.pattern).test(cfg[key])) {
      errors.push(`Invalid ${key}: "${cfg[key]}". Must match pattern: ${spec.pattern}`);
    }
  }
  if (cfg.language && !SCHEMA.properties.language.enum.includes(cfg.language)) {
    errors.push(`Unsupported language: "${cfg.language}"`);
  }
  if (errors.length > 0) {
    console.error("Config validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

function applyDefaults(cfg) {
  const result = { ...cfg };
  for (const [key, spec] of Object.entries(SCHEMA.properties || {})) {
    if (result[key] === undefined && spec.default !== undefined) {
      result[key] = spec.default;
    }
  }
  result.date = new Date().toISOString().split("T")[0];
  result.packageManagerVersion = detectPackageManagerVersion(result.packageManager);
  result.ci_github = result.ci === "github-actions";
  result.ci_local = result.ci === "local";
  result.has_db = result.database && result.database !== "none";
  result.is_open_source = result.openSource === true;
  result.is_typescript = result.language === "typescript";
  result.is_python = result.language === "python";
  result.is_pnpm = result.packageManager === "pnpm";
  result.is_monorepo = result.projectType === "monorepo";
  result.deploy_docker = result.deployment === "docker";
  result.db_postgres = result.database === "postgresql";
  result.db_sqlite = result.database === "sqlite";
  result.db_mongo = result.database === "mongodb";
  result.auth_clerk = result.auth === "clerk";
  result.auth_nextauth = result.auth === "nextauth";
  result.ai_mastra = result.aiRuntime === "mastra";
  result.has_deferred = Array.isArray(result.deferredDecisions) && result.deferredDecisions.length > 0;
  return result;
}

// ==== PACKAGE MANAGER DETECTION ================================================

function detectPackageManagerVersion(pm) {
  if (!pm) return "latest";
  try {
    const result = execSync(`${pm} --version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    }).trim();

    const match = result.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (match) return match[0];
  } catch {}

  const defaults = { pnpm: "10.33.0", npm: "11.0.0", yarn: "4.0.0" };
  return defaults[pm] || "latest";
}

// ==== WIZARD ===================================================================

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function runWizard() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const cfg = {};

  console.log("\nProject Init Wizard\n");

  cfg.projectName = await ask(rl, "Project name (kebab-case): ");
  cfg.description = await ask(rl, "Short description: ");
  console.log("\nProject type: monorepo | single-app | library | cli-tool");
  cfg.projectType = await ask(rl, "Project type [single-app]: ") || "single-app";
  console.log("\nLanguage: typescript");
  cfg.language = await ask(rl, "Language [typescript]: ") || "typescript";

  const model = await ask(rl, "\nModel capability (capable | less-capable) [capable]: ") || "capable";
  cfg.modelCapability = model;

  const domain = await ask(rl, "Domain complexity (single-domain | multi-domain) [single-domain]: ") || "single-domain";
  cfg.domainComplexity = domain;

  const ai = await ask(rl, "AI/LLM runtime (mastra | none) [none]: ") || "none";
  cfg.aiRuntime = ai;

  const db = await ask(rl, "Database (postgresql | sqlite | mongodb | none) [none]: ") || "none";
  cfg.database = db;

  const auth = await ask(rl, "Auth (clerk | nextauth | none) [none]: ") || "none";
  cfg.auth = auth;

  const deploy = await ask(rl, "Docker deployment? (docker | none) [none]: ") || "none";
  cfg.deployment = deploy;

  console.log("\nCI/CD: local (lefthook pre-push) | github-actions");
  const ci = await ask(rl, "CI/CD [local]: ") || "local";
  cfg.ci = ci;

  const os = await ask(rl, "Open source? (y/n) [n]: ");
  cfg.openSource = os.toLowerCase() === "y" || os.toLowerCase() === "yes";

  const mt = await ask(rl, "Multi-tenant? (y/n) [n]: ");
  cfg.multiTenant = mt.toLowerCase() === "y" || mt.toLowerCase() === "yes";

  const research = await ask(rl, "Preserve research data (.firecrawl/) in git? (Y/n) [Y]: ");
  cfg.preserveResearchData = research.toLowerCase() !== "n";

  if (cfg.language === "typescript") {
    const pm = await ask(rl, "Package manager (pnpm | npm | yarn) [pnpm]: ") || "pnpm";
    cfg.packageManager = pm;
  }

  console.log("\nTool aliases (symlinks for other coding agents):");
  console.log("Options: claude, cline, cursor, codex, kilocode, roo");
  const tools = await ask(rl, "Create aliases for (comma-separated, or none): ");
  cfg.toolAliases = tools ? tools.split(",").map(t => t.trim()).filter(Boolean) : [];

  rl.close();
  return applyDefaults(cfg);
}

// ==== TEMPLATE RESOLUTION ======================================================

function listTemplates(modelDir, language) {
  const templates = new Map();
  const scanDir = (base, prefix) => {
    if (!existsSync(base)) return;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scanDir(join(base, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith(".hbs")) {
        const destName = entry.name.replace(".hbs", "");
        const destPath = prefix ? `${prefix}/${destName}` : destName;
        templates.set(destPath, join(base, entry.name));
      }
    }
  };

  scanDir(join(TEMPLATES_DIR, modelDir, language), "");
  scanDir(join(TEMPLATES_DIR, "base"), "");

  return templates;
}

// ==== RENDERING ================================================================

function renderTemplate(content, cfg) {
  let result = content;
  for (const [key, value] of Object.entries(cfg)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result = result.replaceAll(`{{${key}}}`, String(value ?? ""));
    }
  }

  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, key, body) => {
    const elseIdx = body.indexOf("{{else}}");
    if (elseIdx !== -1) {
      return cfg[key] ? body.slice(0, elseIdx) : body.slice(elseIdx + 9);
    }
    return cfg[key] ? body : "";
  });

  result = result.replace(/\\\{\{/g, "{{");

  return result;
}

// ==== FILE GENERATION ==========================================================

let generatedFiles = [];
let quiet = false;

function log(msg) {
  if (!quiet) console.log(msg);
}

function generateFiles(cfg, targetDir, dryRun) {
  const modelDir = cfg.modelCapability === "less-capable" ? "essential" : "agnostic";
  const structure = selectStructure(cfg);
  let templates = listTemplates(modelDir, cfg.language);

  if (templates.size === 0) {
    console.error(`No templates found for ${modelDir}/${cfg.language}`);
    process.exit(1);
  }

  log(`\nUsing ${modelDir} templates for ${cfg.language}`);
  log(`Structure: ${structure.name} (${structure.description})`);

  for (const dir of structure.directories) {
    const fullPath = join(targetDir, dir);
    if (!dryRun) mkdirSync(fullPath, { recursive: true });
  }

  let count = 0;
  const total = templates.size;
  generatedFiles = [];

  for (const [destPath, templatePath] of templates) {
    count++;
    const fullDest = join(targetDir, destPath);
    const templateContent = readFileSync(templatePath, "utf-8");
    const rendered = renderTemplate(templateContent, cfg);

    log(`  [${String(count).padStart(2, " ")}/${total}] ${destPath}`);

    if (!dryRun) {
      mkdirSync(dirname(fullDest), { recursive: true });
      if (existsSync(fullDest) && !process.argv.includes("--force")) {
        console.warn(`    Skipping existing file: ${destPath}`);
        continue;
      }
      writeFileSync(fullDest, rendered, "utf-8");
    }
    generatedFiles.push(destPath);
  }

  if (!dryRun) {
    for (const tool of cfg.toolAliases || []) {
      const aliasMap = {
        claude: "CLAUDE.md",
        cline: ".clinerules",
        cursor: ".cursorrules",
        codex: ".codex",
        kilocode: ".kilocode",
        roo: ".roo",
      };
      if (aliasMap[tool]) {
        const linkPath = join(targetDir, aliasMap[tool]);
        try {
          if (!existsSync(linkPath)) symlinkSync("AGENTS.md", linkPath);
          log(`  Symlinked: ${aliasMap[tool]} -> AGENTS.md`);
        } catch (err) {
          log(`  Warning: could not create symlink ${aliasMap[tool]} (${err.code})`);
        }
      }
    }
  }

  return generatedFiles;
}

function selectStructure(cfg) {
  let name;
  if (cfg.projectType === "monorepo") {
    name = "monorepo";
  } else if (cfg.domainComplexity === "multi-domain") {
    name = "folder-based";
  } else {
    name = "flat";
  }
  const path = join(STRUCTURES_DIR, `${name}.json`);
  if (!existsSync(path)) {
    console.error(`Structure not found: ${name}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

// ==== POST-GENERATION ==========================================================

function printSummary(cfg, files) {
  console.log(`\nGenerated ${files.length} files.`);
  console.log("\nNext steps:");
  if (cfg.packageManager) {
    console.log(`  [ ] ${cfg.packageManager} install`);
  }
  if (cfg.language === "typescript") {
    console.log("  [ ] npm run lint && npm run typecheck");
  }
  console.log("  [ ] Review docs/OPEN_QUESTIONS.md for pending decisions");
  console.log("  [ ] Customize taste files in .agents/taste/");
  console.log('  [ ] git init && git add -A && git commit -m "chore: scaffold from agent-blueprint"');
  console.log("\n  [ ] Optional: search for project-specific skills");
  console.log('      npx skills find "nestjs"     # if using NestJS');
  console.log('      npx skills find "nextjs"     # if using Next.js');
}

// ==== PRE-FLIGHT CHECKS ========================================================

function checkNodeVersion() {
  const v = process.versions.node.split(".").map(Number);
  if (v[0] < NODE_MIN) {
    console.error(`Node.js v${NODE_MIN}+ required. You have v${process.versions.node}.`);
    console.error("Install: https://nodejs.org");
    process.exit(1);
  }
}

function checkTargetDir(targetDir) {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    return;
  }
  const entries = readdirSync(targetDir).filter(f => !f.startsWith(".") || f === ".git");
  if (entries.length > 0 && !process.argv.includes("--force")) {
    console.error(`Target directory is not empty: ${targetDir}`);
    console.error("Use --force to overwrite, or --dry-run to preview.");
    process.exit(1);
  }
}

// ==== MAIN =====================================================================

async function main() {
  const args = process.argv.slice(2);
  quiet = args.includes("--quiet");
  const dryRun = args.includes("--dry-run");

  if (args.includes("--help") || args.length === 0) return printHelp();
  if (args.includes("--list-presets")) return printPresets();
  if (args.includes("--list-languages")) return printLanguages();

  checkNodeVersion();

  let targetDir = process.cwd();
  const targetIdx = args.indexOf("--target");
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    targetDir = resolve(args[targetIdx + 1]);
  }

  if (!dryRun) checkTargetDir(targetDir);

  let cfg;
  if (args.includes("--wizard")) {
    cfg = await runWizard();
  } else if (args.includes("--config")) {
    const configIdx = args.indexOf("--config");
    const configPath = configIdx !== -1 && args[configIdx + 1] ? resolve(args[configIdx + 1]) : null;
    if (!configPath || !existsSync(configPath)) {
      console.error("Config file not found. Use --config <path>");
      process.exit(1);
    }
    cfg = JSON.parse(readFileSync(configPath, "utf-8"));
    cfg = applyDefaults(cfg);
  } else if (args.includes("--preset")) {
    const presetIdx = args.indexOf("--preset");
    const presetName = presetIdx !== -1 && args[presetIdx + 1] ? args[presetIdx + 1] : null;
    const presetPath = join(PRESETS_DIR, `${presetName}.json`);
    if (!presetName || !existsSync(presetPath)) {
      console.error(`Preset not found: ${presetName}`);
      printPresets();
      process.exit(1);
    }
    cfg = JSON.parse(readFileSync(presetPath, "utf-8"));
    cfg = applyDefaults(cfg);
    log(`Using preset: ${presetName}`);
  } else {
    console.error("Specify --wizard, --config <path>, or --preset <name>");
    console.error("Run with --help for usage.");
    process.exit(1);
  }

  validateConfig(cfg);

  if (dryRun) log("[DRY RUN — no files will be written]\n");

  const files = generateFiles(cfg, targetDir, dryRun);

  if (!dryRun) printSummary(cfg, files);
  else log(`\nWould generate ${files.length} files in ${targetDir}`);
}

let cleanupDone = false;
process.on("SIGINT", () => {
  if (!cleanupDone) {
    cleanupDone = true;
    console.log("\nInterrupted. No partial files written.");
    process.exit(1);
  }
});

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
