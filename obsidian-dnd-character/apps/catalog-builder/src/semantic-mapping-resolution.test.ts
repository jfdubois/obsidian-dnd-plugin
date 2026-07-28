import { describe, expect, it } from "vitest";
import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import {
  createAddAbilityEffect,
  createAddCapabilityEffect,
  createAddImmunityEffect,
  createConditionalRollModeEffect,
  createSetMovementEffect,
  createRuleEffectMetadata,
  createEffectPresentation,
  createEffectOrigin,
  createDamageImmunity,
  createNoBreathingRequiredCapability,
  createAbilityRollPredicate,
  createSkillRollPredicate,
} from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { SemanticMappingEntry, SemanticMappingKey } from "./semantic-mapping";
import { createSemanticMappingRegistry } from "./semantic-mapping";
import { resolveSemanticMapping, resolveSemanticMappings, type SemanticMappingResolutionContext } from "./semantic-mapping-resolution";
import { computeSourceFingerprint } from "./semantic-mapping-fingerprint";

function mkKey(eid: string, rs: "2014" | "2024" = "2014", fid: string = "proficiencies"): SemanticMappingKey {
  return Object.freeze({ entityId: eid, ruleset: rs, fieldId: fid });
}

function mkEffect(): RuleEffect {
  return createAddAbilityEffect(
    createRuleEffectMetadata("full", createEffectPresentation("abilities", []),
      createEffectOrigin(createEntityId("PHB:fighter"), createSourceId("phb"), "structured")),
    "STR", 1,
  );
}

const REV = "3c5d9d3175ca9637132011c75efd73aad7a2364d";
const TS = "2024-01-01T00:00:00.000Z";

function mkEntry(ov: Partial<SemanticMappingEntry> = {}): SemanticMappingEntry {
  return Object.freeze({
    key: mkKey("PHB:fighter"), mappingVersion: 1, sourceRevision: REV,
    effect: mkEffect(), reviewedBy: "test", reviewedAt: TS, ...ov,
  });
}

function mkCtx(ov: Partial<SemanticMappingResolutionContext> = {}): SemanticMappingResolutionContext {
  return { pinnedRevision: REV, ...ov };
}

describe("mandatory context", () => {
  it("no context fails with INVALID_MAPPING", () => {
    const reg = createSemanticMappingRegistry([mkEntry()]);
    // @ts-expect-error — context is required
    const r = resolveSemanticMapping(reg, mkKey("PHB:fighter"), undefined);
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("malformed pinned revision fails with INVALID_MAPPING", () => {
    const reg = createSemanticMappingRegistry([mkEntry()]);
    const r = resolveSemanticMapping(reg, mkKey("PHB:fighter"), { pinnedRevision: "bad" });
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("matching revision succeeds", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx());
    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(e.effect);
    expect(r.materializedEffect).not.toBe(e.effect);
    expect(r.mappingKey).toEqual(e.key);
    expect(r.mappingVersion).toBe(e.mappingVersion);
    expect(r.reviewedBy).toBe(e.reviewedBy);
    expect(r.reviewedAt).toBe(e.reviewedAt);
    expect(r.sourceRevision).toBe(e.sourceRevision);
    expect(r.effectOrigin).toEqual(e.effect.origin);
    expect(r.diagnostics).toEqual([]);
  });

  it("changed revision emits STALE_MAPPING", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, { pinnedRevision: "0".repeat(40) });
    expect(r.mapped).toBe(false);
    expect(r.materializedEffect).toBeUndefined();
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({
      code: "STALE_MAPPING", severity: "error",
      entityId: "PHB:fighter", fieldId: "proficiencies", ruleset: "2014",
    });
  });

  it("stale resolution returns no entry", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, { pinnedRevision: "0".repeat(40) });
    expect(r.mapped).toBe(false);
    expect(r.materializedEffect).toBeUndefined();
  });
});

