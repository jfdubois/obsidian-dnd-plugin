import { describe, expect, it } from "vitest";
import type { CopyResolverContext } from "./copy-resolver";
import {
  materializeCopyWithMods,
  resolveCopyWithMods,
  type CopyModRawRecord,
} from "./mod-copy-resolver";
import type { MaterializationDiagnostic } from "./mod-types";

function makeContext(base: CopyModRawRecord): CopyResolverContext {
  return {
    validatedFiles: {
      "source.json": {
        filePath: "source.json",
        collections: [
          {
            entityKind: "monster",
            recordCount: 1,
            records: [base],
          },
        ],
        totalRecords: 1,
      },
    },
  };
}

function makeVariant(base: CopyModRawRecord, mod: Record<string, unknown>): CopyModRawRecord {
  return {
    name: "Resolved Variant",
    source: "TST",
    remaining: {
      _copy: {
        name: base.name,
        source: base.source,
        _mod: mod,
      },
    },
  };
}

describe("resolveCopyWithMods dispatcher integration", () => {
  it("applies supported modes after copy resolution to a cloned resolved record", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "H",
        senses: ["passive Perception 12"],
        skill: { arcana: "+4" },
        trait: [
          { name: "The devil", entries: ["the devil waits."] },
          { name: "Bound", entries: ["Held in place."] },
          { name: "Old Feature", entries: ["Old text."] },
        ],
        languages: ["Common"],
        entries: [{ name: "Opening" }, { name: "Closing" }],
        reaction: [{ name: "Parry (Duelist Only)", entries: ["Adds 2 AC."] }],
        hp: { average: 101, formula: "12d12 + 24" },
        save: { str: 6, con: 5 },
        spellcasting: [{ headerEntries: ["Spell save DC 15, +7 to hit with spell attacks."] }],
        xp: 2300,
      },
    };
    const mod = {
      _: [
        { mode: "addSenses", senses: { type: "darkvision", range: 120 } },
        { mode: "addSkills", skills: { investigation: 2 } },
        { mode: "maxSize", max: "L" },
        { mode: "scalarMultXp", scalar: 0.5, floor: true },
        { mode: "setProp", prop: "vulnerable", value: null },
      ],
      trait: [
        { mode: "appendArr", items: { name: "Added Trait", entries: ["Added."] } },
        { mode: "prependArr", items: { name: "First Trait", entries: ["First."] } },
        { mode: "removeArr", names: "Bound" },
        { mode: "replaceArr", replace: "Old Feature", items: { name: "New Feature", entries: ["New."] } },
      ],
      languages: { mode: "appendIfNotExistsArr", items: ["Common", "Elvish"] },
      entries: { mode: "insertArr", index: 1, items: { name: "Inserted" } },
      reaction: { mode: "renameArr", renames: { rename: "Parry (Duelist Only)", with: "Parry" } },
      hp: [
        { mode: "prefixSuffixStringProp", prop: "formula", prefix: "floor((", suffix: ") / 2)" },
        { mode: "scalarMultProp", prop: "average", scalar: 0.5, floor: true },
      ],
      save: { mode: "scalarAddProp", scalar: -2, prop: "*" },
      spellcasting: [
        { mode: "scalarAddDc", scalar: -2 },
        { mode: "scalarAddHit", scalar: -2 },
      ],
      "*": { mode: "replaceTxt", replace: "the devil", with: "Bitter Breath", flags: "i" },
    };
    const variant = makeVariant(base, mod);

    const result = resolveCopyWithMods(variant, makeContext(base), { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected dispatcher integration to succeed");
    expect(result.record.remaining).toEqual({
      size: "L",
      senses: ["passive Perception 12", "darkvision 120 ft."],
      skill: { arcana: "+4", investigation: "+2" },
      trait: [
        { name: "First Trait", entries: ["First."] },
        { name: "Bitter Breath", entries: ["Bitter Breath waits."] },
        { name: "New Feature", entries: ["New."] },
        { name: "Added Trait", entries: ["Added."] },
      ],
      languages: ["Common", "Elvish"],
      entries: [{ name: "Opening" }, { name: "Inserted" }, { name: "Closing" }],
      reaction: [{ name: "Parry", entries: ["Adds 2 AC."] }],
      hp: { average: 50, formula: "floor((12d12 + 24) / 2)" },
      save: { str: 4, con: 3 },
      spellcasting: [{ headerEntries: ["Spell save DC 13, +5 to hit with spell attacks."] }],
      xp: 1150,
      vulnerable: null,
    });
    expect(base.remaining.trait).toEqual([
      { name: "The devil", entries: ["the devil waits."] },
      { name: "Bound", entries: ["Held in place."] },
      { name: "Old Feature", entries: ["Old text."] },
    ]);
    expect(variant.remaining).toEqual({
      _copy: {
        name: "Base Creature",
        source: "TST",
        _mod: mod,
      },
    });
  });

  it("reports unknown mode diagnostics with source path, entity, field, and mode", () => {
    const base: CopyModRawRecord = { name: "Base Creature", source: "TST", remaining: { trait: [] } };
    const result = resolveCopyWithMods(
      makeVariant(base, { trait: { mode: "inventedMode", items: [] } }),
      makeContext(base),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unknown mode failure");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNKNOWN_MOD_MODE",
      sourcePath: "source.json",
      entityName: "Resolved Variant",
      entitySource: "TST",
      fieldTarget: "trait",
      mode: "inventedMode",
    });
  });

  it("reports malformed payload diagnostics without mutating base or input records", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { trait: [{ name: "Original" }] },
    };
    const variant = makeVariant(base, {
      trait: { mode: "appendArr" },
    });

    const result = resolveCopyWithMods(variant, makeContext(base), { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected malformed payload failure");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "source.json",
      entityName: "Resolved Variant",
      entitySource: "TST",
      fieldTarget: "trait",
      mode: "appendArr",
      rawParam: { mode: "appendArr" },
    });
    expect(base.remaining).toEqual({ trait: [{ name: "Original" }] });
    expect(variant.remaining).toEqual({
      _copy: {
        name: "Base Creature",
        source: "TST",
        _mod: {
          trait: { mode: "appendArr" },
        },
      },
    });
  });
});

