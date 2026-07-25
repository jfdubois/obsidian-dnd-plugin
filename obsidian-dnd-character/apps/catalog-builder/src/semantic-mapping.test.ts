import { describe, expect, it } from "vitest";
import type { RuleEffectType, SheetProjection } from "@obsidian-dnd/catalog-contract";
import type { SemanticMappingEntry, SemanticMappingKey, SemanticMappingRegistry } from "./semantic-mapping";
import {
  SEMANTIC_MAPPING_SCHEMA_VERSION,
  createSemanticMappingRegistry,
  validateSemanticMappingEntry,
  validateSemanticMappingRegistry,
  detectDisplayNameBranch,
  detectExecutableContent,
  isSemanticMappingKey,
  isSemanticMappingEntry,
  isSemanticMappingRegistry,
} from "./semantic-mapping";

function makeKey(entityId: string, ruleset: "2014" | "2024"): SemanticMappingKey {
  return Object.freeze({ entityId, ruleset });
}

function makeEntry(overrides: Partial<SemanticMappingEntry> = {}): SemanticMappingEntry {
  return Object.freeze({
    key: makeKey("PHB:fighter", "2014"),
    version: "1.0.0",
    rawField: "proficiencies",
    targetEffectType: "add-proficiency",
    defaultProjection: "proficiencies",
    reviewedBy: "test-reviewer",
    reviewedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });
}

describe("SEMANTIC_MAPPING_SCHEMA_VERSION", () => {
  it("is set to 1", () => {
    expect(SEMANTIC_MAPPING_SCHEMA_VERSION).toBe(1);
  });
});

describe("isSemanticMappingKey", () => {
  it("accepts valid keys", () => {
    expect(isSemanticMappingKey(makeKey("PHB:fighter", "2014"))).toBe(true);
    expect(isSemanticMappingKey(makeKey("XPHB:fighter", "2024"))).toBe(true);
  });

  it("rejects keys with empty entity ID", () => {
    expect(isSemanticMappingKey({ entityId: "", ruleset: "2014" })).toBe(false);
  });

  it("rejects keys with invalid ruleset", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2020" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isSemanticMappingKey(null)).toBe(false);
    expect(isSemanticMappingKey(undefined)).toBe(false);
    expect(isSemanticMappingKey("PHB:fighter")).toBe(false);
  });
});

describe("isSemanticMappingEntry", () => {
  it("accepts valid entries", () => {
    expect(isSemanticMappingEntry(makeEntry())).toBe(true);
  });

  it("rejects entries with invalid effect type", () => {
    expect(isSemanticMappingEntry(makeEntry({ targetEffectType: "invalid-effect" as unknown as RuleEffectType }))).toBe(false);
  });

  it("rejects entries with invalid projection", () => {
    expect(isSemanticMappingEntry(makeEntry({ defaultProjection: "invalid-projection" as unknown as SheetProjection }))).toBe(false);
  });

  it("rejects entries with empty raw field", () => {
    expect(isSemanticMappingEntry(makeEntry({ rawField: "" }))).toBe(false);
  });
});

describe("isSemanticMappingRegistry", () => {
  it("accepts valid registries", () => {
    const registry = createSemanticMappingRegistry([makeEntry()]);
    expect(isSemanticMappingRegistry(registry)).toBe(true);
  });

  it("rejects registries with invalid entries", () => {
    const invalid = { schemaVersion: 1, mappings: [{}] };
    expect(isSemanticMappingRegistry(invalid)).toBe(false);
  });
});

describe("createSemanticMappingRegistry", () => {
  it("creates a frozen registry with correct schema version", () => {
    const registry = createSemanticMappingRegistry([makeEntry()]);
    expect(registry.schemaVersion).toBe(SEMANTIC_MAPPING_SCHEMA_VERSION);
    expect(registry.mappings).toHaveLength(1);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.mappings)).toBe(true);
  });

  it("creates an empty registry", () => {
    const registry = createSemanticMappingRegistry([]);
    expect(registry.mappings).toEqual([]);
  });
});

