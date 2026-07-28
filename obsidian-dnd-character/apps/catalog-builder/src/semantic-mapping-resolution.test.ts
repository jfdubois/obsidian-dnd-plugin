import { describe, expect, it } from "vitest";
import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import {
  createAddAbilityEffect,
  createRuleEffectMetadata,
  createEffectPresentation,
  createEffectOrigin,
} from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
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

describe("resolveSemanticMapping", () => {
  it("resolves a matching mapping", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, entry.key);

    expect(result.mapped).toBe(true);
    expect(result.mappingMethod).toBe("reviewed-mapping");
    expect(result.entry).toBe(entry);
    expect(result.diagnostics).toEqual([]);
  });

  it("returns unmapped diagnostic for non-matching key", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:rogue", "2014"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "warning",
    });
  });

  it("returns unmapped diagnostic for non-matching ruleset", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2024"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      ruleset: "2024",
    });
  });

  it("rejects invalid resolution key", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, {} as SemanticMappingKey);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("returns frozen results", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const result = resolveSemanticMapping(registry, entry.key);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });
});

describe("resolveSemanticMappings", () => {
  it("resolves multiple inputs correctly", () => {
    const entry1 = makeEntry();
    const entry2 = makeEntry({ key: makeKey("PHB:barbarian", "2014") });
    const registry = createSemanticMappingRegistry([entry1, entry2]);

    const result = resolveSemanticMappings(registry, [
      { key: entry1.key },
      { key: entry2.key },
      { key: makeKey("PHB:rogue", "2014") },
    ]);

    expect(result.mappedCount).toBe(2);
    expect(result.unmappedCount).toBe(1);
    expect(result.results).toHaveLength(3);
    expect(result.allDiagnostics).toHaveLength(1);
    expect(result.allDiagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
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
