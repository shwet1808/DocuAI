# File Size Rulebook

← [AGENTS.md](../AGENTS.md) ← [docs/README.md](./README.md)

**Phase:** always
**Owner:** cross-cutting

Files exceeding size thresholds block pre-commit. This rulebook tells coding agents exactly what to do.

---

## Principle: Preserve First

- MUST preserve all knowledge — every strategy except DELETE is lossless
- MUST prefer ARCHIVE when unsure about a file's future value
- MUST record the chosen strategy in the commit message

---

## Thresholds

| Category | Max Lines | Tolerance |
|----------|-----------|-----------|
| Docs (.md) | 300 | +30 |
| Code (.ts, .js) | 500 | 0 |

Files within tolerance zone (301-330 docs) receive a warning. Files exceeding max + tolerance block push.

---

## Decision Tree

```
File exceeds threshold. Root cause?
│
├─ 2+ independent sub-topics → SPLIT
├─ Single topic, verbose → CONDENSE (→ SPLIT if still too large)
├─ Same topic in another file → MERGE
├─ Historical record → ARCHIVE
├─ Obsolete, captured elsewhere → DELETE (last resort)
└─ UNSURE → STOP, ask calibration question
```

---

## Strategy: SPLIT

**When:** 2+ sub-topics that can each stand alone.

For docs:
```
docs/large-topic.md  →  docs/large-topic/README.md
                         docs/large-topic/sub-a.md
                         docs/large-topic/sub-b.md
```

For code:
```
src/big-file.ts  →  src/big-file/index.ts
                    src/big-file/module-a.ts
```

---

## Strategy: CONDENSE

Trim redundant explanations, extended examples, and prose that bullets can replace. Preserve all rules, decisions, cross-references, and markers. If condensing still leaves over threshold → SPLIT.

---

## Strategy: MERGE

Two files covering the same topic → keep the canonical one, move unique content into it, delete the duplicate, update cross-refs.

---

## Strategy: ARCHIVE

Move to `docs/archive/sessions/YYYY-MM-DD.md`. Leave a one-line pointer in the original location. Archive files are exempt from size checks.

---

## Strategy: DELETE

Last resort. ALL must be true:
1. Content is independently verifiable as obsolete
2. Knowledge captured in another location
3. Decision record created
4. Human approved the deletion

**When in doubt → ARCHIVE.**
