# Progressive Disclosure for Skills

This skill follows the progressive disclosure principle. Content is loaded in three tiers:

## Tier 1: Metadata (~100 words)
The SKILL.md frontmatter (name + description) is always in the coding agent's context. It must be specific enough for the agent to decide whether to trigger the skill.

## Tier 2: SKILL.md Body (<200 lines)
Loaded when the skill triggers. Contains:
- When to use (exact triggers)
- How to use (3 modes with commands)
- Decision tree for Q&A
- Post-generation steps

## Tier 3: References, Templates, Presets
Loaded only when needed:
- `references/schema-reference.md` — every config field explained
- `references/template-customization.md` — how to add languages and project types
- `templates/` — template files, loaded by the scaffold script, not the agent
- `presets/` — pre-filled configs for common project types

## Why This Matters

- 85% reduction in initial context load — the agent only loads SKILL.md (Tier 2)
- The heavy lifting (templates, config) is handled by the scaffold.mjs script
- Adding new languages never increases SKILL.md size
- Adding new presets never changes SKILL.md at all