describe("materializeCopyWithMods", () => {
  it("returns MaterializedResolvedRecord with inheritance chain on success", () => {
    const base: CopyModRawRecord = {
      name: "Goblin",
      source: "MPMM",
      remaining: { size: "S", trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Boggart",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.record.name).toBe("Boggart");
    expect(result.result.record.source).toBe("MPMM");
    expect(result.result.record.remaining.size).toBe("S");
    expect(result.result.inheritanceChain).toHaveLength(1);
    expect(result.result.inheritanceChain[0]).toEqual({
      entityName: "Goblin",
      sourceAbbr: "MPMM",
      entityKind: "monster",
      sourcePath: "source.json",
      identity: { name: "Goblin", source: "MPMM" },
    });
    expect(result.result.metadata.diagnostics).toHaveLength(0);
    expect(result.result.identity.name).toBe("Boggart");
    expect(result.result.identity.source).toBe("MPMM");
    expect(result.result.identity.entityKind).toBe("monster");
    expect(result.result.identity.sourcePath).toBe("source.json");
    expect(result.result.terminalBase.name).toBe("Goblin");
    expect(result.result.terminalBase.source).toBe("MPMM");
    expect(result.result.terminalBase.entityKind).toBe("monster");
    expect(result.result.terminalBase.sourcePath).toBe("source.json");
  });

  it("returns empty inheritance chain for direct record with no _copy", () => {
    const direct: CopyModRawRecord = {
      name: "Human",
      source: "PHB",
      remaining: { size: "M", entries: ["Adaptable"] },
    };

    const ctx = {
      validatedFiles: {
        "race.json": {
          filePath: "race.json",
          collections: [
            {
              entityKind: "race",
              recordCount: 1,
              records: [direct],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(direct, ctx, {
      sourcePath: "race.json",
      sourceEntityKind: "race",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure for direct record");
    expect(result.diagnostics[0]).toMatchObject({
      code: "NO_COPY_FIELD",
      entityName: "Human",
      entitySource: "PHB",
    });
  });

  it("propagates copy resolution failure as MaterializationDiagnostic", () => {
    const variant: CopyModRawRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [variant],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "BASE_ENTITY_NOT_FOUND",
      entityName: "Missing Base",
      entitySource: "TST",
      fieldTarget: "_copy",
    });
  });

  it("propagates mod failure as MaterializationDiagnostic", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Bad Mod",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "nonexistentMode" } },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    expect(result.diagnostics).toHaveLength(1);
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("UNKNOWN_MOD_MODE");
    expect(diag.entityName).toBe("Bad Mod");
    expect(diag.fieldTarget).toBe("trait");
    expect(diag.mode).toBe("nonexistentMode");
  });

  it("preserves exact CopyChainStep fields in inheritance chain", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L" },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: { _copy: { name: "Centaur", source: "GGR" } },
    };
    const variant: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: { _copy: { name: "Centaur MOT", source: "MOT" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 3,
              records: [base, middle, variant],
            },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.inheritanceChain).toHaveLength(2);
    expect(result.result.inheritanceChain[0]).toMatchObject({
      entityName: "Centaur MOT",
      sourceAbbr: "MOT",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
    expect(result.result.inheritanceChain[1]).toMatchObject({
      entityName: "Centaur",
      sourceAbbr: "GGR",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
  });

  it("includes mod diagnostics in failure result", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Multi Mod Fail",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: {
            _: [{ mode: "addSenses", senses: { type: "darkvision", range: 60 } }],
            trait: { mode: "inventedMode" },
          },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    const unknownMode = result.diagnostics.find((d) => d.code === "UNKNOWN_MOD_MODE");
    expect(unknownMode).toBeDefined();
    if (unknownMode) {
      expect(unknownMode.fieldTarget).toBe("trait");
      expect(unknownMode.mode).toBe("inventedMode");
    }
  });

  it("result record is independent clone (mutation safety)", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [{ name: "Original" }] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" } },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    const traits = result.result.record.remaining.trait as { name: string }[];
    if (!Array.isArray(traits)) throw new Error("Expected trait array");
    traits.push({ name: "Injected" });
    expect(base.remaining.trait).toEqual([{ name: "Original" }]);
  });

  it("materialized record carries correct diagnostics type", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(Array.isArray(result.result.metadata.diagnostics)).toBe(true);
    expect(result.result.metadata.diagnostics).toHaveLength(0);
    // Verify the record has the applied mod
    expect(result.result.record.remaining.trait).toEqual([
      { name: "Added" },
    ]);
  });

  it("retains derived name, source, entityKind, and sourcePath in identity", () => {
    const base: CopyModRawRecord = {
      name: "Goblin",
      source: "MPMM",
      remaining: { size: "S" },
    };
    const variant: CopyModRawRecord = {
      name: "Boggart",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.identity.name).toBe("Boggart");
    expect(result.result.identity.source).toBe("MPMM");
    expect(result.result.identity.entityKind).toBe("monster");
    expect(result.result.identity.sourcePath).toBe("monster.json");
  });

  it("terminal base retains exact path, kind, and identity from final chain step", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L" },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: { _copy: { name: "Centaur", source: "GGR" } },
    };
    const variant: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: { _copy: { name: "Centaur MOT", source: "MOT" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 3,
              records: [base, middle, variant],
            },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.terminalBase.name).toBe("Centaur");
    expect(result.result.terminalBase.source).toBe("GGR");
    expect(result.result.terminalBase.entityKind).toBe("monster");
    expect(result.result.terminalBase.sourcePath).toBe("monster.json");
    expect(result.result.terminalBase.identity).toEqual({
      name: "Centaur",
      source: "GGR",
    });
  });

  it("nested copies retain the complete inheritance chain", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L" },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: { _copy: { name: "Centaur", source: "GGR" } },
    };
    const variant: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: { _copy: { name: "Centaur MOT", source: "MOT" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 3,
              records: [base, middle, variant],
            },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.inheritanceChain).toHaveLength(2);
    expect(result.result.inheritanceChain[0]).toMatchObject({
      entityName: "Centaur MOT",
      sourceAbbr: "MOT",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
    expect(result.result.inheritanceChain[1]).toMatchObject({
      entityName: "Centaur",
      sourceAbbr: "GGR",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
  });

  it("deep-clones deferredPreserve from _copy._preserve", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _preserve: { fields: ["trait", "size"], reason: "test preserve" },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    const preserved = result.result.metadata.deferredPreserve as Record<string, unknown>;
    expect(preserved).toEqual({ fields: ["trait", "size"], reason: "test preserve" });
    // Verify deep clone: mutating the result does not affect the original
    if (Array.isArray(preserved.fields)) {
      preserved.fields.push("injected");
    }
    expect(variant.remaining._copy).toHaveProperty("_preserve", {
      fields: ["trait", "size"],
      reason: "test preserve",
    });
  });

  it("successful results contain no 'unknown' locations", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" } },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.identity.entityKind).not.toBe("unknown");
    expect(result.result.identity.sourcePath).not.toBe("unknown");
    expect(result.result.terminalBase.entityKind).not.toBe("unknown");
    expect(result.result.terminalBase.sourcePath).not.toBe("unknown");
  });

  it("base and derived input records remain unchanged after materialization", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [{ name: "Original" }], size: "M" },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    // Base record unchanged
    expect(base.remaining).toEqual({ trait: [{ name: "Original" }], size: "M" });
    // Derived record unchanged
    expect(variant.remaining).toEqual({
      _copy: {
        name: "Base",
        source: "TST",
        _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
      },
    });
  });

  it("rejects materialization when sourceEntityKind is 'unknown'", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" } },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [base],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "source.json",
      sourceEntityKind: "unknown",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects materialization when sourcePath is 'unknown'", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" } },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [base],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "unknown",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
  });

  it("materialized record contains no _copy or _mod fields", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "appendArr", items: { name: "Added" } } },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.record.remaining).not.toHaveProperty("_copy");
    expect(result.result.record.remaining).not.toHaveProperty("_mod");
  });
});

