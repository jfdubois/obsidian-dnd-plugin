import { describe, expect, it } from "vitest";
import type { RuleEffect, SheetProjection } from "@obsidian-dnd/catalog-contract";
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
  isSemanticMappingKey,
  isSemanticMappingEntry,
  isSemanticMappingRegistry,
} from "./semantic-mapping";

function makeKey(entityId: string, ruleset: "2014" | "2024", fieldId: string = "proficiencies"): SemanticMappingKey {
  return Object.freeze({ entityId, ruleset, fieldId });
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

const VALID_REVISION = "3c5d9d3175ca9637132011c75efd73aad7a2364d";
const VALID_FINGERPRINT = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const VALID_TIMESTAMP = "2024-01-01T00:00:00.000Z";

function makeEntry(overrides: Partial<SemanticMappingEntry> = {}): SemanticMappingEntry {
  return Object.freeze({
    key: makeKey("PHB:fighter", "2014", "proficiencies"),
    mappingVersion: 1,
    sourceRevision: VALID_REVISION,
    effect: makeEffect(),
    reviewedBy: "test-reviewer",
    reviewedAt: VALID_TIMESTAMP,
    ...overrides,
  });
}

/* ── Schema version ─────────────────────────────────────────────── */

describe("SEMANTIC_MAPPING_SCHEMA_VERSION", () => {
  it("is set to 2", () => {
    expect(SEMANTIC_MAPPING_SCHEMA_VERSION).toBe(2);
  });
});

/* ── Key guard ──────────────────────────────────────────────────── */

describe("isSemanticMappingKey", () => {
  it("accepts valid keys with fieldId", () => {
    expect(isSemanticMappingKey(makeKey("PHB:fighter", "2014", "proficiencies"))).toBe(true);
    expect(isSemanticMappingKey(makeKey("XPHB:fighter", "2024", "movement.walk"))).toBe(true);
    expect(isSemanticMappingKey(makeKey("PHB:elf", "2014", "senses.darkvision"))).toBe(true);
  });

  it("rejects keys with empty entity ID", () => {
    expect(isSemanticMappingKey({ entityId: "", ruleset: "2014", fieldId: "proficiencies" })).toBe(false);
  });

  it("rejects keys with empty fieldId", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2014", fieldId: "" })).toBe(false);
  });

  it("rejects keys with missing fieldId", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2014" })).toBe(false);
  });

  it("rejects keys with invalid ruleset", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2020" as unknown as Parameters<typeof isSemanticMappingKey>[0], fieldId: "proficiencies" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isSemanticMappingKey(null)).toBe(false);
    expect(isSemanticMappingKey(undefined)).toBe(false);
    expect(isSemanticMappingKey("PHB:fighter")).toBe(false);
  });

  it("rejects keys with extra property", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2014", fieldId: "proficiencies", extra: "bad" })).toBe(false);
  });

  it("rejects whitespace-only entity ID", () => {
    expect(isSemanticMappingKey({ entityId: "   ", ruleset: "2014", fieldId: "proficiencies" })).toBe(false);
  });

  it("rejects whitespace-only field ID", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2014", fieldId: "   " })).toBe(false);
  });

  it("rejects padded entity ID", () => {
    expect(isSemanticMappingKey({ entityId: " PHB:fighter ", ruleset: "2014", fieldId: "proficiencies" })).toBe(false);
  });

  it("rejects padded field ID", () => {
    expect(isSemanticMappingKey({ entityId: "PHB:fighter", ruleset: "2014", fieldId: " proficiencies " })).toBe(false);
  });

  it("rejects accessor", () => {
    const obj = { entityId: "PHB:fighter", ruleset: "2014" as const, fieldId: "proficiencies" };
    Object.defineProperty(obj, "entityId", { get: () => "PHB:fighter", enumerable: true, configurable: true });
    expect(isSemanticMappingKey(obj)).toBe(false);
  });

  it("rejects array", () => {
    expect(isSemanticMappingKey(["PHB:fighter", "2014", "proficiencies"])).toBe(false);
  });

  it("rejects non-plain object", () => {
    class CustomKey {
      entityId = "PHB:fighter";
      ruleset = "2014" as const;
      fieldId = "proficiencies";
    }
    expect(isSemanticMappingKey(new CustomKey())).toBe(false);
  });
});

/* ── Entry guard ────────────────────────────────────────────────── */

