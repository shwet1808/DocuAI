# Coding Style Taste

- All relative imports MUST use extensionless paths. No `.ts`, `.js`, or any extension in relative imports. Confidence: 0.85
- NEVER use `z.any()` in Zod schemas. Use `z.record(z.string(), z.unknown())` or a proper object schema. Confidence: 0.85
- Access `process.env` with bracket notation: `process.env['KEY']`. Confidence: 0.85
- Keep source files under 500 lines; split by responsibility when they exceed the threshold. Confidence: 0.75
- Avoid phase-specific names in files, variables, commands. Use project-contextual names. Confidence: 0.80
