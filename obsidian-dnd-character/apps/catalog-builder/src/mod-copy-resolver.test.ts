import { describe, expect, it } from "vitest";
import type { CopyResolverContext } from "./copy-resolver";
import { resolveCopyWithMods, type CopyModRawRecord } from "./mod-copy-resolver";

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
