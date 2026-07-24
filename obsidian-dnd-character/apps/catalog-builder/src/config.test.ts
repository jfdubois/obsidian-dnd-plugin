import { describe, it, expect } from "vitest";
import {
  createBuilderConfig,
  defaultBuilderConfig,
  isBuilderConfig,
  isBuildMode,
  BUILD_MODES,
  type BuilderConfig,
  type BuildMode,
} from "./config";
import { createSourceId } from "@obsidian-dnd/domain";
import type { Ruleset, SourceId } from "@obsidian-dnd/domain";

describe("BuildMode", () => {
  it("isBuildMode accepts 'full'", () => {
    expect(isBuildMode("full")).toBe(true);
  });

  it("isBuildMode accepts 'incremental'", () => {
    expect(isBuildMode("incremental")).toBe(true);
  });

  it("isBuildMode rejects unknown strings", () => {
    expect(isBuildMode("partial")).toBe(false);
    expect(isBuildMode("")).toBe(false);
  });

  it("isBuildMode rejects non-strings", () => {
    expect(isBuildMode(null)).toBe(false);
    expect(isBuildMode(undefined)).toBe(false);
    expect(isBuildMode(1)).toBe(false);
    expect(isBuildMode(true)).toBe(false);
  });

  it("BUILD_MODES contains exactly the valid values", () => {
    expect(BUILD_MODES).toEqual(["full", "incremental"]);
    for (const mode of BUILD_MODES) {
      expect(isBuildMode(mode)).toBe(true);
    }
  });
});

