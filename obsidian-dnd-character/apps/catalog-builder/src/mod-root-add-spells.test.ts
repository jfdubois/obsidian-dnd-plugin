import { describe, expect, it } from "vitest";
import { resolveCopyWithMods } from "./mod-copy-resolver";
import type { CopyResolverContext } from "./copy-resolver";
import type { CopyModRawRecord } from "./mod-copy-resolver";

function makeContext(records: CopyModRawRecord[]): CopyResolverContext {
  return {
    validatedFiles: {
      "test.json": {
        filePath: "test.json",
        collections: [
          {
            entityKind: "monster",
            recordCount: records.length,
            records,
          },
        ],
        totalRecords: records.length,
      },
    },
  };
}

describe("resolveCopyWithMods: addSpells", () => {
  it("applies addSpells to a cloned resolved spellcasting record", () => {
    const base: CopyModRawRecord = {
      name: "Archmage",
      source: "TST",
      remaining: {
        spellcasting: [
          {
            name: "Spellcasting",
            will: ["{@spell detect magic}"],
            spells: {
              "5": {
                slots: 1,
                spells: ["{@spell scrying}"],
              },
            },
          },
        ],
      },
    };
    const record: CopyModRawRecord = {
      name: "Elemental Archmage",
      source: "TST",
      remaining: {
        _copy: {
          name: "Archmage",
          source: "TST",
          _mod: {
            _: {
              mode: "addSpells",
              will: ["{@spell polymorph} (self only)"],
              spells: {
                "5": {
                  spells: ["{@spell conjure elemental}"],
                },
              },
            },
          },
        },
      },
    };

    const result = resolveCopyWithMods(record, makeContext([base]), {
      sourcePath: "bestiary/bestiary-cm.json",
      sourceEntityKind: "monster",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected addSpells resolution to succeed");
    expect(result.record.remaining).toEqual({
      spellcasting: [
        {
          name: "Spellcasting",
          will: ["{@spell detect magic}", "{@spell polymorph} (self only)"],
          spells: {
            "5": {
              slots: 1,
              spells: ["{@spell scrying}", "{@spell conjure elemental}"],
            },
          },
        },
      ],
    });
    expect(base.remaining).toEqual({
      spellcasting: [
        {
          name: "Spellcasting",
          will: ["{@spell detect magic}"],
          spells: {
            "5": {
              slots: 1,
              spells: ["{@spell scrying}"],
            },
          },
        },
      ],
    });
    expect(record.remaining).toEqual({
      _copy: {
        name: "Archmage",
        source: "TST",
        _mod: {
          _: {
            mode: "addSpells",
            will: ["{@spell polymorph} (self only)"],
            spells: {
              "5": {
                spells: ["{@spell conjure elemental}"],
              },
            },
          },
        },
      },
    });
  });

  it("rejects malformed addSpells payload with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Elemental Archmage",
        source: "TST",
        remaining: {
          _copy: {
            name: "Archmage",
            source: "TST",
            _mod: {
              _: { mode: "addSpells", spells: { "5": ["{@spell conjure elemental}"] } },
            },
          },
        },
      },
      makeContext([
        {
          name: "Archmage",
          source: "TST",
          remaining: { spellcasting: [{ spells: { "5": { spells: [] } } }] },
        },
      ]),
      { sourcePath: "bestiary/bestiary-cm.json", sourceEntityKind: "monster" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected addSpells resolution to fail");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "bestiary/bestiary-cm.json",
      entityName: "Elemental Archmage",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "addSpells",
    });
    expect(result.diagnostics[0]?.message).toContain("level entries");
    expect(result.diagnostics[0]?.rawParam).toMatchObject({ mode: "addSpells" });
  });
});
