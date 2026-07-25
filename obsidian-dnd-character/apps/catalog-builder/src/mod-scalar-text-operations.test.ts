import { describe, expect, it } from "vitest";
import type { CopyResolverContext } from "./copy-resolver";
import type { CopyModRawRecord } from "./mod-copy-resolver";
import { resolveCopyWithMods } from "./mod-copy-resolver";

function makeRecord(name: string, source: string, remaining: Record<string, unknown>): CopyModRawRecord {
  return { name, source, remaining };
}

function makeContext(base: CopyModRawRecord): CopyResolverContext {
  return {
    validatedFiles: {
      "bestiary/template.json": {
        entityKind: "monster",
        recordCount: 1,
        records: [base],
      },
    },
  };
}

function resolveVariant(base: CopyModRawRecord, mod: Record<string, unknown>) {
  const variant = makeRecord("Half-Strength Ogre", "TST", {
    _copy: { name: base.name, source: base.source, _mod: mod },
  });
  return { result: resolveCopyWithMods(variant, makeContext(base), { sourcePath: "test.json" }), variant };
}

describe("resolveCopyWithMods — scalar, property, text, and size operations", () => {
  it("applies S2 operations to a cloned resolved record", () => {
    const base = makeRecord("Ogre Mage", "TST", {
      size: "H",
      hp: { average: 101, formula: "12d12 + 24" },
      save: { str: 6, con: 5 },
      spellcasting: [
        {
          headerEntries: ["Spell save DC 15, +7 to hit with spell attacks."],
        },
      ],
      trait: [{ name: "The devil", entries: ["the devil makes one attack."] }],
      xp: 2300,
    });

    const { result } = resolveVariant(base, {
      _: [
        { mode: "maxSize", max: "L" },
        { mode: "scalarMultXp", scalar: 0.5, floor: true },
        { mode: "setProp", prop: "vulnerable", value: null },
      ],
      "*": { mode: "replaceTxt", replace: "the devil", with: "Bitter Breath", flags: "i" },
      hp: [
        { mode: "prefixSuffixStringProp", prop: "formula", prefix: "floor((", suffix: ") / 2)" },
        { mode: "scalarMultProp", prop: "average", scalar: 0.5, floor: true },
      ],
      save: { mode: "scalarAddProp", scalar: -2, prop: "*" },
      spellcasting: [
        { mode: "scalarAddDc", scalar: -2 },
        { mode: "scalarAddHit", scalar: -2 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected modded copy success");
    expect(result.record.remaining).toEqual({
      size: "L",
      hp: { average: 50, formula: "floor((12d12 + 24) / 2)" },
      save: { str: 4, con: 3 },
      spellcasting: [
        {
          headerEntries: ["Spell save DC 13, +5 to hit with spell attacks."],
        },
      ],
      trait: [{ name: "Bitter Breath", entries: ["Bitter Breath makes one attack."] }],
      xp: 1150,
      vulnerable: null,
    });
  });

  it("does not mutate the original base or input copy record", () => {
    const base = makeRecord("Ogre Mage", "TST", { hp: { average: 101 }, xp: 2300 });
    const { result, variant } = resolveVariant(base, {
      hp: { mode: "scalarMultProp", prop: "average", scalar: 0.5, floor: true },
      _: { mode: "scalarMultXp", scalar: 0.5, floor: true },
    });

    expect(result.ok).toBe(true);
    expect(base.remaining).toEqual({ hp: { average: 101 }, xp: 2300 });
    expect(variant.remaining).toEqual({
      _copy: {
        name: "Ogre Mage",
        source: "TST",
        _mod: {
          hp: { mode: "scalarMultProp", prop: "average", scalar: 0.5, floor: true },
          _: { mode: "scalarMultXp", scalar: 0.5, floor: true },
        },
      },
    });
  });

  it("reports malformed S2 payloads with source, entity, field, mode, and parameter", () => {
    const base = makeRecord("Ogre Mage", "TST", { hp: { average: 101 } });
    const cases: Array<{ field: string; mode: string; payload: Record<string, unknown> }> = [
      { field: "_", mode: "maxSize", payload: { mode: "maxSize", max: 5 } },
      {
        field: "hp",
        mode: "prefixSuffixStringProp",
        payload: { mode: "prefixSuffixStringProp", prop: "formula", prefix: "(" },
      },
      { field: "*", mode: "replaceTxt", payload: { mode: "replaceTxt", replace: "(", with: "x" } },
      { field: "spellcasting", mode: "scalarAddDc", payload: { mode: "scalarAddDc", scalar: "2" } },
      { field: "spellcasting", mode: "scalarAddHit", payload: { mode: "scalarAddHit", scalar: "2" } },
      { field: "save", mode: "scalarAddProp", payload: { mode: "scalarAddProp", scalar: 1 } },
      { field: "hp", mode: "scalarMultProp", payload: { mode: "scalarMultProp", prop: "average", scalar: "half" } },
      { field: "_", mode: "scalarMultXp", payload: { mode: "scalarMultXp", scalar: null } },
      { field: "_", mode: "setProp", payload: { mode: "setProp", value: null } },
    ];

    for (const testCase of cases) {
      const { result } = resolveVariant(base, { [testCase.field]: testCase.payload });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error(`Expected malformed ${testCase.mode} failure`);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]).toMatchObject({
        code: "INVALID_MOD_PAYLOAD",
        sourcePath: "test.json",
        entityName: "Half-Strength Ogre",
        entitySource: "TST",
        fieldTarget: testCase.field,
        mode: testCase.mode,
        rawParam: testCase.payload,
      });
    }
  });

  it("reports unknown modes with source, entity, field, and mode", () => {
    const base = makeRecord("Ogre Mage", "TST", { hp: { average: 101 } });
    const { result } = resolveVariant(base, {
      hp: { mode: "multiplyEverything", scalar: 2 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected unknown mode failure");
    expect(result.diagnostics[0]).toMatchObject({
      code: "UNKNOWN_MOD_MODE",
      sourcePath: "test.json",
      entityName: "Half-Strength Ogre",
      entitySource: "TST",
      fieldTarget: "hp",
      mode: "multiplyEverything",
    });
  });
});