describe("fingerprint enforcement", () => {
  it("matching source input succeeds", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: src }));
    expect(r.mapped).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it("changed source input emits STALE_MAPPING", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: { name: "rogue" } }));
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "STALE_MAPPING", severity: "error" });
  });

  it("missing source input emits INVALID_MAPPING", () => {
    const fp = computeSourceFingerprint({ name: "fighter" });
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx());
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("invalid source input emits INVALID_MAPPING", () => {
    const e = mkEntry({ sourceFingerprint: "a".repeat(64) });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: { bad: NaN } }));
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("fingerprint is computed internally", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: src }));
    expect(r.mapped).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it("caller cannot bypass with arbitrary hash", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, {
      pinnedRevision: REV,
      sourceInput: { name: "rogue" },
    });
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "STALE_MAPPING" });
  });
});

describe("batch per-input context", () => {
  it("each input uses its own revision", () => {
    const e1 = mkEntry({ sourceRevision: "a".repeat(40) });
    const e2 = mkEntry({ key: mkKey("PHB:barbarian"), sourceRevision: "b".repeat(40) });
    const reg = createSemanticMappingRegistry([e1, e2]);
    const r = resolveSemanticMappings(reg, [
      { key: e1.key, context: { pinnedRevision: "a".repeat(40) } },
      { key: e2.key, context: { pinnedRevision: "b".repeat(40) } },
    ]);
    expect(r.mappedCount).toBe(2);
    expect(r.unmappedCount).toBe(0);
  });

  it("each input uses its own source input", () => {
    const s1 = { name: "fighter" };
    const s2 = { name: "barbarian" };
    const e1 = mkEntry({ sourceFingerprint: computeSourceFingerprint(s1) });
    const e2 = mkEntry({
      key: mkKey("PHB:barbarian"),
      sourceFingerprint: computeSourceFingerprint(s2),
    });
    const reg = createSemanticMappingRegistry([e1, e2]);
    const r = resolveSemanticMappings(reg, [
      { key: e1.key, context: { pinnedRevision: REV, sourceInput: s1 } },
      { key: e2.key, context: { pinnedRevision: REV, sourceInput: s2 } },
    ]);
    expect(r.mappedCount).toBe(2);
  });

  it("one stale does not alter another result", () => {
    const e1 = mkEntry();
    const e2 = mkEntry({ key: mkKey("PHB:barbarian") });
    const reg = createSemanticMappingRegistry([e1, e2]);
    const r = resolveSemanticMappings(reg, [
      { key: e1.key, context: { pinnedRevision: "0".repeat(40) } },
      { key: e2.key, context: { pinnedRevision: REV } },
    ]);
    expect(r.mappedCount).toBe(1);
    expect(r.unmappedCount).toBe(1);
    expect(r.results[0]!.mapped).toBe(false);
    expect(r.results[1]!.mapped).toBe(true);
  });

  it("counts remain correct", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMappings(reg, [
      { key: e.key, context: { pinnedRevision: REV } },
      { key: mkKey("PHB:rogue"), context: { pinnedRevision: REV } },
      { key: e.key, context: { pinnedRevision: "0".repeat(40) } },
    ]);
    expect(r.mappedCount).toBe(1);
    expect(r.unmappedCount).toBe(2);
    expect(r.results).toHaveLength(3);
  });
});

describe("key validation", () => {
  it("rejects invalid key with INVALID_MAPPING", () => {
    const reg = createSemanticMappingRegistry([]);
    const r = resolveSemanticMapping(reg, {} as SemanticMappingKey, mkCtx());
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING" });
  });

  it("emits UNMAPPED_FIELD for unmatched entity", () => {
    const reg = createSemanticMappingRegistry([mkEntry()]);
    const r = resolveSemanticMapping(reg, mkKey("PHB:rogue"), mkCtx());
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "UNMAPPED_FIELD", severity: "warning" });
  });

  it("malformed mapping emits INVALID_MAPPING", () => {
    const bad = {
      key: mkKey("PHB:fighter"), mappingVersion: 1, sourceRevision: "INVALID",
      effect: mkEffect(), reviewedBy: "test", reviewedAt: TS,
    } as SemanticMappingEntry;
    const reg = createSemanticMappingRegistry([bad]);
    const r = resolveSemanticMapping(reg, bad.key, mkCtx());
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING" });
  });
});

