import { describe, expect, it } from "vitest";
import {
  isCopyResolutionSuccess,
  resolveCopy,
  type CopyChainStep,
  type CopyResolverContext,
  type LocatedCopyLevel,
} from "./copy-resolver";
import {
  materializeCopyWithMods,
  resolveCopyWithMods,
  type CopyModRawRecord,
} from "./mod-copy-resolver";
import { materializeNestedCopyLevels } from "./nested-copy-materializer";
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

function makeTemplateContext(
  records: readonly CopyModRawRecord[],
  templates: readonly CopyModRawRecord[],
  templateKind = "monsterTemplate",
): CopyResolverContext {
  return {
    validatedFiles: {
      "source.json": {
        filePath: "source.json",
        collections: [
          { entityKind: "monster", recordCount: records.length, records: [...records] },
        ],
        totalRecords: records.length,
      },
      "template.json": {
        filePath: "template.json",
        collections: [
          { entityKind: templateKind, recordCount: templates.length, records: [...templates] },
        ],
        totalRecords: templates.length,
      },
    },
  };
}

function templateRecord(
  name: string,
  source: string,
  apply: Record<string, unknown>,
): CopyModRawRecord {
  return { name, source, remaining: { apply } };
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

function makeLocatedLevels(
  chain: readonly CopyChainStep[],
  records: readonly CopyModRawRecord[],
): readonly LocatedCopyLevel[] {
  return chain.map((step, index) => ({
    record: records[index]!,
    entityKind: step.entityKind,
    sourcePath: step.sourcePath,
    identity: step.identity,
  }));
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

  it("terminal base retains exact path, kind, and identity from the final located level", () => {
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

  it("cross-file terminal base uses the actual terminal file", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { size: "M" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Base", source: "BAS" } },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "OUT",
      remaining: { _copy: { name: "Middle", source: "MID" } },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [base] }],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(outer, ctx, {
      sourcePath: "outer.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.terminalBase.sourcePath).toBe("base.json");
    expect(result.result.inheritanceChain.map((step) => step.sourcePath)).toEqual(["middle.json", "base.json"]);
  });

  it("cross-collection terminal base uses the actual terminal entity kind", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "BAS",
      remaining: { size: "M" },
    };
    const fluff: CopyModRawRecord = {
      name: "Base Fluff",
      source: "OUT",
      remaining: { _copy: { name: "Base Creature", source: "BAS" } },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "base.json": {
          filePath: "base.json",
          collections: [
            { entityKind: "monster", recordCount: 1, records: [base] },
            { entityKind: "monsterFluff", recordCount: 1, records: [fluff] },
          ],
          totalRecords: 2,
        },
      },
    };

    const result = materializeCopyWithMods(fluff, ctx, {
      sourcePath: "fluff.json",
      sourceEntityKind: "monsterFluff",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.terminalBase.entityKind).toBe("monster");
    expect(result.result.terminalBase.sourcePath).toBe("base.json");
  });

  it("terminal base name and source come from the exact terminal record", () => {
    const itemType: CopyModRawRecord = {
      name: "Vehicle (Air)",
      source: "DMG",
      remaining: { abbreviation: "SHP", entries: ["ship"] },
    };
    const copy: CopyModRawRecord = {
      name: "Ship Type Copy",
      source: "TST",
      remaining: { _copy: { abbreviation: "SHP", source: "DMG" } },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "item-type.json": {
          filePath: "item-type.json",
          collections: [{ entityKind: "itemType", recordCount: 1, records: [itemType] }],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(copy, ctx, {
      sourcePath: "copy.json",
      sourceEntityKind: "itemType",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.terminalBase).toMatchObject({
      name: "Vehicle (Air)",
      source: "DMG",
      entityKind: "itemType",
      sourcePath: "item-type.json",
      identity: { abbreviation: "SHP", source: "DMG" },
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
          _preserve: { "*": true },
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
    expect(preserved).toEqual({ "*": true });
    // Verify deep clone: mutating the result does not affect the original
    (preserved as Record<string, unknown>)["*"] = false;
    expect(variant.remaining._copy).toHaveProperty("_preserve", { "*": true });
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

describe("copy template materialization", () => {
  it("resolves monster templates by trimmed case-insensitive identity and preserves template order", () => {
    const base: CopyModRawRecord = { name: "Base", source: "SRC", remaining: { trait: [] } };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "SRC",
      remaining: {
        _copy: {
          name: "Base",
          source: "SRC",
          _templates: [
            { name: " first ", source: " tmp " },
            { name: "SECOND", source: "TMP" },
          ],
        },
      },
    };
    const result = materializeCopyWithMods(
      variant,
      makeTemplateContext(
        [base],
        [
          templateRecord("First", "TMP", { _mod: { trait: { mode: "appendArr", items: "first" } } }),
          templateRecord("Second", "TMP", { _mod: { trait: { mode: "appendArr", items: "second" } } }),
        ],
      ),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected template materialization success");
    expect(result.result.record.remaining.trait).toEqual(["first", "second"]);
    expect(result.result.metadata.appliedTemplates.map((item) => item.name)).toEqual(["First", "Second"]);
  });

  it("resolves legendary-group templates from the authoritative collection", () => {
    const base: CopyModRawRecord = { name: "Base Group", source: "SRC", remaining: { lairActions: [] } };
    const variant: CopyModRawRecord = {
      name: "Variant Group",
      source: "SRC",
      remaining: { _copy: { name: "Base Group", source: "SRC", _templates: [{ name: "Shadow Dragon", source: "FTD" }] } },
    };
    const context = {
      validatedFiles: {
        "groups.json": {
          filePath: "groups.json",
          collections: [{ entityKind: "legendaryGroup", recordCount: 1, records: [base] }],
          totalRecords: 1,
        },
        "template.json": {
          filePath: "template.json",
          collections: [{
            entityKind: "legendaryGroupTemplate",
            recordCount: 1,
            records: [templateRecord("Shadow Dragon", "FTD", {
              _mod: { lairActions: { mode: "appendArr", items: "shadow" } },
            })],
          }],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(variant, context, {
      sourcePath: "groups.json",
      sourceEntityKind: "legendaryGroup",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected legendary group template success");
    expect(result.result.record.remaining.lairActions).toEqual(["shadow"]);
  });

  it("reports unsupported, missing, ambiguous, malformed reference, and malformed record template failures", () => {
    const base: CopyModRawRecord = { name: "Base", source: "SRC", remaining: {} };
    const missing = materializeCopyWithMods(
      { name: "Variant", source: "SRC", remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "Missing", source: "TMP" }] } } },
      makeTemplateContext([base], []),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );
    const unsupported = materializeCopyWithMods(
      { name: "Race Variant", source: "SRC", remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "First", source: "TMP" }] } } },
      { validatedFiles: { "source.json": { filePath: "source.json", collections: [{ entityKind: "race", recordCount: 1, records: [base] }], totalRecords: 1 } } },
      { sourcePath: "source.json", sourceEntityKind: "race" },
    );
    const ambiguous = materializeCopyWithMods(
      { name: "Variant", source: "SRC", remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "First", source: "TMP" }] } } },
      makeTemplateContext([base], [
        templateRecord("First", "TMP", { _root: { size: "M" } }),
        templateRecord(" first ", "tmp", { _root: { size: "S" } }),
      ]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );
    const malformedReference = materializeCopyWithMods(
      { name: "Variant", source: "SRC", remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "First", source: "TMP", extra: true }] } } },
      makeTemplateContext([base], [templateRecord("First", "TMP", { _root: { size: "M" } })]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );
    const malformedRecord = materializeCopyWithMods(
      { name: "Variant", source: "SRC", remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "First", source: "TMP" }] } } },
      makeTemplateContext([base], [{ name: "First", source: "TMP", remaining: { apply: { unsupported: true } } }]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    for (const result of [missing, unsupported, ambiguous, malformedReference, malformedRecord]) {
      expect(result.ok).toBe(false);
    }
    expect(!missing.ok && missing.diagnostics[0]).toMatchObject({ code: "TEMPLATE_NOT_FOUND", templateReferenceIndex: 0 });
    expect(!unsupported.ok && unsupported.diagnostics[0]).toMatchObject({ code: "TEMPLATE_ENTITY_KIND_UNSUPPORTED" });
    expect(!ambiguous.ok && ambiguous.diagnostics[0]).toMatchObject({ code: "TEMPLATE_AMBIGUOUS" });
    if (ambiguous.ok) throw new Error("Expected ambiguity failure");
    expect(ambiguous.diagnostics[0]?.templateCandidates).toHaveLength(2);
    expect(!malformedReference.ok && malformedReference.diagnostics[0]).toMatchObject({ code: "TEMPLATE_REFERENCE_INVALID" });
    expect(!malformedRecord.ok && malformedRecord.diagnostics[0]).toMatchObject({ code: "TEMPLATE_RECORD_INVALID" });
  });

  it("merges own mods before template mods and applies template roots after preserve inheritance", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "SRC",
      remaining: { trait: [], page: 7, size: "M", type: "base", speed: 30 },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "SRC",
      remaining: {
        _copy: {
          name: "Base",
          source: "SRC",
          _preserve: { "*": true },
          _templates: [{ name: "First", source: "TMP" }, { name: "Second", source: "TMP" }],
          _mod: { trait: { mode: "appendArr", items: "own" } },
        },
        size: "L",
        type: null,
      },
    };

    const result = materializeCopyWithMods(
      variant,
      makeTemplateContext([base], [
        templateRecord("First", "TMP", {
          _root: { page: 9, size: "S", type: "templated", speed: 40 },
          _mod: { trait: { mode: "appendArr", items: "first" } },
        }),
        templateRecord("Second", "TMP", {
          _mod: { trait: { mode: "appendArr", items: "second" } },
        }),
      ]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected merge success");
    expect(result.result.record.remaining).toMatchObject({
      trait: ["own", "first", "second"],
      page: 9,
      size: "L",
      speed: 40,
    });
    expect(result.result.record.remaining).not.toHaveProperty("type");
  });

  it("cleans directives, freezes provenance, and leaves inputs and template records unchanged", () => {
    const base: CopyModRawRecord = { name: "Base", source: "SRC", remaining: { trait: [] } };
    const template = templateRecord("First", "TMP", { _mod: { trait: { mode: "appendArr", items: "first" } } });
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "SRC",
      remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "First", source: "TMP" }] } },
    };
    const before = JSON.stringify({ base, template, variant });

    const result = materializeCopyWithMods(
      variant,
      makeTemplateContext([base], [template]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected provenance success");
    expect(result.result.record.remaining).not.toHaveProperty("_templates");
    expect(result.result.record.remaining).not.toHaveProperty("_copy");
    expect(result.result.record.remaining).not.toHaveProperty("_mod");
    expect(result.result.record.remaining).not.toHaveProperty("_preserve");
    expect(result.result.metadata.appliedTemplates).toEqual([
      { name: "First", source: "TMP", entityKind: "monsterTemplate", sourcePath: "template.json" },
    ]);
    expect(Object.isFrozen(result.result.metadata.appliedTemplates)).toBe(true);
    expect(Object.isFrozen(result.result.metadata.appliedTemplates[0])).toBe(true);
    expect(result.result.metadata.appliedTemplates[0]).not.toHaveProperty("apply");
    expect(JSON.stringify({ base, template, variant })).toBe(before);
  });

  it("materializes same-collection copied template records before applying them", () => {
    const base: CopyModRawRecord = { name: "Base", source: "SRC", remaining: { type: "base" } };
    const parentTemplate = templateRecord("Mountain Dwarf", "PHB", {
      _root: { type: { type: "humanoid", tags: [{ tag: "dwarf", prefix: "Mountain" }] } },
    });
    const copiedTemplate: CopyModRawRecord = {
      name: "Hill Dwarf",
      source: "PHB",
      remaining: {
        _copy: {
          name: "Mountain Dwarf",
          source: "PHB",
          _mod: {
            _: {
              mode: "setProp",
              prop: "apply._root.type",
              value: { type: "humanoid", tags: [{ tag: "dwarf", prefix: "Hill" }] },
            },
          },
        },
      },
    };
    const variant: CopyModRawRecord = {
      name: "Variant",
      source: "SRC",
      remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "Hill Dwarf", source: "PHB" }] } },
    };

    const result = materializeCopyWithMods(
      variant,
      makeTemplateContext([base], [parentTemplate, copiedTemplate]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected copied template success");
    expect(result.result.record.remaining.type).toEqual({
      type: "humanoid",
      tags: [{ tag: "dwarf", prefix: "Hill" }],
    });
  });

  it("applies nested copy level templates independently and stops outer work on nested failure", () => {
    const base: CopyModRawRecord = { name: "Base", source: "SRC", remaining: { trait: [] } };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "SRC",
      remaining: { _copy: { name: "Base", source: "SRC", _preserve: { "*": true }, _templates: [{ name: "First", source: "TMP" }] } },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "SRC",
      remaining: { _copy: { name: "Middle", source: "SRC", _preserve: { "*": true }, _templates: [{ name: "Second", source: "TMP" }] } },
    };
    const result = materializeCopyWithMods(
      outer,
      makeTemplateContext([base, middle], [
        templateRecord("First", "TMP", { _mod: { trait: { mode: "appendArr", items: "middle" } } }),
        templateRecord("Second", "TMP", { _mod: { trait: { mode: "appendArr", items: "outer" } } }),
      ]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );
    const failed = materializeCopyWithMods(
      { ...outer, remaining: { _copy: { name: "Middle", source: "SRC", _templates: [{ name: "Second", source: "TMP" }] } } },
      makeTemplateContext([base, {
        ...middle,
        remaining: { _copy: { name: "Base", source: "SRC", _templates: [{ name: "Missing", source: "TMP" }] } },
      }], [templateRecord("Second", "TMP", { _mod: { trait: { mode: "appendArr", items: "outer" } } })]),
      { sourcePath: "source.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected nested template success");
    expect(result.result.record.remaining.trait).toEqual(["middle", "outer"]);
    expect(result.result.metadata.appliedTemplates.map((item) => item.name)).toEqual(["First", "Second"]);
    expect(failed.ok).toBe(false);
    expect(!failed.ok && failed.diagnostics[0]).toMatchObject({ code: "TEMPLATE_NOT_FOUND", entityName: "Middle" });
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

  it("_copy._preserve diagnostic values are NOT mutated during materialization", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M", page: "42" },
    };

    const variant: CopyModRawRecord = {
      name: "Bad Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: false },
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_MARKER");
    expect(preserveDiag).toBeDefined();
    if (!preserveDiag) throw new Error("Expected INVALID_PRESERVE_MARKER diagnostic");
    // Capture original diagnostic values
    const originalKey = preserveDiag.invalidPreserveKey;
    const originalValue = preserveDiag.invalidMarkerValue;
    const originalReason = preserveDiag.validationReason;
    // Attempt to mutate
    try {
      (preserveDiag as unknown as Record<string, unknown>).invalidMarkerValue = "MUTATED";
    } catch {
      // Object.freeze may throw; that's expected
    }
    // Original variant's _preserve should be unchanged
    expect(variant.remaining._copy).toHaveProperty("_preserve", { page: false });
    // Captured originals should still match
    expect(originalKey).toBe("page");
    expect(originalValue).toBe(false);
    expect(originalReason).toBe("INVALID_MARKER_VALUE");
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

describe("preserve payload validation enforcement", () => {
  it("rejects _copy._preserve with invalid marker value and emits diagnostic", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "M",
        page: "42",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "Bad Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: false },
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_MARKER");
    expect(preserveDiag).toBeDefined();
    if (!preserveDiag) throw new Error("Expected INVALID_PRESERVE_MARKER diagnostic");
    expect(preserveDiag.invalidPreserveKey).toBe("page");
  });

  it("rejects _copy._preserve with null payload and emits diagnostic", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "M",
        page: "42",
      },
    };

    const variant: CopyModRawRecord = {
      name: "Null Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: null,
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_PAYLOAD");
    expect(preserveDiag).toBeDefined();
  });

  it("rejects _copy._preserve with array payload and emits diagnostic", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M" },
    };

    const variant: CopyModRawRecord = {
      name: "Array Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: [true],
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_PAYLOAD");
    expect(preserveDiag).toBeDefined();
  });

  it("rejects _copy._preserve with prototype-sensitive key and emits diagnostic", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M" },
    };

    const variant: CopyModRawRecord = {
      name: "Proto Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: JSON.parse('{"constructor": true}'),
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_KEY");
    expect(preserveDiag).toBeDefined();
    if (!preserveDiag) throw new Error("Expected INVALID_PRESERVE_KEY diagnostic");
    expect(preserveDiag.invalidPreserveKey).toBe("constructor");
  });

  it("does not mutate _copy._preserve diagnostic values", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M" },
    };

    const variant: CopyModRawRecord = {
      name: "Mutation Test Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: false, srd: null },
          _mod: { size: "L" },
        },
      },
    };

    const originalPreserve = JSON.parse(JSON.stringify((variant.remaining._copy as Record<string, unknown>)._preserve));
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect((variant.remaining._copy as Record<string, unknown>)._preserve).toEqual(originalPreserve);
  });

  it("accepts valid _copy._preserve wildcard and preserves gated fields", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "M",
        page: "42",
        srd: "5.1",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "Valid Wildcard Preserve",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { "*": true },
          _mod: { _: { mode: "setProp", prop: "size", value: "L" } },
        },
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
    expect(r.page).toBe("42");
    expect(r.srd).toBe("5.1");
    expect(r.trait).toEqual([{ name: "Base Trait" }]);
  });

  it("accepts valid _copy._preserve with specific field and only preserves that field", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "M",
        page: "42",
        srd: "5.1",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "Valid Specific Preserve",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: true },
          _mod: { _: { mode: "setProp", prop: "size", value: "L" } },
        },
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
    expect(r.page).toBe("42");
    expect(r).not.toHaveProperty("srd");
    expect(r.trait).toEqual([{ name: "Base Trait" }]);
  });

  it("rejects _copy._preserve with marker values 1 and 'true'", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: {
        size: "M",
        page: "42",
        srd: "5.1",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "Marker Value 1",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: 1, srd: "true" },
          _mod: { _: { mode: "setProp", prop: "size", value: "L" } },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_MARKER");
    expect(preserveDiag).toBeDefined();
  });

  it("entity-kind-aware: monster-specific field preserved with wildcard for monster kind", () => {
    const base: CopyModRawRecord = {
      name: "Base Monster",
      source: "TST",
      remaining: {
        size: "M",
        legendaryGroup: [{ name: "Legendary Action" }],
        page: "42",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "Legendary Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { "*": true },
          _mod: { _: { mode: "setProp", prop: "size", value: "L" } },
        },
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
    expect(r.legendaryGroup).toEqual([{ name: "Legendary Action" }]);
  });

  it("entity-kind-aware: monster-specific field NOT preserved without preserve for monster kind", () => {
    const base: CopyModRawRecord = {
      name: "Base Monster",
      source: "TST",
      remaining: {
        size: "M",
        legendaryGroup: [{ name: "Legendary Action" }],
        page: "42",
        trait: [{ name: "Base Trait" }],
      },
    };

    const variant: CopyModRawRecord = {
      name: "No Preserve Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
        },
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
    expect(r).not.toHaveProperty("legendaryGroup");
  });

  it("rejects _copy._preserve with nested object as marker value", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M" },
    };

    const variant: CopyModRawRecord = {
      name: "Nested Marker Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { page: { nested: true } },
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_MARKER");
    expect(preserveDiag).toBeDefined();
  });

  it("rejects _copy._preserve with empty field key", () => {
    const base: CopyModRawRecord = {
      name: "Base Creature",
      source: "TST",
      remaining: { size: "M" },
    };

    const variant: CopyModRawRecord = {
      name: "Empty Key Variant",
      source: "TST",
      remaining: {
        _copy: {
          name: base.name,
          source: base.source,
          _preserve: { "": true, page: true },
          _mod: { size: "L" },
        },
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

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const preserveDiag = result.diagnostics.find((d) => d.code === "INVALID_PRESERVE_KEY");
    expect(preserveDiag).toBeDefined();
  });
});

