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
  type StaleCheckContext,
} from "./semantic-mapping-resolution";
import { computeSourceFingerprint } from "./semantic-mapping-fingerprint";

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

  it("emits INVALID_MAPPING for key with extra property", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, {
      entityId: "PHB:fighter",
      ruleset: "2014",
      fieldId: "proficiencies",
      extra: "bad",
    } as SemanticMappingKey);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("emits INVALID_MAPPING for padded field ID", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, {
      entityId: "PHB:fighter",
      ruleset: "2014",
      fieldId: " proficiencies ",
    } as SemanticMappingKey);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("emits INVALID_MAPPING for whitespace-only entity ID", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, {
      entityId: "   ",
      ruleset: "2014",
      fieldId: "proficiencies",
    } as SemanticMappingKey);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("emits UNMAPPED_FIELD for valid unmatched key", () => {
    const registry = createSemanticMappingRegistry([]);
    const result = resolveSemanticMapping(registry, makeKey("PHB:rogue", "2014", "proficiencies"));

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNMAPPED_FIELD",
      severity: "warning",
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

  it("passes staleCheck through to individual resolutions", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
    };

    const result = resolveSemanticMappings(registry, [{ key: entry.key }], staleCheck);

    expect(result.mappedCount).toBe(0);
    expect(result.allDiagnostics[0]).toMatchObject({
      code: "STALE_MAPPING",
      severity: "error",
    });
  });
});

describe("resolveSemanticMapping — stale detection", () => {
  it("matching revision resolves successfully", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(true);
    expect(result.entry).toBe(entry);
    expect(result.diagnostics).toEqual([]);
  });

  it("changed revision emits STALE_MAPPING", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(false);
    expect(result.entry).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "STALE_MAPPING",
      severity: "error",
      entityId: "PHB:fighter",
      fieldId: "proficiencies",
      ruleset: "2014",
    });
  });

  it("STALE_MAPPING diagnostic includes revision details", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
      entityKind: "class",
      sourcePath: "data/classes/PHB.json",
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    const diag = result.diagnostics[0];
    expect(diag?.code).toBe("STALE_MAPPING");
    expect(diag?.expectedSourceRevision).toBe(VALID_REVISION);
    expect(diag?.actualPinnedRevision).toBe("0000000000000000000000000000000000000000");
    expect(diag?.entityKind).toBe("class");
    expect(diag?.sourcePath).toBe("data/classes/PHB.json");
    expect(diag?.mappingVersion).toBe(1);
  });

  it("matching fingerprint resolves successfully", () => {
    const sourceData = { name: "fighter", source: "PHB", level: 1 };
    const fingerprint = computeSourceFingerprint(sourceData);
    const entry = makeEntry({ sourceFingerprint: fingerprint });
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
      sourceFingerprint: fingerprint,
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(true);
    expect(result.entry).toBe(entry);
    expect(result.diagnostics).toEqual([]);
  });

  it("changed fingerprint emits STALE_MAPPING", () => {
    const entry = makeEntry({
      sourceFingerprint: "a".repeat(64),
    });
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
      sourceFingerprint: "b".repeat(64),
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(false);
    expect(result.entry).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "STALE_MAPPING",
      severity: "error",
    });
  });

  it("STALE_MAPPING fingerprint diagnostic includes fingerprint details", () => {
    const entry = makeEntry({
      sourceFingerprint: "a".repeat(64),
    });
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
      sourceFingerprint: "b".repeat(64),
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    const diag = result.diagnostics[0];
    expect(diag?.code).toBe("STALE_MAPPING");
    expect(diag?.expectedSourceFingerprint).toBe("a".repeat(64));
    expect(diag?.actualSourceFingerprint).toBe("b".repeat(64));
  });

  it("fingerprint check is skipped when entry has no fingerprint", () => {
    const entry = makeEntry(); // no sourceFingerprint
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
      sourceFingerprint: "b".repeat(64),
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("fingerprint check is skipped when staleCheck has no fingerprint", () => {
    const entry = makeEntry({
      sourceFingerprint: "a".repeat(64),
    });
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: VALID_REVISION,
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("stale mapping never emits an effect (entry is undefined in result)", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(false);
    expect(result.entry).toBeUndefined();
  });

  it("backward compatible: no staleCheck skips stale checks", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);

    const result = resolveSemanticMapping(registry, entry.key);

    expect(result.mapped).toBe(true);
    expect(result.entry).toBe(entry);
    expect(result.diagnostics).toEqual([]);
  });

  it("input mapping and source data remain unchanged (immutability)", () => {
    const entry = makeEntry();
    const registry = createSemanticMappingRegistry([entry]);
    const key = makeKey("PHB:fighter", "2014", "proficiencies");
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
    };

    // Capture pre-resolution state
    const entryRevisionBefore = entry.sourceRevision;
    const keyEntityBefore = key.entityId;

    resolveSemanticMapping(registry, key, staleCheck);

    // Verify nothing was mutated
    expect(entry.sourceRevision).toBe(entryRevisionBefore);
    expect(key.entityId).toBe(keyEntityBefore);
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("malformed mapping emits INVALID_MAPPING", () => {
    // Create an entry that fails validation by having an invalid source revision
    const badEntry = {
      key: makeKey("PHB:fighter", "2014", "proficiencies"),
      mappingVersion: 1,
      sourceRevision: "INVALID_REV", // not 40 hex chars
      effect: makeEffect(),
      reviewedBy: "test-reviewer",
      reviewedAt: VALID_TIMESTAMP,
    } as SemanticMappingEntry;
    const registry = createSemanticMappingRegistry([badEntry]);

    const result = resolveSemanticMapping(registry, badEntry.key);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MAPPING",
      severity: "error",
    });
  });

  it("revision check takes priority over fingerprint check", () => {
    const sourceData = { name: "fighter", source: "PHB" };
    const fingerprint = computeSourceFingerprint(sourceData);
    const entry = makeEntry({ sourceFingerprint: fingerprint });
    const registry = createSemanticMappingRegistry([entry]);
    const staleCheck: StaleCheckContext = {
      pinnedRevision: "0000000000000000000000000000000000000000",
      sourceFingerprint: fingerprint, // fingerprint matches but revision doesn't
    };

    const result = resolveSemanticMapping(registry, entry.key, staleCheck);

    expect(result.mapped).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: "STALE_MAPPING",
    });
    // The diagnostic should mention revision mismatch, not fingerprint
    expect(result.diagnostics[0]?.message).toContain("source revision");
  });
});
