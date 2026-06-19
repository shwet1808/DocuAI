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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": "off",

      "functional/immutable-data": "off",
      "functional/no-let": "off",
      "functional/no-throw-statements": "off",
      "functional/no-try-statements": "off",

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
    ignores: ["dist/", "node_modules/", ".firecrawl/", ".agents/", "scripts/", "*.config.mjs", "commitlint.config.mjs"],
  },
);
