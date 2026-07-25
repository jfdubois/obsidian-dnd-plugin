import { describe, expect, it } from "vitest";
import { resolveCopyWithMods } from "./mod-copy-resolver";
import type { CopyResolverContext } from "./copy-resolver";
import type { CopyModRawRecord } from "./mod-copy-resolver";

function makeContext(records: CopyModRawRecord[]): CopyResolverContext {
  return {
    validatedFiles: {
      "test.json": {
        entityKind: "monster",
        recordCount: records.length,
        records,
      },
    },
  };
}

describe("resolveCopyWithMods: replaceSpells", () => {
  it("applies replaceSpells to a cloned resolved spellcasting record", () => {
    const base: CopyModRawRecord = {
      name: "Archmage",
      source: "TST",
      remaining: {
        spellcasting: [
          {
            spells: {
              "7": {
                slots: 1,
                spells: ["{@spell teleport}", "{@spell forcecage}"],
              },
            },
          },
        ],
      },
    };
    const record: CopyModRawRecord = {
      name: "Traxigor",
      source: "TST",
      remaining: {
        _copy: {
          name: "Archmage",
          source: "TST",
          _mod: {
            _: {
              mode: "replaceSpells",
              spells: {
                "7": [{ replace: "{@spell teleport}", with: "{@spell plane shift}" }],
              },
            },
          },
        },
      },
    };

    const result = resolveCopyWithMods(record, makeContext([base]), {
      sourcePath: "bestiary/bestiary-bgdia.json",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected replaceSpells resolution to succeed");
    expect(result.record.remaining).toEqual({
      spellcasting: [
        {
          spells: {
            "7": {
              slots: 1,
              spells: ["{@spell plane shift}", "{@spell forcecage}"],
            },
          },
        },
      ],
    });
    expect(base.remaining).toEqual({
      spellcasting: [
        {
          spells: {
            "7": {
              slots: 1,
              spells: ["{@spell teleport}", "{@spell forcecage}"],
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
            mode: "replaceSpells",
            spells: {
              "7": [{ replace: "{@spell teleport}", with: "{@spell plane shift}" }],
            },
          },
        },
      },
    });
  });

  it("rejects malformed replaceSpells payload with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Traxigor",
        source: "TST",
        remaining: {
          _copy: {
            name: "Archmage",
            source: "TST",
            _mod: {
              _: { mode: "replaceSpells", spells: { "7": [{ replace: "{@spell teleport}" }] } },
            },
          },
        },
      },
      makeContext([
        {
          name: "Archmage",
          source: "TST",
          remaining: { spellcasting: [{ spells: { "7": { spells: ["{@spell teleport}"] } } }] },
        },
      ]),
      { sourcePath: "bestiary/bestiary-bgdia.json" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected replaceSpells resolution to fail");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "bestiary/bestiary-bgdia.json",
      entityName: "Traxigor",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "replaceSpells",
    });
    expect(result.diagnostics[0]?.message).toContain("replacement arrays");
    expect(result.diagnostics[0]?.rawParam).toMatchObject({ mode: "replaceSpells" });
  });
});
