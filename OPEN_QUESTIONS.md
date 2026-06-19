# Open Questions

← [AGENTS.md](../AGENTS.md) ← [docs/README.md](./README.md)

**Phase:** always
**Owner:** cross-cutting

This file is the active inbox for unresolved decisions. Coding agents MUST check this before working on a domain that has pending questions.

---

{{#each deferredDecisions}}
### {{question}}

**Decision timing:** {{timing}}
**Status:** Deferred
**Risk:** {{risk}}
**Answer:** _Pending_

{{/each}}

---

## Rules

- Add a question when a decision is needed but should not be guessed
- Every question must include when it must be answered
- When a question is answered, move the decision into docs/decisions/ and remove it from this file
- If a question is deferred, mark it as deferred and name the future milestone that should answer it
