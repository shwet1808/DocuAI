---
name: project-init
description: Scaffold agent-governed projects with AGENTS.md, docs structure, coding standards, git policy, quality gates, and pre-commit hooks. Use when starting a new project, initializing a repo, or the user says "scaffold", "init project", "start new project", "create project from scratch", or "set up a new project".
---

# Project Init

## When to Use

Use ONLY when:
- Starting a new project from scratch
- User says: scaffold, init, start project, create project, new repo, set up project

## How to Use

### Mode A: Quick Preset (Recommended when intent is clear)

```bash
node skills/project-init/scripts/scaffold.mjs --preset <name> --target /path/to/project
```

Available presets: `ts-monorepo-backend`, `ts-mastra-ai-runtime`, `ts-cli-tool`. Run with `--list-presets`.

### Mode B: Interactive (When the user is unsure)

```bash
node skills/project-init/scripts/scaffold.mjs --wizard
```

The script asks questions. After completion, review docs/OPEN_QUESTIONS.md.

### Mode C: Configuration File

1. Ask the user project questions (see Decision Tree below)
2. Write answers to a JSON file following the schema
3. Run: `node skills/project-init/scripts/scaffold.mjs --config answers.json`

## Decision Tree

| Question | Options | Default |
|----------|---------|---------|
| Project name | kebab-case | — |
| Project type | monorepo / single-app / library / cli-tool | single-app |
| Language | typescript | typescript |
| Domain complexity | single-domain (flat) / multi-domain (folder) | single-domain |
| AI/LLM runtime | mastra / none | none |
| Database | postgresql / sqlite / mongodb / none | none |
| Auth | clerk / nextauth / none | none |
| Docker | docker / none | none |
| CI/CD | local / github-actions | local |
| Open source | yes / no | no |
| Multi-tenant | yes / no | no |
| Preserve research (.firecrawl) in git | yes / no | yes |
| Model capability | capable / less-capable | capable |
| Package manager | pnpm / npm / yarn | pnpm |
| Tool symlinks | claude, cline, cursor, codex, etc. | none |

Deferred decisions go into docs/OPEN_QUESTIONS.md with timing.

## Post-Generation

After scaffold completes, tell the user:
- Files generated and location
- Run package manager install
- Review docs/OPEN_QUESTIONS.md for pending decisions
- Initialize git and commit

For project-specific skills (NestJS, React, etc.), suggest `npx skills find <query>`.