describe("nested copy chain materialization", () => {
  it("3-level chain applies intermediate direct fields before derived level", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L", ac: 14, cr: 3 },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: {
        _copy: { name: "Centaur", source: "GGR" },
        ac: 16,
      },
    };
    const derived: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: {
        _copy: { name: "Centaur MOT", source: "MOT" },
        cr: 4,
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("L");
    expect(r.ac).toBe(16);
    expect(r.cr).toBe(4);
  });

  it("3-level chain applies intermediate _mod before derived level", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L", ac: 14, cr: 3, trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: {
        _copy: {
          name: "Centaur",
          source: "GGR",
          _mod: { _: { mode: "setProp", prop: "ac", value: 16 } },
        },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: {
        _copy: { name: "Centaur MOT", source: "MOT" },
        cr: 4,
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("L");
    expect(r.ac).toBe(16);
    expect(r.cr).toBe(4);
  });

  it("intermediate _preserve is respected at each level", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", srd: true, hasToken: true, page: "10" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { "*": true } },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Derived",
      source: "TST",
      remaining: {
        _copy: { name: "Middle", source: "TST", _preserve: { "*": true } },
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("M");
    expect(r.srd).toBe(true);
    expect(r.hasToken).toBe(true);
    expect(r.page).toBe("10");
  });

  it("intermediate _preserve propagates; derived without _preserve drops gated fields", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", srd: true, hasToken: true },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { "*": true } },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Derived",
      source: "TST",
      remaining: {
        _copy: { name: "Middle", source: "TST" },
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("M");
    expect(r).not.toHaveProperty("srd");
    expect(r).not.toHaveProperty("hasToken");
  });

  it("4-level chain materializes all intermediate levels", () => {
    const base: CopyModRawRecord = {
      name: "A",
      source: "TST",
      remaining: { size: "S", ac: 10, hp: 10, cr: 1 },
    };
    const b: CopyModRawRecord = {
      name: "B",
      source: "TST",
      remaining: {
        _copy: {
          name: "A",
          source: "TST",
          _mod: { _: { mode: "setProp", prop: "ac", value: 12 } },
        },
        size: "M",
      },
    };
    const c: CopyModRawRecord = {
      name: "C",
      source: "TST",
      remaining: {
        _copy: {
          name: "B",
          source: "TST",
          _mod: { _: { mode: "setProp", prop: "hp", value: 25 } },
        },
        ac: 14,
      },
    };
    const derived: CopyModRawRecord = {
      name: "D",
      source: "TST",
      remaining: {
        _copy: { name: "C", source: "TST" },
        cr: 3,
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 4, records: [base, b, c, derived] },
          ],
          totalRecords: 4,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.result.record.remaining;
    expect(r.size).toBe("M");
    expect(r.ac).toBe(14);
    expect(r.hp).toBe(25);
    expect(r.cr).toBe(3);
  });

  it("intermediate mod failure stops outer materialization", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "badMode" } },
        },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Derived",
      source: "TST",
      remaining: {
        _copy: { name: "Middle", source: "TST" },
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("UNKNOWN_MOD_MODE");
    expect(diag.entityName).toBe("Middle");
    expect(diag.fieldTarget).toBe("trait");
    expect(diag.mode).toBe("badMode");
  });

  it("intermediate _mod failure retains its sourcePath", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: {
        _copy: {
          name: "Base",
          source: "BAS",
          _mod: { trait: { mode: "badMode" } },
        },
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "middle-monster.json",
        identity: { name: "Middle", source: "MID" },
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]?.sourcePath).toBe("middle-monster.json");
  });

  it("intermediate _mod failure retains its sourceEntityKind", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: {
        _copy: {
          name: "Base",
          source: "BAS",
          _mod: { trait: { mode: "badMode" } },
        },
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "middle-monster.json",
        identity: { name: "Middle", source: "MID" },
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]?.sourceEntityKind).toBe("monster");
  });

  it("intermediate failure retains the chain identity", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: {
        _copy: {
          name: "Base",
          source: "BAS",
          _mod: { trait: { mode: "badMode" } },
        },
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "middle-monster.json",
        identity: { name: "Middle", source: "MID" },
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.requestedIdentity).toEqual({ name: "Middle", source: "MID" });
    expect(diag.inheritanceChain?.[0]?.identity).toEqual({ name: "Middle", source: "MID" });
  });

  it("missing intermediate record reports the missing step, not the outer derived record", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { size: "M" },
    };
    const missingIdentity = { name: "Middle", source: "MID" } as const;
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "missing-middle.json",
        identity: missingIdentity,
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, []);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.sourcePath).toBe("missing-middle.json");
    expect(diag.sourceEntityKind).toBe("monster");
    expect(diag.entityName).toBe("Middle");
    expect(diag.entitySource).toBe("MID");
    expect(diag.requestedIdentity).toEqual(missingIdentity);
  });

  it("outer _mod is not executed after an intermediate failure", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "innerBadMode" } },
        },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Derived",
      source: "TST",
      remaining: {
        _copy: {
          name: "Middle",
          source: "TST",
          _mod: { trait: { mode: "outerBadMode" } },
        },
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.mode).toBe("innerBadMode");
  });

  it("shared outer and intermediate _mod execution produce identical diagnostic fields", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [] },
    };
    const direct: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "badMode" } },
        },
      },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "TST",
      remaining: {
        _copy: { name: "Middle", source: "TST" },
      },
    };
    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, direct, outer] },
          ],
          totalRecords: 3,
        },
      },
    };

    const outerResult = materializeCopyWithMods(direct, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });
    const intermediateResult = materializeCopyWithMods(outer, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(outerResult.ok).toBe(false);
    expect(intermediateResult.ok).toBe(false);
    if (outerResult.ok || intermediateResult.ok) throw new Error("Expected failures");
    const commonFields = (diag: MaterializationDiagnostic) => ({
      code: diag.code,
      severity: diag.severity,
      message: diag.message,
      sourcePath: diag.sourcePath,
      sourceEntityKind: diag.sourceEntityKind,
      entityName: diag.entityName,
      entitySource: diag.entitySource,
      fieldTarget: diag.fieldTarget,
      mode: diag.mode,
      rawParam: diag.rawParam,
    });
    expect(commonFields(intermediateResult.diagnostics[0] as MaterializationDiagnostic))
      .toEqual(commonFields(outerResult.diagnostics[0] as MaterializationDiagnostic));
  });

  it("intermediate preserve validation failure stops outer materialization", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { page: false } },
      },
    };
    const derived: CopyModRawRecord = {
      name: "Derived",
      source: "TST",
      remaining: {
        _copy: { name: "Middle", source: "TST" },
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag.code).toBe("INVALID_PRESERVE_MARKER");
    expect(diag.entityName).toBe("Middle");
  });

  it("intermediate preserve failure retains its sourcePath", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { size: "M" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: {
        _copy: { name: "Base", source: "BAS", _preserve: { page: false } },
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "middle-monster.json",
        identity: { name: "Middle", source: "MID" },
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]?.sourcePath).toBe("middle-monster.json");
  });

  it("intermediate preserve failure retains its sourceEntityKind", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "BAS",
      remaining: { size: "M" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: {
        _copy: { name: "Base", source: "BAS", _preserve: { page: false } },
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "MID",
        entityKind: "monster",
        sourcePath: "middle-monster.json",
        identity: { name: "Middle", source: "MID" },
      },
      {
        entityName: "Base",
        sourceAbbr: "BAS",
        entityKind: "monster",
        sourcePath: "base-monster.json",
        identity: { name: "Base", source: "BAS" },
      },
    ];
    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.diagnostics[0]?.sourceEntityKind).toBe("monster");
  });

  it("resolveCopyWithMods also materializes nested levels", () => {
    const base: CopyModRawRecord = {
      name: "Centaur",
      source: "GGR",
      remaining: { size: "L", ac: 14, cr: 3 },
    };
    const middle: CopyModRawRecord = {
      name: "Centaur MOT",
      source: "MOT",
      remaining: {
        _copy: { name: "Centaur", source: "GGR" },
        ac: 16,
      },
    };
    const derived: CopyModRawRecord = {
      name: "Centaur Variant",
      source: "MOT",
      remaining: {
        _copy: { name: "Centaur MOT", source: "MOT" },
        cr: 4,
      },
    };

    const ctx = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, derived] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = resolveCopyWithMods(derived, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const r = result.record.remaining;
    expect(r.size).toBe("L");
    expect(r.ac).toBe(16);
    expect(r.cr).toBe(4);
  });
});