describe("diagnostics", () => {
  it("STALE_MAPPING includes revision details", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, {
      pinnedRevision: "0".repeat(40), entityKind: "class", sourcePath: "data/classes/PHB.json",
    });
    const d = r.diagnostics[0];
    expect(d?.code).toBe("STALE_MAPPING");
    expect(d?.expectedSourceRevision).toBe(REV);
    expect(d?.actualPinnedRevision).toBe("0".repeat(40));
    expect(d?.entityKind).toBe("class");
    expect(d?.sourcePath).toBe("data/classes/PHB.json");
    expect(d?.mappingVersion).toBe(1);
  });

  it("STALE_MAPPING fingerprint includes fingerprint details", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, {
      pinnedRevision: REV, sourceInput: { name: "rogue" },
    });
    const d = r.diagnostics[0];
    expect(d?.code).toBe("STALE_MAPPING");
    expect(d?.expectedSourceFingerprint).toBe(fp);
    expect(d?.actualSourceFingerprint).toBeDefined();
    expect(d?.actualSourceFingerprint).not.toBe(fp);
  });
});

describe("null source input resolution", () => {
  it("null source input resolves when fingerprint matches", () => {
    const fp = computeSourceFingerprint(null);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: null }));
    expect(r.mapped).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it("undefined source input emits INVALID_MAPPING", () => {
    const fp = computeSourceFingerprint({ name: "fighter" });
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: undefined }));
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_MAPPING", severity: "error" });
  });

  it("null vs non-null source input emits STALE_MAPPING", () => {
    const fp = computeSourceFingerprint(null);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: { name: "fighter" } }));
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "STALE_MAPPING", severity: "error" });
  });

  it("non-null vs null source input emits STALE_MAPPING", () => {
    const fp = computeSourceFingerprint({ name: "fighter" });
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, mkCtx({ sourceInput: null }));
    expect(r.mapped).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: "STALE_MAPPING", severity: "error" });
  });
});

describe("immutability", () => {
  it("registry and entry unchanged", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    resolveSemanticMapping(reg, e.key, { pinnedRevision: "0".repeat(40) });
    expect(reg.mappings[0]).toBe(e);
    expect(e.sourceRevision).toBe(REV);
  });

  it("source input and key unchanged", () => {
    const src = { name: "fighter" };
    const fp = computeSourceFingerprint(src);
    const e = mkEntry({ sourceFingerprint: fp });
    const reg = createSemanticMappingRegistry([e]);
    const key = mkKey("PHB:fighter");
    const input = { ...src };
    resolveSemanticMapping(reg, key, mkCtx({ sourceInput: input }));
    expect(input).toEqual(src);
    expect(key.entityId).toBe("PHB:fighter");
  });

  it("returned result and diagnostics frozen", () => {
    const e = mkEntry();
    const reg = createSemanticMappingRegistry([e]);
    const r = resolveSemanticMapping(reg, e.key, { pinnedRevision: "0".repeat(40) });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.diagnostics)).toBe(true);
    if (r.diagnostics.length > 0) {
      expect(Object.isFrozen(r.diagnostics[0])).toBe(true);
    }
  });

  it("batch result frozen", () => {
    const reg = createSemanticMappingRegistry([]);
    const r = resolveSemanticMappings(reg, []);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.results)).toBe(true);
    expect(Object.isFrozen(r.allDiagnostics)).toBe(true);
  });
});

