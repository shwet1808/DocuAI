---
status: accepted
date: 2026-06-19
---

← [AGENTS.md](../../AGENTS.md) ← [docs/README.md](../README.md)

# ADR-FW-000: Documentation Architecture Standard

## Context

This project needs structured, discoverable, and agent-friendly documentation. Coding agents require consistent doc formats to make correct decisions without guessing. Humans need docs that stay synchronized with implementation.

## Decision

All project documentation follows the format types defined in DOC_FORMATS.md:

- **decision** — Architecture Decision Records in docs/decisions/
- **rules** — Coding standards, policies with MUST/SHOULD/NEVER/STOP keywords
- **strategy** — Architecture decisions with Problem/Approach/Decision sections
- **registry** — Reference tables and indexes
- **questions** — Open Questions inbox
- **narrative** — Free-form prose for architecture and principles

File size limits: 300 lines for docs (+30 tolerance), 500 lines for code. Enforced via pre-commit hooks.

Document naming: semantic kebab-case filenames. No numeric IDs.

AGENTS.md is the mandatory bootstrap for all coding agents. Formal rules live in docs/ files. `.agents/taste/` stores advisory learned preferences.

## Consequences

Easier: coding agents find relevant context quickly. Doc formats are predictable — agents know section structure before reading. File size limits prevent knowledge silos. Single source of truth for every rule.

Harder: requires discipline to split oversized files, keep docs synchronized, and follow format specifications.
