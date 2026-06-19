# Template Customization Guide

## Adding a New Language

1. Create `templates/agnostic/{language}/` with all needed `.hbs` files
2. Create `templates/essential/{language}/` with simplified variants
3. Update `schemas/config.schema.json` — add the language to `language.enum`
4. Create presets in `presets/` for common project types

No changes needed to `scaffold.mjs` — it auto-discovers templates by directory name.

## Adding a New Preset

Create a JSON file in `presets/` with the full config object. Example:

```json
{
  "projectName": "my-go-service",
  "description": "A Go backend service",
  "projectType": "single-app",
  "language": "golang",
  "modelCapability": "capable",
  ...
}
```

The script automatically lists it in `--list-presets`.

## Adding a New Doc Type

1. Add the `.hbs` file to the appropriate template directory
2. If it's language-agnostic, add to `templates/base/`
3. If it's language-specific, add to `templates/{model}/{language}/`

The script uses these template resolution rules (in order):
1. `templates/{model}/{language}/{destName}.hbs`
2. `templates/base/{destName}.hbs`
3. `templates/base/{subdir}/{filename}.hbs`

If no template matches, the file is skipped — safe for optional files.

## Adding a New Field to Config Schema

1. Add the field to `schemas/config.schema.json` with type, default, and description
2. Use `{{fieldName}}` in any template that needs it
3. Use `\{{#if fieldName}}...\{{/if}}` for conditional blocks

Backward compatibility: new fields must have defaults so old presets still work.
