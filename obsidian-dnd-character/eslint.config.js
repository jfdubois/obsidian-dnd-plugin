import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "no-console": "warn",
    },
  },
  {
    files: ["vitest.setup.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        allowDefaultProject: true,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/out/",
      "**/coverage/",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "scripts/**",
      "services/**",
      "fixtures/**",
      "references/**",
      "external/**",
      "test/**",
      "apps/obsidian-plugin/main.js",
      "vitest.setup.js",
    ],
  },
);