describe("materialization diagnostic conversion preserves structured fields", () => {
  it("BASE_ENTITY_NOT_FOUND preserves requestedIdentity, sourceEntityKind, sourcePath, and allowedEntityKinds", () => {
    const variant: CopyModRawRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [variant],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(diag.requestedIdentity).toEqual({ name: "NonExistent", source: "XXX" });
    expect(diag.sourceEntityKind).toBe("monster");
    expect(diag.sourcePath).toBe("monster.json");
    expect(diag.allowedEntityKinds).toBeDefined();
    expect(diag.entityName).toBe("Missing Base");
    expect(diag.entitySource).toBe("TST");
  });

  it("AMBIGUOUS_BASE_ENTITY preserves both candidates with complete identities", () => {
    const dup1 = { name: "Goblin", source: "MPMM", remaining: {} };
    const dup2 = { name: "Goblin", source: "MPMM", remaining: {} };
    const variant: CopyModRawRecord = {
      name: "Goblin Copy",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 3,
              records: [dup1, dup2, variant],
            },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("AMBIGUOUS_BASE_ENTITY");
    expect(diag.ambiguityCandidates).toBeDefined();
    expect(diag.ambiguityCandidates).toHaveLength(2);
    expect(diag.ambiguityCandidates![0]).toMatchObject({
      name: "Goblin",
      source: "MPMM",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
    expect(diag.ambiguityCandidates![0]!.identity).toBeDefined();
    expect(diag.ambiguityCandidates![0]!.identity!).toEqual({ name: "Goblin", source: "MPMM" });
    expect(diag.ambiguityCandidates![1]).toMatchObject({
      name: "Goblin",
      source: "MPMM",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
    expect(diag.ambiguityCandidates![1]!.identity).toBeDefined();
    expect(diag.ambiguityCandidates![1]!.identity!).toEqual({ name: "Goblin", source: "MPMM" });
  });

  it("CIRCULAR_COPY_REFERENCE preserves the complete inheritanceChain", () => {
    const recordA: CopyModRawRecord = {
      name: "A",
      source: "PHB",
      remaining: { _copy: { name: "B", source: "PHB" } },
    };
    const recordB: CopyModRawRecord = {
      name: "B",
      source: "PHB",
      remaining: { _copy: { name: "A", source: "PHB" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 2,
              records: [recordA, recordB],
            },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = materializeCopyWithMods(recordA, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("CIRCULAR_COPY_REFERENCE");
    expect(diag.inheritanceChain).toBeDefined();
    expect(diag.inheritanceChain!.length).toBeGreaterThan(0);
    expect(diag.inheritanceChain![0]).toMatchObject({
      entityName: "B",
      sourceAbbr: "PHB",
      entityKind: "monster",
      sourcePath: "monster.json",
    });
  });

  it("INVALID_DISCRIMINATOR_VALUE preserves the field and original invalid value", () => {
    const base: CopyModRawRecord = {
      name: "Fighter",
      source: "PHB",
      remaining: {},
    };
    const variant: CopyModRawRecord = {
      name: "Fighter Copy",
      source: "PHB",
      remaining: {
        _copy: { name: "Fighter", source: "PHB", className: null },
      },
    };

    const ctx = {
      validatedFiles: {
        "class.json": {
          filePath: "class.json",
          collections: [
            {
              entityKind: "class",
              recordCount: 2,
              records: [base, variant],
            },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "class.json",
      sourceEntityKind: "class",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("INVALID_DISCRIMINATOR_VALUE");
    expect(diag.invalidDiscriminatorField).toBe("className");
    expect(diag.invalidDiscriminatorValue).toBeUndefined();
  });

  it("modifying a converted requestedIdentity does not mutate the original diagnostic data", () => {
    const variant: CopyModRawRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [variant],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    const originalIdentity = { ...diag.requestedIdentity! };
    // Attempt to mutate the converted identity
    try {
      (diag.requestedIdentity! as Record<string, unknown>).name = "MUTATED";
    } catch {
      // Object.freeze may throw; that's expected and confirms immutability
    }
    // The original variant's _copy should be unchanged
    expect(variant.remaining._copy).toEqual({ name: "NonExistent", source: "XXX" });
    // The captured original should still match
    expect(originalIdentity).toEqual({ name: "NonExistent", source: "XXX" });
  });

  it("modifying a converted ambiguity candidate identity does not mutate the original", () => {
    const dup1 = { name: "Goblin", source: "MPMM", remaining: {} };
    const dup2 = { name: "Goblin", source: "MPMM", remaining: {} };
    const variant: CopyModRawRecord = {
      name: "Goblin Copy",
      source: "MPMM",
      remaining: { _copy: { name: "Goblin", source: "MPMM" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 3,
              records: [dup1, dup2, variant],
            },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    const candidate = diag.ambiguityCandidates![0]!;
    const originalIdentity = { ...candidate.identity! };
    // Attempt to mutate the candidate's identity
    try {
      (candidate.identity! as Record<string, unknown>).name = "MUTATED";
    } catch {
      // Object.freeze may throw; that's expected
    }
    // The original record should be unchanged
    expect(dup1).toEqual({ name: "Goblin", source: "MPMM", remaining: {} });
    expect(originalIdentity).toEqual({ name: "Goblin", source: "MPMM" });
  });

  it("every failed materialization returns at least one diagnostic", () => {
    const variant: CopyModRawRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [variant],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
  });

  it("mod diagnostics still preserve fieldTarget, mode, rawParam, and sourcePath", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Bad Mod",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "nonexistentMode" } },
        },
      },
    };

    const result = materializeCopyWithMods(variant, makeContext(base), {
      sourcePath: "source.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected materialization failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.fieldTarget).toBe("trait");
    expect(diag.mode).toBe("nonexistentMode");
    expect(diag.rawParam).toEqual({ mode: "nonexistentMode" });
    expect(diag.sourcePath).toBe("source.json");
  });

  it("resolveCopyWithMods also preserves structured diagnostic fields", () => {
    const variant: CopyModRawRecord = {
      name: "Missing Base",
      source: "TST",
      remaining: { _copy: { name: "NonExistent", source: "XXX" } },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            {
              entityKind: "monster",
              recordCount: 1,
              records: [variant],
            },
          ],
          totalRecords: 1,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected resolution failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("BASE_ENTITY_NOT_FOUND");
    expect(diag.requestedIdentity).toEqual({ name: "NonExistent", source: "XXX" });
    expect(diag.sourceEntityKind).toBe("monster");
    expect(diag.sourcePath).toBe("monster.json");
  });
});

describe("direct-field overlay merge semantics (5eTools alignment)", () => {
  it("derived array replaces base array (no merge)", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [{ name: "Base Trait" }] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        trait: [{ name: "Derived Trait" }],
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.trait).toEqual([{ name: "Derived Trait" }]);
  });

  it("derived object replaces base object (no merge)", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { skill: { arcana: "+4", stealth: "+2" } },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        skill: { arcana: "+6" },
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.skill).toEqual({ arcana: "+6" });
    expect(result.record.remaining.skill).not.toHaveProperty("stealth");
  });

  it("derived null deletes base field from result", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", speed: 30, trait: [] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        speed: null,
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining).not.toHaveProperty("speed");
    expect(result.record.remaining.size).toBe("M");
    expect(result.record.remaining.trait).toEqual([]);
  });

  it("base fields absent in derived are gap-filled from base", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", speed: 30, trait: [{ name: "Base Trait" }] },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        size: "L",
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.size).toBe("L");
    expect(result.record.remaining.speed).toBe(30);
    expect(result.record.remaining.trait).toEqual([{ name: "Base Trait" }]);
  });

  it("preserve-gated base fields are deleted without explicit _preserve", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", srd: true, hasToken: true },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.size).toBe("M");
    expect(result.record.remaining).not.toHaveProperty("srd");
    expect(result.record.remaining).not.toHaveProperty("hasToken");
  });

  it("preserve-gated base fields are copied with _preserve wildcard", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", srd: true, hasToken: true },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { "*": true } },
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.size).toBe("M");
    expect(result.record.remaining.srd).toBe(true);
    expect(result.record.remaining.hasToken).toBe(true);
  });

  it("preserve-gated base fields are copied with per-field _preserve", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", srd: true, hasToken: true },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { srd: true } },
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.size).toBe("M");
    expect(result.record.remaining.srd).toBe(true);
    expect(result.record.remaining).not.toHaveProperty("hasToken");
  });

  it("derived scalar replaces base scalar", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", speed: 30, cr: 1 },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        size: "L",
        speed: 40,
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = resolveCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining.size).toBe("L");
    expect(result.record.remaining.speed).toBe(40);
    expect(result.record.remaining.cr).toBe(1);
  });

  it("materializeCopyWithMods applies same merge semantics as resolveCopyWithMods", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", speed: 30, trait: [{ name: "Base Trait" }], srd: true },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST" },
        size: "L",
        speed: null,
        trait: [{ name: "Derived Trait" }],
      },
    };

    const ctx = {
      validatedFiles: {
        "source.json": {
          filePath: "source.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [base, variant] }],
          totalRecords: 2,
        },
      },
    };

    const result = materializeCopyWithMods(variant, ctx, { sourcePath: "source.json", sourceEntityKind: "monster" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("L");
    expect(r).not.toHaveProperty("speed");
    expect(r.trait).toEqual([{ name: "Derived Trait" }]);
    expect(r).not.toHaveProperty("srd");
  });
});
