# Context Strategy

← [AGENTS.md](../AGENTS.md) ← [docs/README.md](./README.md)

**Phase:** always
**Owner:** cross-cutting

This project must make repository and product context easy for coding agents to consume.

---

## Problem

Coding agents need discoverable, structured context to make correct decisions without guessing. Flat READMEs and undocumented assumptions do not scale across sessions and agent types.

## Approach

Organize docs by concern with consistent formats. Use AGENTS.md as the root instruction source, docs/README.md as the context map, and topic docs for detailed rules. Enforce format compliance via validation scripts.

---

## Goals

- Reduce ambiguity
- Preserve intent
- Help coding agents make consistent decisions
- Keep docs synchronized with implementation
- Keep context small enough to load only what is useful

---

## Document Style

Docs should be:
- Short enough for agents to read under 300 lines
- Explicit about decisions and non-goals
- Linked from the index
- Updated when behavior changes
- Written in simple English

---

## Docs Lifecycle

### Add a doc when:
- Knowledge is durable and likely to matter again
- The same context is repeated 2 or more times
- The topic crosses multiple modules
- A new module exists and needs local setup or ownership notes

### Update a doc when:
- Code and docs disagree
- Architecture, contracts, or behavior changes
- A repeated coding agent mistake shows instructions are missing or unclear
- A deferred question is answered

### Delete a doc when:
- It is stale and no longer useful
- It duplicates a better source of truth
- Its contents have moved into a clearer document

---

## Where To Add New Content

Shared rules for all workspaces → Root docs (CODING_RULES.md)

A decision that affects architecture or product → docs/decisions/

An unresolved question → docs/OPEN_QUESTIONS.md

A question already in OPEN_QUESTIONS.md → Do NOT duplicate. Reference it instead.

---

## Context Sync Protocol

Before finishing any task, the coding agent MUST:

1. Did the task change durable context?
2. Find the existing doc that owns this context and update it
3. If no doc owns it, is the context durable enough to create one?
4. If a human decision is needed, record it in OPEN_QUESTIONS.md