describe("isSemanticMappingEntry", () => {
  it("accepts valid entries", () => {
    expect(isSemanticMappingEntry(makeEntry())).toBe(true);
  });

  it("accepts entries with optional fields omitted", () => {
    const entry = makeEntry({ sourceFingerprint: undefined, defaultProjection: undefined });
    expect(isSemanticMappingEntry(entry)).toBe(true);
  });

  it("accepts entries with valid optional fields", () => {
    const entry = makeEntry({ sourceFingerprint: VALID_FINGERPRINT, defaultProjection: "abilities" });
    expect(isSemanticMappingEntry(entry)).toBe(true);
  });

  /* ── Source revision rejection ─────────────────────────────── */

  it("rejects entries with empty source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "" }))).toBe(false);
  });

  it("rejects entries with short source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "abc123" }))).toBe(false);
  });

  it("rejects entries with uppercase source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "3C5D9D3175CA9637132011C75EFD73AAD7A2364D" }))).toBe(false);
  });

  it("rejects entries with non-hex source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "3c5d9d3175ca9637132011c75efd73aad7a2364g" }))).toBe(false);
  });

  it("rejects entries with whitespace-padded source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: ` ${VALID_REVISION} ` }))).toBe(false);
  });

  it("rejects entries with branch name as source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "main" }))).toBe(false);
  });

  it("rejects entries with tag as source revision", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceRevision: "v1.0.0" }))).toBe(false);
  });

  /* ── Fingerprint rejection ─────────────────────────────────── */

  it("rejects entries with empty fingerprint", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "" }))).toBe(false);
  });

  it("rejects entries with short fingerprint", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "abc123" }))).toBe(false);
  });

  it("rejects entries with uppercase fingerprint", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2" }))).toBe(false);
  });

  it("rejects entries with non-hex fingerprint", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1bg" }))).toBe(false);
  });

  it("rejects entries with descriptive fingerprint like fp-123", () => {
    expect(isSemanticMappingEntry(makeEntry({ sourceFingerprint: "fp-123" }))).toBe(false);
  });

  /* ── Mapping version rejection ─────────────────────────────── */

  it("rejects entries with string mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: "1.0" as unknown as number }))).toBe(false);
  });

  it("rejects entries with zero mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: 0 }))).toBe(false);
  });

  it("rejects entries with negative mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: -1 }))).toBe(false);
  });

  it("rejects entries with fractional mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: 1.5 }))).toBe(false);
  });

  it("rejects entries with NaN mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: NaN }))).toBe(false);
  });

  it("rejects entries with Infinity mappingVersion", () => {
    expect(isSemanticMappingEntry(makeEntry({ mappingVersion: Infinity }))).toBe(false);
  });

  /* ── Timestamp rejection ───────────────────────────────────── */

  it("rejects entries with malformed timestamp", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "not-a-date" }))).toBe(false);
  });

  it("rejects entries with date-only timestamp", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "2024-01-01" }))).toBe(false);
  });

  it("rejects entries with missing milliseconds", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "2024-01-01T00:00:00Z" }))).toBe(false);
  });

  it("rejects entries with timezone offset", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "2024-01-01T00:00:00.000+05:00" }))).toBe(false);
  });

  it("rejects entries with impossible date", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "2024-02-30T00:00:00.000Z" }))).toBe(false);
  });

  it("rejects entries with normalized overflow date", () => {
    // Feb 30 normalizes to Mar 1, so toISOString won't match
    expect(isSemanticMappingEntry(makeEntry({ reviewedAt: "2024-02-30T00:00:00.000Z" }))).toBe(false);
  });

  /* ── Reviewer rejection ────────────────────────────────────── */

  it("rejects entries with empty reviewer", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedBy: "" }))).toBe(false);
  });

  it("rejects entries with whitespace-only reviewer", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedBy: "   " }))).toBe(false);
  });

  it("rejects entries with leading whitespace in reviewer", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedBy: " test-reviewer" }))).toBe(false);
  });

  it("rejects entries with trailing whitespace in reviewer", () => {
    expect(isSemanticMappingEntry(makeEntry({ reviewedBy: "test-reviewer " }))).toBe(false);
  });

  /* ── Effect rejection ──────────────────────────────────────── */

  it("rejects entries with missing effect", () => {
    expect(isSemanticMappingEntry(makeEntry({ effect: undefined as unknown as RuleEffect }))).toBe(false);
  });

  it("rejects entries with malformed effect", () => {
    expect(isSemanticMappingEntry(makeEntry({ effect: {} as unknown as RuleEffect }))).toBe(false);
  });

  /* ── Projection rejection ──────────────────────────────────── */

  it("rejects entries with invalid projection", () => {
    expect(isSemanticMappingEntry(makeEntry({ defaultProjection: "invalid-projection" as unknown as SheetProjection }))).toBe(false);
  });

  /* ── Executable content rejection ──────────────────────────── */

  it("rejects entries with function values", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, extraFn: (() => {}) as unknown as string })).toBe(false);
  });

  it("rejects entries with nested function", () => {
    const entry = makeEntry();
    const nested = { deep: { fn: () => {} } };
    expect(isSemanticMappingEntry({ ...entry, nested })).toBe(false);
  });

  it("rejects entries with function in array", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, arr: [1, () => {}, 3] })).toBe(false);
  });

  it("rejects entries with symbol", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, sym: Symbol("test") })).toBe(false);
  });

  it("rejects entries with bigint", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, big: BigInt(42) })).toBe(false);
  });

  it("rejects entries with getter/setter", () => {
    const entry = makeEntry();
    const objWithAccessor = { get accessor() { return 1; } };
    expect(isSemanticMappingEntry({ ...entry, acc: objWithAccessor })).toBe(false);
  });

  it("rejects entries with non-plain object", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, date: new Date() })).toBe(false);
  });

  /* ── Unknown property rejection ────────────────────────────── */

  it("rejects entries with unknown top-level property", () => {
    const entry = makeEntry();
    expect(isSemanticMappingEntry({ ...entry, unknownField: "value" })).toBe(false);
  });

  /* ── Type/payload mismatch ─────────────────────────────────── */

  it("rejects entries with type/payload mismatch", () => {
    const badEffect = {
      automationStatus: "full",
      presentation: { primary: "abilities", secondary: [] },
      origin: { entityId: "PHB:fighter", sourceId: "phb", method: "structured" },
      type: "add-ability",
      ability: "INVALID_ABILITY",
      value: 1,
    };
    expect(isSemanticMappingEntry(makeEntry({ effect: badEffect as unknown as RuleEffect }))).toBe(false);
  });
});