describe("materialized effect", () => {
  function mkMetadata(): ReturnType<typeof createRuleEffectMetadata> {
    return createRuleEffectMetadata(
      "full",
      createEffectPresentation("abilities", []),
      createEffectOrigin(createEntityId("PHB:fighter"), createSourceId("phb"), "structured"),
    );
  }

  it("capability effect is deep-cloned and validated", () => {
    const capability = createNoBreathingRequiredCapability();
    const effect = createAddCapabilityEffect(mkMetadata(), capability);
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(effect);
    expect(r.materializedEffect).not.toBe(effect);
    expect(r.materializedEffect?.type).toBe("add-capability");
    expect(r.materializedEffect).toHaveProperty("origin.entityId");
    expect(r.effectOrigin).toEqual(effect.origin);
  });

  it("immunity effect is deep-cloned and validated", () => {
    const immunity = createDamageImmunity("fire");
    const effect = createAddImmunityEffect(mkMetadata(), immunity);
    const entry = Object.freeze({
      key: mkKey("PHB:fire-elemental"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(effect);
    expect(r.materializedEffect).not.toBe(effect);
    expect(r.materializedEffect?.type).toBe("add-immunity");
    expect(r.effectOrigin).toEqual(effect.origin);
  });

  it("conditional roll effect is deep-cloned and validated", () => {
    const predicate = createAbilityRollPredicate("STR");
    const effect = createConditionalRollModeEffect(mkMetadata(), "ability-check", "advantage", predicate);
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(effect);
    expect(r.materializedEffect).not.toBe(effect);
    expect(r.materializedEffect?.type).toBe("conditional-roll-mode");
    expect(r.effectOrigin).toEqual(effect.origin);
  });

  it("movement effect is deep-cloned and validated", () => {
    const effect = createSetMovementEffect(mkMetadata(), "walk", 30);
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(effect);
    expect(r.materializedEffect).not.toBe(effect);
    expect(r.materializedEffect?.type).toBe("set-movement");
    expect(r.effectOrigin).toEqual(effect.origin);
  });

  it("materialized effect does not share mutable structures with registry", () => {
    const effect = createAddCapabilityEffect(mkMetadata(), createNoBreathingRequiredCapability());
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    // Origin is deep-cloned, not the same reference
    expect(r.materializedEffect?.origin).not.toBe(effect.origin);
    // Presentation is deep-cloned
    expect(r.materializedEffect?.presentation).not.toBe(effect.presentation);
    // Registry entry remains unchanged
    expect(reg.mappings[0]?.effect).toBe(effect);
    expect(reg.mappings[0]?.effect).toEqual(effect);
  });

  it("materialized effect includes all provenance fields", () => {
    const effect = createAddAbilityEffect(
      mkMetadata(),
      "STR",
      1,
    );
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 3,
      sourceRevision: REV,
      effect,
      reviewedBy: "reviewer-1",
      reviewedAt: "2025-06-15T10:00:00.000Z",
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.mappingKey).toEqual(entry.key);
    expect(r.mappingVersion).toBe(3);
    expect(r.reviewedBy).toBe("reviewer-1");
    expect(r.reviewedAt).toBe("2025-06-15T10:00:00.000Z");
    expect(r.sourceRevision).toBe(REV);
    expect(r.sourceFingerprint).toBeUndefined();
    expect(r.effectOrigin).toEqual(effect.origin);
  });

  it("unmapped result has no materialized effect", () => {
    const reg = createSemanticMappingRegistry([]);
    const r = resolveSemanticMapping(reg, mkKey("PHB:rogue"), mkCtx());

    expect(r.mapped).toBe(false);
    expect(r.materializedEffect).toBeUndefined();
    expect(r.mappingKey).toBeUndefined();
    expect(r.mappingVersion).toBeUndefined();
    expect(r.effectOrigin).toBeUndefined();
  });

  it("stale mapping has no materialized effect", () => {
    const effect = createAddImmunityEffect(mkMetadata(), createDamageImmunity("cold"));
    const entry = Object.freeze({
      key: mkKey("PHB:ice-elemental"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, { pinnedRevision: "0".repeat(40) });

    expect(r.mapped).toBe(false);
    expect(r.materializedEffect).toBeUndefined();
  });

  it("skill roll predicate in conditional effect is deep-cloned", () => {
    const predicate = createSkillRollPredicate(createEntityId("PHB:athletics"));
    const effect = createConditionalRollModeEffect(mkMetadata(), "skill-check", "disadvantage", predicate);
    const entry = Object.freeze({
      key: mkKey("PHB:fighter"),
      mappingVersion: 1,
      sourceRevision: REV,
      effect,
      reviewedBy: "test",
      reviewedAt: TS,
    } as SemanticMappingEntry);
    const reg = createSemanticMappingRegistry([entry]);
    const r = resolveSemanticMapping(reg, entry.key, mkCtx());

    expect(r.mapped).toBe(true);
    expect(r.materializedEffect).toEqual(effect);
    expect(r.materializedEffect).not.toBe(effect);
    // Nested predicate is also deep-cloned
    const cloned = r.materializedEffect as typeof effect;
    expect(cloned.predicate).not.toBe(effect.predicate);
    expect(cloned.predicate).toEqual(effect.predicate);
  });
});
