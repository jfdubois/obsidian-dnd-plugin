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

  it("resolves matching mapping with nested fieldId", () => {
    const entry = makeEntry({ key: makeKey("PHB:fighter", "2014", "movement.walk") });
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2014", "movement.walk"));

    expect(result.mapped).toBe(true);
    expect(result.mappingMethod).toBe("reviewed-mapping");
    expect(result.entry).toBe(entry);
  });

  it("emits UNMAPPED_FIELD for non-matching entity", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:rogue", "2014", "proficiencies"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      severity: "warning",
      entityId: "PHB:rogue",
      fieldId: "proficiencies",
      ruleset: "2014",
    });
  });

  it("emits UNMAPPED_FIELD for non-matching ruleset", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2024", "proficiencies"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      ruleset: "2024",
    });
  });

  it("emits UNMAPPED_FIELD for non-matching fieldId", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, makeKey("PHB:fighter", "2014", "movement.walk"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      fieldId: "movement.walk",
    });
  });

  it("rejects invalid resolution key with INVALID_MAPPING", () => {
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

  it("returns structured mappingMethod for unmapped fields", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, makeKey("PHB:rogue", "2014", "proficiencies"));

    expect(result.mappingMethod).toBe("structured");
  });
});

describe("resolveSemanticMappings", () => {
  it("resolves multiple inputs correctly", () => {
    const entry1 = makeEntry();
    const entry2 = makeEntry({ key: makeKey("PHB:barbarian", "2014", "proficiencies") });
    const registry = createSemanticMappingRegistry([entry1, entry2]);

    const result = resolveSemanticMappings(registry, [
      { key: entry1.key },
      { key: entry2.key },
      { key: makeKey("PHB:rogue", "2014", "proficiencies") },
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

  it("distinguishes same entity different fields", () => {
    const entry1 = makeEntry({ key: makeKey("PHB:fighter", "2014", "proficiencies") });
    const entry2 = makeEntry({ key: makeKey("PHB:fighter", "2014", "movement.walk") });
    const registry = createSemanticMappingRegistry([entry1, entry2]);

    const result = resolveSemanticMappings(registry, [
      { key: makeKey("PHB:fighter", "2014", "proficiencies") },
      { key: makeKey("PHB:fighter", "2014", "movement.walk") },
      { key: makeKey("PHB:fighter", "2014", "senses.darkvision") },
    ]);

    expect(result.mappedCount).toBe(2);
    expect(result.unmappedCount).toBe(1);
    expect(result.allDiagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      fieldId: "senses.darkvision",
    });
  });
});