/* ── Registry guard ─────────────────────────────────────────────── */

describe("isSemanticMappingRegistry", () => {
  it("accepts valid registries", () => {
    const registry = createSemanticMappingRegistry([makeEntry()]);
    expect(isSemanticMappingRegistry(registry)).toBe(true);
  });

  it("rejects registries with wrong schema version", () => {
    const registry: SemanticMappingRegistry = Object.freeze({
      schemaVersion: 99,
      mappings: Object.freeze([makeEntry()]),
    });
    expect(isSemanticMappingRegistry(registry)).toBe(false);
  });

  it("rejects registries with invalid entries", () => {
    const invalid = { schemaVersion: 2, mappings: [{}] };
    expect(isSemanticMappingRegistry(invalid)).toBe(false);
  });

  it("rejects registries with non-array mappings", () => {
    expect(isSemanticMappingRegistry({ schemaVersion: 2, mappings: "not-an-array" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isSemanticMappingRegistry(null)).toBe(false);
    expect(isSemanticMappingRegistry(undefined)).toBe(false);
  });
});

/* ── Registry factory ───────────────────────────────────────────── */

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

/* ── Entry validation ───────────────────────────────────────────── */

describe("validateSemanticMappingEntry", () => {
  it("returns no diagnostics for valid entries", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry());
    expect(diagnostics).toEqual([]);
  });

  it("returns no diagnostics for valid entry with fingerprint", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ sourceFingerprint: VALID_FINGERPRINT }));
    expect(diagnostics).toEqual([]);
  });

  it("returns no diagnostics for valid entry with projection", () => {
    const diagnostics = validateSemanticMappingEntry(makeEntry({ defaultProjection: "abilities" }));
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

  it("includes fieldId in diagnostics", () => {
    const entry = makeEntry({ key: makeKey("PHB:fighter", "2014", "movement.walk") });
    const diagnostics = validateSemanticMappingEntry({ ...entry, sourceRevision: "" });
    expect(diagnostics[0]).toMatchObject({ fieldId: "movement.walk" });
  });

  /* ── Safety: never throws for unknown input ───────────────── */

  it("does not throw for null", () => {
    expect(() => validateSemanticMappingEntry(null)).not.toThrow();
    const diagnostics = validateSemanticMappingEntry(null);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("does not throw for undefined", () => {
    expect(() => validateSemanticMappingEntry(undefined)).not.toThrow();
    const diagnostics = validateSemanticMappingEntry(undefined);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("does not throw for string primitive", () => {
    expect(() => validateSemanticMappingEntry("not-an-entry")).not.toThrow();
    const diagnostics = validateSemanticMappingEntry("not-an-entry");
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("does not throw for empty object", () => {
    expect(() => validateSemanticMappingEntry({})).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({});
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_MAPPING")).toBe(true);
  });

  it("does not throw for missing key", () => {
    expect(() => validateSemanticMappingEntry({ mappingVersion: 1 })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({ mappingVersion: 1 });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_MAPPING")).toBe(true);
  });

  it("does not throw for malformed key", () => {
    expect(() => validateSemanticMappingEntry({ key: { entityId: "", ruleset: "2014", fieldId: "proficiencies" } })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({ key: { entityId: "", ruleset: "2014", fieldId: "proficiencies" } });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_MAPPING")).toBe(true);
  });

  it("does not throw for key with extra property", () => {
    expect(() => validateSemanticMappingEntry({
      key: { entityId: "PHB:fighter", ruleset: "2014", fieldId: "proficiencies", extra: "bad" },
    })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({
      key: { entityId: "PHB:fighter", ruleset: "2014", fieldId: "proficiencies", extra: "bad" },
    });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_MAPPING")).toBe(true);
  });

  it("does not throw for missing effect", () => {
    expect(() => validateSemanticMappingEntry({
      key: makeKey("PHB:fighter", "2014"),
      mappingVersion: 1,
      sourceRevision: VALID_REVISION,
      reviewedBy: "test-reviewer",
      reviewedAt: VALID_TIMESTAMP,
    })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({
      key: makeKey("PHB:fighter", "2014"),
      mappingVersion: 1,
      sourceRevision: VALID_REVISION,
      reviewedBy: "test-reviewer",
      reviewedAt: VALID_TIMESTAMP,
    });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_EFFECT")).toBe(true);
  });

  it("does not throw for unknown top-level property", () => {
    const entry = makeEntry();
    expect(() => validateSemanticMappingEntry({ ...entry, unknownProp: "value" })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({ ...entry, unknownProp: "value" });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "INVALID_MAPPING")).toBe(true);
  });

  it("does not throw for nested function", () => {
    expect(() => validateSemanticMappingEntry({
      key: makeKey("PHB:fighter", "2014"),
      mappingVersion: 1,
      sourceRevision: VALID_REVISION,
      effect: { type: "add-ability", ability: "STR", value: 1, metadata: { fn: () => {} } },
      reviewedBy: "test-reviewer",
      reviewedAt: VALID_TIMESTAMP,
    })).not.toThrow();
    const diagnostics = validateSemanticMappingEntry({
      key: makeKey("PHB:fighter", "2014"),
      mappingVersion: 1,
      sourceRevision: VALID_REVISION,
      effect: { type: "add-ability", ability: "STR", value: 1, metadata: { fn: () => {} } },
      reviewedBy: "test-reviewer",
      reviewedAt: VALID_TIMESTAMP,
    });
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "EXECUTABLE_CONTENT" || d.code === "INVALID_EFFECT")).toBe(true);
  });
});

/* ── Registry validation ────────────────────────────────────────── */

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

  it("detects duplicate mappings using complete key", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry, entry]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "DUPLICATE_MAPPING", severity: "warning" });
  });

  it("allows same entity different fields", () => {
    const entry1 = makeEntry({ key: makeKey("PHB:fighter", "2014", "proficiencies") });
    const entry2 = makeEntry({ key: makeKey("PHB:fighter", "2014", "movement.walk") });
    const registry = createSemanticMappingRegistry([entry1, entry2]);
    const diagnostics = validateSemanticMappingRegistry(registry);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_MAPPING")).toHaveLength(0);
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

/* ── Effect integration ─────────────────────────────────────────── */

describe("isRuleEffect integration", () => {
  it("validates effect payload in entry", () => {
    const effect = makeEffect();
    expect(isRuleEffect(effect)).toBe(true);
    expect(isSemanticMappingEntry(makeEntry({ effect }))).toBe(true);
  });
});
