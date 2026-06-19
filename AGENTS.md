# docu-ai — Coding Agent Instructions

Highly resilient, autonomous AI News and Research Agent using TypeScript, Express, and Crawlee

---

## Keyword Meanings

- MUST = required rule
- SHOULD = strong recommendation, can override with documented reason
- NEVER = forbidden without explicit permission
- STOP = pause and ask the human

---

## Terminology

- **Coding Agent** — AI tool building and maintaining this project
- **Workflow Agent** — AI agent inside a runtime pipeline
- **Human Maintainer** — person operating this project

---

## Precedence

1. Current human instruction
2. This AGENTS.md
3. Accepted decisions in [docs/decisions](docs/decisions/README.md)
4. Topic-specific docs in [docs/README.md](docs/README.md)
5. `.agents/taste/` — advisory learned preferences only

---

## Non-Negotiable Rules

- MUST read relevant docs before asking or changing code
- MUST keep docs synchronized with implementation
- MUST use one source of truth for shared types, schemas, and constants
- NEVER bypass git hooks with `--no-verify`, `--force`, or any skip method
- NEVER include secrets in commits, messages, or metadata
- MUST think first — understand context before acting
- MUST verify every change: lint, typecheck, test
- MUST ask when context cannot answer — never assume

---

## Required Read Path

For every task:

1. Read this file
2. Read [docs/README.md](docs/README.md) — pick task-specific docs
3. If creating or editing any doc: read [docs/DOC_FORMATS.md](docs/DOC_FORMATS.md)
4. Read task-specific docs from the Context Routing table below
5. If touching implemented code: check [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) for pending decisions
6. Read `.agents/taste/` for advisory preferences only

---

## Context Routing

| When working on... | Read these first |
|---|---|
| Coding standards, rules, git policy | [docs/CODING_RULES.md](docs/CODING_RULES.md) |
| Agent behavior, STOP rules, quality gates | [docs/CODING_AGENT_BEHAVIOR.md](docs/CODING_AGENT_BEHAVIOR.md) |
| Docs lifecycle, where to add content | [docs/CONTEXT_STRATEGY.md](docs/CONTEXT_STRATEGY.md) |
| File size limits, splitting docs | [docs/FILE_SIZE_RULEBOOK.md](docs/FILE_SIZE_RULEBOOK.md) |
| Engineering principles (SOLID, DRY, etc.) | [docs/ENGINEERING_PRINCIPLES.md](docs/ENGINEERING_PRINCIPLES.md) |
| Unresolved decisions, deferred questions | [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) |
| Library/framework documentation | Context7 MCP (when available) |




---

## Quality Gates

Before every commit, the coding agent MUST run:

```bash
npm run lint && npm run typecheck && npm run test
```

Never defer quality checks to git hooks. Failing and proceeding is a defect.

---

## Taste

`.agents/taste/` stores learned preferences with confidence scores. Taste is advisory only — never overrides formal docs. Coding agents MAY suggest taste updates for patterns that are durable (confidence >= 0.50) and not already owned by formal docs.
