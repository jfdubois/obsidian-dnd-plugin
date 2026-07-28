import { describe, expect, it } from "vitest";
import type { RuleEffect, RuleEffectType, SheetProjection } from "@obsidian-dnd/catalog-contract";
import {
  isRuleEffect,
  createAddAbilityEffect,
  createRuleEffectMetadata,
  createEffectPresentation,
  createEffectOrigin,
} from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { SemanticMappingEntry, SemanticMappingKey, SemanticMappingRegistry } from "./semantic-mapping";
import {
  SEMANTIC_MAPPING_SCHEMA_VERSION,
  createSemanticMappingRegistry,
  validateSemanticMappingEntry,
  validateSemanticMappingRegistry,
  detectExecutableContent,
  isSemanticMappingKey,
  isSemanticMappingEntry,
  isSemanticMappingRegistry,
} from "./semantic-mapping";

function makeKey(entityId: string, ruleset: "2014" | "2024"): SemanticMappingKey {
  return Object.freeze({ entityId, ruleset });
}

function makeEffect(): RuleEffect {
  return createAddAbilityEffect(
    createRuleEffectMetadata(
      "full",
      createEffectPresentation("abilities", []),
      createEffectOrigin(createEntityId("PHB:fighter"), createSourceId("phb"), "structured"),
    ),
    "STR",
    1,
  );
}

function makeEntry(overrides: Partial<SemanticMappingEntry> = {}): SemanticMappingEntry {
  return Object.freeze({
    key: makeKey("PHB:fighter", "2014"),
    mappingVersion: 1,
    sourceRevision: "abc123",
    effect: makeEffect(),
    reviewedBy: "test-reviewer",
    reviewedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });
}

describe("SEMANTIC_MAPPING_SCHEMA_VERSION", () => {
  it("is set to 2", () => {
    expect(SEMANTIC_MAPPING_SCHEMA_VERSION).toBe(2);
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

  it("accepts entries with optional fields omitted", () => {
    const entry = makeEntry({ sourceFingerprint: undefined, defaultProjection: undefined });
    expect(isSemanticMappingEntry(entry)).toBe(true);
  });

  it("accepts entries with optional fields present", () => {
    const entry = makeEntry({ sourceFingerprint: "fp-123", defaultProjection: "abilities" });
    expect(isSemanticMappingEntry(entry)).toBe(true);
  });

  it("rejects entries with missing effect", () => {
    expect(isSemanticMappingEntry(makeEntry({ effect: undefined as unknown as RuleEffect }))).toBe(false);
  });

  it("rejects entries with malformed effect", () => {
    expect(isSemanticMappingEntry(makeEntry({ effect: {} as unknown as RuleEffect }))).toBe(false);
  });

  it("rejects entries with invalid source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "" }))).toBe(false);
  });

  it("rejects entries with invalid fingerprint format", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "" }))).toBe(false);
  });

  it("rejects entries with invalid projection", () => {
    expect(isSemanticMappingEntry(makeEntry({ defaultProjection: "invalid-projection" as unknown as SheetProjection }))).toBe(false);
  });

  it("rejects entries with missing reviewer", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedBy: "" }))).toBe(false);
  });

  it("rejects entries with invalid review timestamp", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "not-a-date" }))).toBe(false);
  });

  it("rejects entries with function values", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, extraFn: (() => {}) as unknown as string })).toBe(false);
  });

  it("rejects entries with string mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: "1.0" as unknown as number }))).toBe(false);
  });
});

describe("isSemanticMappingRegistry", () => {
  it("accepts valid registries", () => {
    const registry = createSemanticMappingRegistry([makeEntry()]);
    expect(isSemanticMappingRegistry(registry)).toBe(true);
  });

  it("rejects registries with invalid entries", () => {
    const invalid = { schemaVersion: 2, mappings: [{}] };
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

  it("detects invalid source revision", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ sourceRevision: "" }));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_SOURCE_REVISION", severity: "error" });
  });

  it("detects invalid fingerprint", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ sourceFingerprint: "" }));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_FINGERPRINT", severity: "error" });
  });

  it("detects missing reviewer", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ reviewedBy: "" }));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "MISSING_REVIEWER", severity: "error" });
  });

  it("detects invalid timestamp", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ reviewedAt: "not-a-date" }));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_TIMESTAMP", severity: "error" });
  });

  it("detects invalid projection", () => {
    const diagnostics = validateSemanticMappingEntry(
      makeEntry({ defaultProjection: "invalid-projection" as unknown as SheetProjection }),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_PROJECTION", severity: "error" });
  });

  it("emits multiple diagnostics for compound errors", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({
      sourceRevision: "",
      reviewedBy: "",
      reviewedAt: "not-a-date",
    }));
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map((d) => d.code)).toContain("INVALID_SOURCE_REVISION");
    expect(diagnostics.map((d) => d.code)).toContain("MISSING_REVIEWER");
    expect(diagnostics.map((d) => d.code)).toContain("INVALID_TIMESTAMP");
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
    expect(diagnostics[0]).toMatchObject({ code: "SCHEMA_VERSION_MISMATCH", severity: "error" });
  });

  it("detects duplicate mappings", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry, entry]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "DUPLICATE_MAPPING", severity: "warning" });
  });

  it("aggregates entry-level diagnostics", () => {
    const badEntry = makeEntry({ sourceRevision: "", reviewedBy: "" });
    const registry = createSemanticMappingRegistry([badEntry]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((d) => d.code)).toContain("INVALID_SOURCE_REVISION");
    expect(diagnostics.map((d) => d.code)).toContain("MISSING_REVIEWER");
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
  });
});

describe("isRuleEffect integration", () => {
  it("validates effect payload in entry", () => {
    const effect = makeEffect();
    expect(isRuleEffect(effect)).toBe(true);
    expect(isSemanticMappingEntry(makeEntry({ effect }))).toBe(true);
  });
});
