import { describe, expect, it } from "vitest";
import type { SemanticMappingEntry, SemanticMappingKey } from "./semantic-mapping";
import {
  createSemanticMappingRegistry,
} from "./semantic-mapping";
import {
  resolveSemanticMapping,
  resolveSemanticMappings,
} from "./semantic-mapping-resolution";

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

describe("resolveSemanticMapping", () => {
  it("resolves a matching mapping", () => {
    const entry = makeEntry({ rawField: "proficiencies" });
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, entry.key, "proficiencies");

    expect(result.mapped).toBe(true);
    expect(result.mappingMethod).toBe("reviewed-mapping");
    expect(result.entry).toBe(entry);
    expect(result.diagnostics).toEqual([]);
  });

  it("returns unmapped diagnostic for non-matching field", () => {
    const entry = makeEntry({ rawField: "proficiencies" });
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, entry.key, "abilities");

    expect(result.mapped).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      severity: "warning",
      rawField: "abilities",
    });
  });

  it("returns unmapped diagnostic for non-matching ruleset", () => {
    const entry = makeEntry({ rawField: "proficiencies" });
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2024"), "proficiencies");

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      ruleset: "2024",
    });
  });

  it("rejects invalid resolution key", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, {} as SemanticMappingKey, "field");

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("rejects empty raw field", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2014"), "");

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("returns frozen results", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const result = resolveSemanticMapping(registry, entry.key, entry.rawField);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });
});

describe("resolveSemanticMappings", () => {
  it("resolves multiple inputs correctly", () => {
    const entry1 = makeEntry({ rawField: "proficiencies" });
    const entry2 = makeEntry({ rawField: "movement", key: makeKey("PHB:barbarian", "2014") });
    const registry = createSemanticMappingRegistry([entry1, entry2]);

    const result = resolveSemanticMappings(registry, [
      { key: entry1.key, rawField: "proficiencies" },
      { key: entry2.key, rawField: "movement" },
      { key: makeKey("PHB:rogue", "2014"), rawField: "stealth" },
    ]);

    expect(result.mappedCount).toBe(2);
    expect(result.unmappedCount).toBe(1);
    expect(result.results).toHaveLength(3);
    expect(result.allDiagnostics).toHaveLength(1);
    expect(result.allDiagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
    });
  });

  it("returns frozen batch results", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMappings(registry, []);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.results)).toBe(true);
    expect(Object.isFrozen(result.allDiagnostics)).toBe(true);
  });
});
