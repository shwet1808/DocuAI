import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import functional from "eslint-plugin-functional";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import noSecrets from "eslint-plugin-no-secrets";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      boundaries,
      functional,
      import: importPlugin,
      unicorn,
      "no-secrets": noSecrets,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      "functional/immutable-data": "error",
      "functional/no-let": "error",
      "functional/no-throw-statements": "error",
      "functional/no-try-statements": "warn",

      "import/no-cycle": "error",
      "import/order": ["error", {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      }],

      "unicorn/better-regex": "warn",
      "unicorn/no-abusive-eslint-disable": "warn",

      "no-secrets/no-secrets": "error",
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      ".firecrawl/",
      ".agents/",
      "eslint.config.mjs",
      "commitlint.config.mjs",
      "scripts/"
    ],
  },
);
