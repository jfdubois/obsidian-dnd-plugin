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

describe("resolveCopyWithMods: removeSpells", () => {
  it("applies removeSpells to a cloned resolved spellcasting record", () => {
    const base: CopyModRawRecord = {
      name: "Ultroloth",
      source: "TST",
      remaining: {
        spellcasting: [
          {
            daily: {
              "3e": ["{@spell dimension door}", "{@spell fear}", "{@spell fly}"],
              "1e": ["{@spell fire storm}", "{@spell mass suggestion}"],
            },
          },
        ],
      },
    };
    const record: CopyModRawRecord = {
      name: "Jijibisha",
      source: "TST",
      remaining: {
        _copy: {
          name: "Ultroloth",
          source: "TST",
          _mod: {
            _: {
              mode: "removeSpells",
              daily: {
                "3e": ["{@spell dimension door}", "{@spell fear}"],
                "1e": ["{@spell fire storm}", "{@spell mass suggestion}"],
              },
            },
          },
        },
      },
    };

    const result = resolveCopyWithMods(record, makeContext([base]), {
      sourcePath: "bestiary/bestiary-jttrc.json",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected removeSpells resolution to succeed");
    expect(result.record.remaining).toEqual({
      spellcasting: [
        {
          daily: {
            "3e": ["{@spell fly}"],
            "1e": [],
          },
        },
      ],
    });
    expect(base.remaining).toEqual({
      spellcasting: [
        {
          daily: {
            "3e": ["{@spell dimension door}", "{@spell fear}", "{@spell fly}"],
            "1e": ["{@spell fire storm}", "{@spell mass suggestion}"],
          },
        },
      ],
    });
    expect(record.remaining).toEqual({
      _copy: {
        name: "Ultroloth",
        source: "TST",
        _mod: {
          _: {
            mode: "removeSpells",
            daily: {
              "3e": ["{@spell dimension door}", "{@spell fear}"],
              "1e": ["{@spell fire storm}", "{@spell mass suggestion}"],
            },
          },
        },
      },
    });
  });

  it("rejects malformed removeSpells payload with contextual diagnostics", () => {
    const result = resolveCopyWithMods(
      {
        name: "Jijibisha",
        source: "TST",
        remaining: {
          _copy: {
            name: "Ultroloth",
            source: "TST",
            _mod: {
              _: { mode: "removeSpells", daily: { "3e": "{@spell fear}" } },
            },
          },
        },
      },
      makeContext([
        {
          name: "Ultroloth",
          source: "TST",
          remaining: { spellcasting: [{ daily: { "3e": ["{@spell fear}"] } }] },
        },
      ]),
      { sourcePath: "bestiary/bestiary-jttrc.json" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected removeSpells resolution to fail");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_MOD_PAYLOAD",
      sourcePath: "bestiary/bestiary-jttrc.json",
      entityName: "Jijibisha",
      entitySource: "TST",
      fieldTarget: "_",
      mode: "removeSpells",
    });
    expect(result.diagnostics[0]?.message).toContain("keyed entries");
    expect(result.diagnostics[0]?.rawParam).toMatchObject({ mode: "removeSpells" });
  });
});