describe("validateSemanticMappingEntry", () => {
  it("returns no diagnostics for valid entries", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry());
    expect(diagnostics).toEqual([]);
  });

  it("detects display name branching", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ rawField: "name" }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "DISPLAY_NAME_BRANCH",
      severity: "error",
    });
  });

  it("detects display name branching with displayName pattern", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ rawField: "displayName.value" }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "DISPLAY_NAME_BRANCH",
      severity: "error",
    });
  });

  it("detects executable content", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ rawField: "eval(malicious)" }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
    });
  });

  it("detects new Function pattern", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ rawField: "new Function('return 1')" }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
    });
  });

  it("detects script tag pattern", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ rawField: "<script>alert(1)</script>" }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
    });
  });

  it("detects invalid effect type", () => {
    const entry = makeEntry({ targetEffectType: "invalid-effect" as unknown as RuleEffectType });
    const diagnostics = validateSemanticMappingEntry(entry as SemanticMappingEntry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "INVALID_EFFECT_TYPE",
      severity: "error",
    });
  });

  it("detects invalid projection", () => {
    const entry = makeEntry({ defaultProjection: "invalid-projection" as unknown as SheetProjection });
    const diagnostics = validateSemanticMappingEntry(entry as SemanticMappingEntry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "INVALID_PROJECTION",
      severity: "error",
    });
  });

  it("emits multiple diagnostics for compound errors", () => {
    const entry = makeEntry({
      rawField: "eval(name)",
      targetEffectType: "invalid-effect" as unknown as RuleEffectType,
    });
    const diagnostics = validateSemanticMappingEntry(entry as SemanticMappingEntry);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map((d) => d.code)).toContain("DISPLAY_NAME_BRANCH");
    expect(diagnostics.map((d) => d.code)).toContain("EXECUTABLE_CONTENT");
    expect(diagnostics.map((d) => d.code)).toContain("INVALID_EFFECT_TYPE");
  });
});

describe("validateSemanticMappingRegistry", () => {
  it("returns no diagnostics for valid registry", () => {
    const registry = createSemanticMappingRegistry([makeEntry()]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toEqual([]);
  });

  it("detects schema version mismatch", () => {
    const registry: SemanticMappingRegistry = Object.freeze({
      schemaVersion: 99,
      mappings: Object.freeze([makeEntry()]),
    });
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "SCHEMA_VERSION_MISMATCH",
      severity: "error",
    });
  });

  it("detects duplicate mappings", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry, entry]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "DUPLICATE_MAPPING",
      severity: "warning",
    });
  });

  it("aggregates entry-level diagnostics", () => {
    const badEntry = makeEntry({ rawField: "eval(name)" });
    const registry = createSemanticMappingRegistry([badEntry]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((d) => d.code)).toContain("DISPLAY_NAME_BRANCH");
    expect(diagnostics.map((d) => d.code)).toContain("EXECUTABLE_CONTENT");
  });
});

describe("detectDisplayNameBranch", () => {
  it("detects name patterns", () => {
    expect(detectDisplayNameBranch(makeEntry({ rawField: "name" }))).toBe(true);
    expect(detectDisplayNameBranch(makeEntry({ rawField: "displayName" }))).toBe(true);
    expect(detectDisplayNameBranch(makeEntry({ rawField: "display_name" }))).toBe(true);
  });

  it("does not flag safe field names", () => {
    expect(detectDisplayNameBranch(makeEntry({ rawField: "proficiencies" }))).toBe(false);
    expect(detectDisplayNameBranch(makeEntry({ rawField: "movement.walk" }))).toBe(false);
    expect(detectDisplayNameBranch(makeEntry({ rawField: "senses.darkvision" }))).toBe(false);
  });
});

describe("detectExecutableContent", () => {
  it("detects eval calls", () => {
    expect(detectExecutableContent("eval(code)")).toBe(true);
  });

  it("detects new Function", () => {
    expect(detectExecutableContent("new Function('return 1')")).toBe(true);
  });

  it("detects script tags", () => {
    expect(detectExecutableContent("<script>alert(1)</script>")).toBe(true);
  });

  it("detects event handlers", () => {
    expect(detectExecutableContent("onclick=alert(1)")).toBe(true);
  });

  it("does not flag safe field paths", () => {
    expect(detectExecutableContent("proficiencies")).toBe(false);
    expect(detectExecutableContent("movement.walk")).toBe(false);
    expect(detectExecutableContent("senses.darkvision")).toBe(false);
    expect(detectExecutableContent("actions.attack.damage")).toBe(false);
  });
});
