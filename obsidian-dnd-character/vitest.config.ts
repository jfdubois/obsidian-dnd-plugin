import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
