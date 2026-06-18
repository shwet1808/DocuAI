# Config Schema Reference

Every field in `schemas/config.schema.json` explained:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `projectName` | string | **yes** | — | kebab-case project name |
| `description` | string | no | — | one-line project description |
| `projectType` | enum | **yes** | — | `monorepo`, `single-app`, `library`, `cli-tool` |
| `language` | enum | **yes** | — | currently `typescript` only; more coming |
| `modelCapability` | enum | no | `capable` | `capable` (comprehensive docs with cross-refs) or `less-capable` (essential docs with inline rules) |
| `domainComplexity` | enum | no | `single-domain` | `single-domain` (flat docs) or `multi-domain` (folder-based docs) |
| `aiRuntime` | enum | no | `none` | `mastra` or `none` |
| `database` | enum | no | `none` | `postgresql`, `sqlite`, `mongodb`, or `none` |
| `auth` | enum | no | `none` | `clerk`, `nextauth`, or `none` |
| `deployment` | enum | no | `none` | `docker` or `none` |
| `ci` | enum | no | `none` | `github-actions` or `none` |
| `openSource` | boolean | no | `false` | generates LICENSE and CONTRIBUTING.md |
| `multiTenant` | boolean | no | `false` | enables multi-tenant documentation |
| `packageManager` | enum | no | `pnpm` | `pnpm`, `npm`, or `yarn` (language=typescript only) |
| `toolAliases` | array | no | `[]` | symlink tool aliases: `claude`, `cline`, `cursor`, `codex`, `kilocode`, `roo` |
| `deferredDecisions` | array | no | `[]` | questions deferred during grill phase, each with `question`, `timing`, `risk` |

## Template Variables

All config fields are available as `{{fieldName}}` in templates.

Conditional blocks: `{{#if fieldName}}...body...{{/if}}` renders body only if the field is truthy.

Escaping: `\{{` renders as literal `{{` in output.