describe("isBuilderConfig", () => {
  const makeValidConfig = (overrides?: Record<string, unknown>): unknown => ({
    clonePath: "./5eTools",
    outputPath: "./catalog",
    includedRulesets: ["2014" as Ruleset, "2024" as Ruleset],
    contentPolicy: {
      enabledSourceIds: [createSourceId("phb")],
      includeCore: true,
    },
    buildMode: "full" as BuildMode,
    ...overrides,
  });

  it("accepts full valid config", () => {
    expect(isBuilderConfig(makeValidConfig())).toBe(true);
  });

  it("accepts config with single ruleset 2014", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: ["2014" as Ruleset] })),
    ).toBe(true);
  });

  it("accepts config with single ruleset 2024", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: ["2024" as Ruleset] })),
    ).toBe(true);
  });

  it("accepts config with incremental build mode", () => {
    expect(
      isBuilderConfig(makeValidConfig({ buildMode: "incremental" as BuildMode })),
    ).toBe(true);
  });

  it("accepts config with empty enabledSourceIds", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: { enabledSourceIds: [] as SourceId[], includeCore: true },
        }),
      ),
    ).toBe(true);
  });

  it("rejects empty clonePath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ clonePath: "" })),
    ).toBe(false);
  });

  it("rejects empty outputPath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ outputPath: "" })),
    ).toBe(false);
  });

  it("rejects non-string clonePath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ clonePath: 123 })),
    ).toBe(false);
  });

  it("rejects non-string outputPath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ outputPath: null })),
    ).toBe(false);
  });

  it("rejects missing clonePath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ clonePath: undefined })),
    ).toBe(false);
  });

  it("rejects missing outputPath", () => {
    expect(
      isBuilderConfig(makeValidConfig({ outputPath: undefined })),
    ).toBe(false);
  });

  it("rejects empty includedRulesets array", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: [] })),
    ).toBe(false);
  });

  it("rejects invalid ruleset value", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: ["5e"] })),
    ).toBe(false);
  });

  it("rejects non-array includedRulesets", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: "2014" })),
    ).toBe(false);
  });

  it("rejects missing includedRulesets", () => {
    expect(
      isBuilderConfig(makeValidConfig({ includedRulesets: undefined })),
    ).toBe(false);
  });

  it("rejects invalid build mode", () => {
    expect(
      isBuilderConfig(makeValidConfig({ buildMode: "partial" })),
    ).toBe(false);
  });

  it("rejects missing buildMode", () => {
    expect(
      isBuilderConfig(makeValidConfig({ buildMode: undefined })),
    ).toBe(false);
  });

  it("rejects includeCore not true", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: {
            enabledSourceIds: [createSourceId("phb")],
            includeCore: false,
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects missing includeCore", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: {
            enabledSourceIds: [createSourceId("phb")],
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-array enabledSourceIds", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: {
            enabledSourceIds: "phb",
            includeCore: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-string in enabledSourceIds", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: {
            enabledSourceIds: [123],
            includeCore: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects empty string in enabledSourceIds", () => {
    expect(
      isBuilderConfig(
        makeValidConfig({
          contentPolicy: {
            enabledSourceIds: ["phb", ""],
            includeCore: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects missing contentPolicy", () => {
    expect(
      isBuilderConfig(makeValidConfig({ contentPolicy: undefined })),
    ).toBe(false);
  });

  it("rejects null contentPolicy", () => {
    expect(
      isBuilderConfig(makeValidConfig({ contentPolicy: null })),
    ).toBe(false);
  });

  it("rejects null", () => {
    expect(isBuilderConfig(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isBuilderConfig(undefined)).toBe(false);
  });

  it("rejects plain string", () => {
    expect(isBuilderConfig("not-a-config")).toBe(false);
  });

  it("rejects number", () => {
    expect(isBuilderConfig(42)).toBe(false);
  });

  it("rejects array", () => {
    expect(isBuilderConfig([])).toBe(false);
  });
});

describe("createBuilderConfig", () => {
  it("creates a valid config", () => {
    const config = createBuilderConfig({
      clonePath: "./5eTools",
      outputPath: "./catalog",
      includedRulesets: ["2014" as Ruleset, "2024" as Ruleset],
      contentPolicy: {
        enabledSourceIds: [createSourceId("phb")],
        includeCore: true,
      },
      buildMode: "full" as BuildMode,
    });
    expect(config.clonePath).toBe("./5eTools");
    expect(config.outputPath).toBe("./catalog");
    expect(config.includedRulesets).toEqual(["2014", "2024"]);
    expect(config.contentPolicy.enabledSourceIds).toEqual([createSourceId("phb")]);
    expect(config.contentPolicy.includeCore).toBe(true);
    expect(config.buildMode).toBe("full");
  });

  it("returns a frozen object", () => {
    const config = createBuilderConfig({
      clonePath: "./5eTools",
      outputPath: "./catalog",
      includedRulesets: ["2014" as Ruleset],
      contentPolicy: {
        enabledSourceIds: [],
        includeCore: true,
      },
      buildMode: "full" as BuildMode,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.includedRulesets)).toBe(true);
    expect(Object.isFrozen(config.contentPolicy)).toBe(true);
  });

  it("creates immutable copy of includedRulesets", () => {
    const rulesets: Ruleset[] = ["2014" as Ruleset];
    const config = createBuilderConfig({
      clonePath: "./5eTools",
      outputPath: "./catalog",
      includedRulesets: rulesets,
      contentPolicy: {
        enabledSourceIds: [],
        includeCore: true,
      },
      buildMode: "full" as BuildMode,
    });
    rulesets.push("2024" as Ruleset);
    expect(config.includedRulesets).toHaveLength(1);
  });

  it("creates immutable copy of enabledSourceIds", () => {
    const sourceIds: SourceId[] = [createSourceId("phb")];
    const config = createBuilderConfig({
      clonePath: "./5eTools",
      outputPath: "./catalog",
      includedRulesets: ["2014" as Ruleset],
      contentPolicy: {
        enabledSourceIds: sourceIds,
        includeCore: true,
      },
      buildMode: "full" as BuildMode,
    });
    sourceIds.push(createSourceId("xge"));
    expect(config.contentPolicy.enabledSourceIds).toHaveLength(1);
  });
});

describe("defaultBuilderConfig", () => {
  it("returns a valid config", () => {
    const config = defaultBuilderConfig();
    expect(isBuilderConfig(config)).toBe(true);
  });

  it("has placeholder clonePath", () => {
    expect(defaultBuilderConfig().clonePath).toBe("./5eTools");
  });

  it("has placeholder outputPath", () => {
    expect(defaultBuilderConfig().outputPath).toBe("./catalog");
  });

  it("includes both rulesets", () => {
    expect(defaultBuilderConfig().includedRulesets).toEqual(["2014", "2024"]);
  });

  it("has empty enabledSourceIds (core-only)", () => {
    expect(defaultBuilderConfig().contentPolicy.enabledSourceIds).toEqual([]);
  });

  it("has includeCore true", () => {
    expect(defaultBuilderConfig().contentPolicy.includeCore).toBe(true);
  });

  it("uses full build mode", () => {
    expect(defaultBuilderConfig().buildMode).toBe("full");
  });

  it("returns a frozen config", () => {
    expect(Object.isFrozen(defaultBuilderConfig())).toBe(true);
  });
});

describe("round-trip", () => {
  it("factory output passes validator", () => {
    const config = createBuilderConfig({
      clonePath: "./5eTools",
      outputPath: "./catalog",
      includedRulesets: ["2014" as Ruleset, "2024" as Ruleset],
      contentPolicy: {
        enabledSourceIds: [createSourceId("phb"), createSourceId("xge")],
        includeCore: true,
      },
      buildMode: "incremental" as BuildMode,
    });
    expect(isBuilderConfig(config)).toBe(true);
    const typed = config as unknown as BuilderConfig;
    expect(typed.buildMode).toBe("incremental");
    expect(typed.includedRulesets).toHaveLength(2);
    expect(typed.contentPolicy.includeCore).toBe(true);
  });

  it("default config passes validator", () => {
    expect(isBuilderConfig(defaultBuilderConfig())).toBe(true);
  });
});
