# DOC_FORMATS.md.hbs — Document Format Specification

← [AGENTS.md](../AGENTS.md)

This file defines how project documentation is structured. Coding agents MUST read this before creating or editing any doc.

---

## Doc Types

| Type | Used for | Format |
|------|----------|--------|
| `decision` | ADRs in docs/decisions/ | YAML frontmatter (status, date), sections: Context, Decision, Consequences |
| `rules` | Coding standards, policies | Inline metadata (Phase, Owner), keyword-prefixed bullets: MUST, SHOULD, NEVER, STOP |
| `strategy` | Architecture decisions | Sections: Problem, Approach, Decision, Metadata |
| `registry` | Reference tables, indexes | Table-driven, grouped by category headings |
| `questions` | Open Questions inbox | Per-question: Decision timing, Status, Risk, Answer |
| `narrative` | Free-form prose | Standard markdown with headings |
| `config` | Configuration reference | Tabular format with Field/Value columns |

---

## Universal Rules

- MUST use semantic file names — no numeric IDs (not DOC-001.md, use `coding-standards.md`)
- MUST keep files under 300 lines (docs), 500 lines (code)
- MUST use the defined section structure for each doc type
- MUST NOT create a doc without a matching format type
- MUST link back to AGENTS.md from every doc

---

## Metadata Patterns

### YAML Frontmatter (decisions)

```yaml
---
status: accepted
date: YYYY-MM-DD
related: []
---
```

### Inline Metadata (rules, strategies)

```markdown
**Phase:** always
**Owner:** cross-cutting
```

---

## File Size Limits

| Category | Max Lines | Tolerance |
|----------|-----------|-----------|
| Docs (.md) | 300 | +30 |
| Code (.ts, .js) | 500 | 0 |

Files exceeding max + tolerance block pre-commit. Use the decision tree: SPLIT > CONDENSE > MERGE > ARCHIVE > DELETE.