describe("nested materialization with located copy levels", () => {
  it("materializes nested levels from stored records without boundary rediscovery", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", ac: 12 },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" }, ac: 16 },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "TST",
        entityKind: "monster",
        sourcePath: "missing-middle.json",
        identity: { name: "Middle", source: "TST" },
      },
      {
        entityName: "Base",
        sourceAbbr: "TST",
        entityKind: "monster",
        sourcePath: "missing-base.json",
        identity: { name: "Base", source: "TST" },
      },
    ];

    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(result.record.remaining).toEqual({ size: "M", ac: 16 });
  });

  it("uses the records selected at resolution even after context records change", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { size: "M", ac: 12 },
    };
    const selectedMiddle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" }, ac: 16 },
    };
    const replacementMiddle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: { _copy: { name: "Base", source: "TST" }, ac: 20 },
    };
    const records = [base, selectedMiddle];
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 2, records },
          ],
          totalRecords: 2,
        },
      },
    };
    const resolved = resolveCopy(
      { name: "Derived", source: "TST", remaining: { _copy: { name: "Middle", source: "TST" } } },
      ctx,
      { sourcePath: "monster.json", sourceEntityKind: "monster" },
    );
    expect(isCopyResolutionSuccess(resolved)).toBe(true);
    if (!isCopyResolutionSuccess(resolved)) throw new Error("Expected success");

    records.splice(1, 1, replacementMiddle);
    const result = materializeNestedCopyLevels(
      resolved.baseEntity,
      resolved.chain,
      resolved.locatedLevels,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(resolved.locatedLevels[0]!.record).toBe(selectedMiddle);
    expect(result.record.remaining.ac).toBe(16);
  });

  it("leaves base, intermediate, and outer records unchanged and strips consumed directives", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { trait: [{ name: "Base Trait" }], size: "M" },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: {
          name: "Base",
          source: "TST",
          _mod: { trait: { mode: "appendArr", items: { name: "Middle Trait" } } },
        },
        ac: 15,
      },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "TST",
      remaining: {
        _copy: {
          name: "Middle",
          source: "TST",
          _preserve: { "*": true },
          _mod: { trait: { mode: "appendArr", items: { name: "Outer Trait" } } },
        },
      },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "monster.json": {
          filePath: "monster.json",
          collections: [
            { entityKind: "monster", recordCount: 3, records: [base, middle, outer] },
          ],
          totalRecords: 3,
        },
      },
    };

    const result = materializeCopyWithMods(outer, ctx, {
      sourcePath: "monster.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(base.remaining).toEqual({ trait: [{ name: "Base Trait" }], size: "M" });
    expect(middle.remaining).toEqual({
      _copy: {
        name: "Base",
        source: "TST",
        _mod: { trait: { mode: "appendArr", items: { name: "Middle Trait" } } },
      },
      ac: 15,
    });
    expect(outer.remaining).toEqual({
      _copy: {
        name: "Middle",
        source: "TST",
        _preserve: { "*": true },
        _mod: { trait: { mode: "appendArr", items: { name: "Outer Trait" } } },
      },
    });
    expect(result.result.record.remaining).not.toHaveProperty("_copy");
    expect(result.result.record.remaining).not.toHaveProperty("_mod");
    expect(result.result.record.remaining).not.toHaveProperty("_preserve");
  });

  it("nested top-level _preserve self-reference succeeds without a false cycle", () => {
    const intermediate: CopyModRawRecord = {
      name: "Intermediate",
      source: "MID",
      remaining: {
        _copy: { name: "Intermediate", source: "MID" },
        _preserve: true,
        trait: [{ name: "Intermediate Trait" }],
        size: "M",
      },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "OUT",
      remaining: {
        _copy: { name: "Intermediate", source: "MID" },
        ac: 17,
      },
    };
    const originalIntermediate = JSON.parse(JSON.stringify(intermediate)) as CopyModRawRecord;
    const originalOuter = JSON.parse(JSON.stringify(outer)) as CopyModRawRecord;
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "intermediate.json": {
          filePath: "intermediate.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [intermediate] }],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(outer, ctx, {
      sourcePath: "outer.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected materialization success");
    expect(result.result.inheritanceChain.map((step) => step.entityName)).toEqual(["Intermediate", "Intermediate"]);
    expect(result.result.inheritanceChain.map((step) => step.sourcePath)).toEqual(["intermediate.json", "intermediate.json"]);
    expect(result.result.metadata.diagnostics).toHaveLength(0);
    expect(result.result.record.remaining).toMatchObject({
      trait: [{ name: "Intermediate Trait" }],
      size: "M",
      ac: 17,
    });
    expect(result.result.record.remaining).not.toHaveProperty("_copy");
    expect(result.result.record.remaining).not.toHaveProperty("_preserve");
    expect(intermediate).toEqual(originalIntermediate);
    expect(outer).toEqual(originalOuter);
  });

  it("nested missing-base diagnostic identifies the intermediate record", () => {
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Missing", source: "BAS" } },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "OUT",
      remaining: { _copy: { name: "Middle", source: "MID" } },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
      },
    };

    const result = materializeCopyWithMods(outer, ctx, {
      sourcePath: "outer.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag).toMatchObject({
      code: "BASE_ENTITY_NOT_FOUND",
      entityName: "Middle",
      entitySource: "MID",
      sourcePath: "middle.json",
      sourceEntityKind: "monster",
      requestedIdentity: { name: "Missing", source: "BAS" },
    });
    expect(diag.inheritanceChain?.map((step) => step.entityName)).toEqual(["Middle", "Missing"]);
  });

  it("nested ambiguity diagnostic identifies the intermediate record", () => {
    const baseA: CopyModRawRecord = { name: "Base", source: "BAS", remaining: {} };
    const baseB: CopyModRawRecord = { name: "Base", source: "BAS", remaining: {} };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "MID",
      remaining: { _copy: { name: "Base", source: "BAS" } },
    };
    const outer: CopyModRawRecord = {
      name: "Outer",
      source: "OUT",
      remaining: { _copy: { name: "Middle", source: "MID" } },
    };
    const ctx: CopyResolverContext = {
      validatedFiles: {
        "middle.json": {
          filePath: "middle.json",
          collections: [{ entityKind: "monster", recordCount: 1, records: [middle] }],
          totalRecords: 1,
        },
        "base.json": {
          filePath: "base.json",
          collections: [{ entityKind: "monster", recordCount: 2, records: [baseA, baseB] }],
          totalRecords: 2,
        },
      },
    };

    const result = materializeCopyWithMods(outer, ctx, {
      sourcePath: "outer.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const diag = result.diagnostics[0] as MaterializationDiagnostic;
    expect(diag).toMatchObject({
      code: "AMBIGUOUS_BASE_ENTITY",
      entityName: "Middle",
      entitySource: "MID",
      sourcePath: "middle.json",
      sourceEntityKind: "monster",
      requestedIdentity: { name: "Base", source: "BAS" },
    });
    expect(diag.ambiguityCandidates).toHaveLength(2);
    expect(diag.inheritanceChain?.map((step) => step.entityName)).toEqual(["Middle", "Base"]);
  });

  it("does not include raw stored records in materialization diagnostics", () => {
    const base: CopyModRawRecord = {
      name: "Base",
      source: "TST",
      remaining: { page: 1 },
    };
    const middle: CopyModRawRecord = {
      name: "Middle",
      source: "TST",
      remaining: {
        _copy: { name: "Base", source: "TST", _preserve: { page: false } },
        rawOnlyMarker: "do-not-serialize",
      },
    };
    const chain: readonly CopyChainStep[] = [
      {
        entityName: "Middle",
        sourceAbbr: "TST",
        entityKind: "monster",
        sourcePath: "middle.json",
        identity: { name: "Middle", source: "TST" },
      },
      {
        entityName: "Base",
        sourceAbbr: "TST",
        entityKind: "monster",
        sourcePath: "base.json",
        identity: { name: "Base", source: "TST" },
      },
    ];

    const result = materializeNestedCopyLevels(base, chain, makeLocatedLevels(chain, [middle, base]));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const serialized = JSON.stringify(result.diagnostics);
    expect(serialized).toContain("\"inheritanceChain\"");
    expect(serialized).not.toContain("rawOnlyMarker");
    expect(serialized).not.toContain("do-not-serialize");
  });
});
