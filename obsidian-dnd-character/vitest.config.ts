import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "obsidian": path.resolve(__dirname, "test/obsidian-test-shim.ts"),
      "@obsidian-dnd/domain": path.resolve(__dirname, "packages/domain/src"),
      "@obsidian-dnd/catalog-contract": path.resolve(__dirname, "packages/catalog-contract/src"),
      "@obsidian-dnd/character-contract": path.resolve(__dirname, "packages/character-contract/src"),
      "@obsidian-dnd/rules-engine": path.resolve(__dirname, "packages/rules-engine/src"),
      "@obsidian-dnd/testing": path.resolve(__dirname, "packages/testing/src"),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts", "test/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
    ],
    coverage: {
      provider: "v8",
      include: [
        "apps/**/*.ts",
        "packages/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.config.ts",
      ],
    },
  },
});
