import { describe, it, expect } from "vitest";
import {
  parseModOperation,
  parseModBlock,
  isKnownModMode,
  isKnownModOperation,
  isUnknownModDiagnostic,
  isRawModBlock,
  KNOWN_MOD_OPERATION_MODES,
  type KnownModOperation,
} from "./mod-parser";

/* ── Known modes registry ──────────────────────────────────────── */

describe("KNOWN_MOD_OPERATION_MODES registry", () => {
  it("contains exactly 21 known modes", () => {
    expect(KNOWN_MOD_OPERATION_MODES.size).toBe(21);
  });

  it("contains all expected modes", () => {
    const expected = [
      "addSenses",
      "addSkills",
      "addSpells",
      "appendArr",
      "appendIfNotExistsArr",
      "insertArr",
      "maxSize",
      "prefixSuffixStringProp",
      "prependArr",
      "removeArr",
      "removeSpells",
      "renameArr",
      "replaceArr",
      "replaceSpells",
      "replaceTxt",
      "scalarAddDc",
      "scalarAddHit",
      "scalarAddProp",
      "scalarMultProp",
      "scalarMultXp",
      "setProp",
    ];
    for (const mode of expected) {
      expect(KNOWN_MOD_OPERATION_MODES.has(mode)).toBe(true);
    }
  });

  it("rejects unknown modes", () => {
    expect(KNOWN_MOD_OPERATION_MODES.has("unknownMode")).toBe(false);
    expect(KNOWN_MOD_OPERATION_MODES.has("deleteField")).toBe(false);
    expect(KNOWN_MOD_OPERATION_MODES.has("")).toBe(false);
  });
});

/* ── isKnownModMode ────────────────────────────────────────────── */

describe("isKnownModMode", () => {
  it("accepts known modes", () => {
    expect(isKnownModMode("appendArr")).toBe(true);
    expect(isKnownModMode("replaceTxt")).toBe(true);
    expect(isKnownModMode("scalarAddDc")).toBe(true);
  });

  it("rejects unknown modes", () => {
    expect(isKnownModMode("unknownMode")).toBe(false);
    expect(isKnownModMode("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isKnownModMode(null)).toBe(false);
    expect(isKnownModMode(42)).toBe(false);
    expect(isKnownModMode({})).toBe(false);
  });
});

/* ── parseModOperation: each known mode ────────────────────────── */

describe("parseModOperation — known modes", () => {
  it("parses addSenses (bestiary/template.json)", () => {
    const raw = { mode: "addSenses", senses: { type: "darkvision", range: 120 } };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("addSenses");
    expect((result as KnownModOperation & { senses: { type: string; range: number } }).senses).toEqual({
      type: "darkvision",
      range: 120,
    });
  });

  it("parses addSkills (bestiary/bestiary-bgdia.json)", () => {
    const raw = { mode: "addSkills", skills: { investigation: 2 } };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("addSkills");
  });

  it("parses addSpells (bestiary/bestiary-cm.json)", () => {
    const raw = {
      mode: "addSpells",
      spells: { "5": { spells: ["{@spell conjure elemental}"] } },
    };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("addSpells");
  });

  it("parses appendArr (bestiary/bestiary-bgdia.json)", () => {
    const raw = {
      mode: "appendArr",
      items: [
        {
          name: "Healer",
          entries: [
            "Burney has the benefits of the {@feat healer} feat.",
          ],
        },
      ],
    };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("appendArr");
  });

  it("parses appendIfNotExistsArr (bestiary/bestiary-oota.json)", () => {
    const raw = {
      mode: "appendIfNotExistsArr",
      items: ["Dwarvish", "Elvish", "Undercommon"],
    };
    const result = parseModOperation(raw, "languages");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("appendIfNotExistsArr");
  });

  it("parses insertArr (backgrounds.json)", () => {
    const raw = {
      mode: "insertArr",
      index: 2,
      items: {
        name: "Baldur's Gate Feature: Religious Community",
        type: "entries",
        entries: [
          "You're tightly connected with the religious community.",
        ],
      },
    };
    const result = parseModOperation(raw, "entries");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("insertArr");
  });

  it("parses maxSize (bestiary/template.json)", () => {
    const raw = { mode: "maxSize", max: "L" };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("maxSize");
  });

  it("parses prefixSuffixStringProp (bestiary/template.json)", () => {
    const raw = {
      mode: "prefixSuffixStringProp",
      prop: "formula",
      prefix: "floor((",
      suffix: ") ÷ 2)",
    };
    const result = parseModOperation(raw, "hp");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("prefixSuffixStringProp");
  });

  it("parses prependArr (bestiary/bestiary-gos.json)", () => {
    const raw = {
      mode: "prependArr",
      items: {
        name: "Water Breathing",
        entries: ["The eel can breathe only underwater."],
      },
    };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("prependArr");
  });

  it("parses removeArr (bestiary/bestiary-bmt.json)", () => {
    const raw = { mode: "removeArr", names: "Bound" };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("removeArr");
  });

  it("parses removeSpells (bestiary/bestiary-jttrc.json)", () => {
    const raw = {
      mode: "removeSpells",
      daily: {
        "3e": ["{@spell dimension door}", "{@spell fear}"],
        "1e": ["{@spell fire storm}", "{@spell mass suggestion}"],
      },
    };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("removeSpells");
  });

  it("parses renameArr (bestiary/bestiary-qftis.json)", () => {
    const raw = {
      mode: "renameArr",
      renames: {
        rename: "Parry (Duelist Only)",
        with: "Parry",
      },
    };
    const result = parseModOperation(raw, "reaction");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("renameArr");
  });

  it("parses replaceArr (backgrounds.json)", () => {
    const raw = {
      mode: "replaceArr",
      replace: "Feature: Position of Privilege",
      items: {
        name: "Baldur's Gate Feature: Patriar",
        type: "entries",
        entries: ["As a member of one of the elite families..."],
      },
    };
    const result = parseModOperation(raw, "entries");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("replaceArr");
  });

  it("parses replaceSpells (bestiary/bestiary-bgdia.json)", () => {
    const raw = {
      mode: "replaceSpells",
      spells: {
        "7": [{ replace: "{@spell teleport}", with: "{@spell plane shift}" }],
      },
    };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("replaceSpells");
  });

  it("parses replaceTxt (bestiary/bestiary-bgdia.json)", () => {
    const raw = {
      mode: "replaceTxt",
      replace: "the devil",
      with: "Bitter Breath",
      flags: "i",
    };
    const result = parseModOperation(raw, "*");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("replaceTxt");
  });

  it("parses replaceTxt without flags", () => {
    const raw = {
      mode: "replaceTxt",
      replace: "the archmage",
      with: "Zikran",
    };
    const result = parseModOperation(raw, "*");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("replaceTxt");
  });

  it("parses scalarAddDc (bestiary/template.json)", () => {
    const raw = { mode: "scalarAddDc", scalar: -2 };
    const result = parseModOperation(raw, "spellcasting");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("scalarAddDc");
  });

  it("parses scalarAddHit (bestiary/template.json)", () => {
    const raw = { mode: "scalarAddHit", scalar: -2 };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("scalarAddHit");
  });

  it("parses scalarAddProp (bestiary/template.json)", () => {
    const raw = { mode: "scalarAddProp", scalar: -2, prop: "*" };
    const result = parseModOperation(raw, "save");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("scalarAddProp");
  });

  it("parses scalarMultProp (bestiary/template.json)", () => {
    const raw = {
      mode: "scalarMultProp",
      prop: "average",
      scalar: 0.5,
      floor: true,
    };
    const result = parseModOperation(raw, "hp");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("scalarMultProp");
  });

  it("parses scalarMultXp (bestiary/template.json)", () => {
    const raw = { mode: "scalarMultXp", scalar: 0.5, floor: true };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("scalarMultXp");
  });

  it("parses setProp (bestiary/bestiary-cos.json)", () => {
    const raw = { mode: "setProp", prop: "vulnerable", value: null };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(false);
    if (!isKnownModOperation(result)) throw new Error("Expected known");
    expect(result.mode).toBe("setProp");
  });
});

/* ── parseModOperation: rejection of unknown modes ─────────────── */

describe("parseModOperation — unknown modes", () => {
  it("rejects unknown mode string", () => {
    const raw = { mode: "deleteField", target: "x" };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(true);
    if (!isUnknownModDiagnostic(result)) throw new Error("Expected unknown");
    expect(result.code).toBe("UNKNOWN_MOD_MODE");
    expect(result.unknownMode).toBe("deleteField");
    expect(result.fieldTarget).toBe("trait");
  });

  it("rejects missing mode field", () => {
    const raw = { items: ["something"] };
    const result = parseModOperation(raw, "trait");
    expect(isUnknownModDiagnostic(result)).toBe(true);
    if (!isUnknownModDiagnostic(result)) throw new Error("Expected unknown");
    expect(result.code).toBe("UNKNOWN_MOD_MODE");
  });

  it("rejects non-string mode", () => {
    const raw = { mode: 42 };
    const result = parseModOperation(raw, "_");
    expect(isUnknownModDiagnostic(result)).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(isUnknownModDiagnostic(parseModOperation(null, "_"))).toBe(true);
    expect(isUnknownModDiagnostic(parseModOperation("string", "_"))).toBe(true);
    expect(isUnknownModDiagnostic(parseModOperation(42, "_"))).toBe(true);
    expect(isUnknownModDiagnostic(parseModOperation([], "_"))).toBe(true);
  });
});

/* ── parseModBlock ─────────────────────────────────────────────── */

describe("parseModBlock", () => {
  it("parses a block with single operations per field", () => {
    const raw = {
      trait: { mode: "appendArr", items: [{ name: "Trait" }] },
      "*": { mode: "replaceTxt", replace: "old", with: "new" },
    };
    const result = parseModBlock(raw);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0]!.fieldTarget).toBe("trait");
    expect(result.operations[0]!.operation.mode).toBe("appendArr");
    expect(result.operations[1]!.fieldTarget).toBe("*");
    expect(result.operations[1]!.operation.mode).toBe("replaceTxt");
  });

  it("parses a block with array operations per field", () => {
    const raw = {
      _: [
        { mode: "maxSize", max: "L" },
        { mode: "scalarMultXp", scalar: 0.5, floor: true },
      ],
    };
    const result = parseModBlock(raw);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0]!.operation.mode).toBe("maxSize");
    expect(result.operations[1]!.operation.mode).toBe("scalarMultXp");
  });

  it("parses a mixed block (single + array)", () => {
    const raw = {
      trait: { mode: "prependArr", items: { name: "New Trait" } },
      hp: [
        { mode: "scalarMultProp", prop: "average", scalar: 0.5, floor: true },
        { mode: "prefixSuffixStringProp", prop: "formula", prefix: "floor((", suffix: ") ÷ 2)" },
      ],
      save: { mode: "scalarAddProp", scalar: -2, prop: "*" },
    };
    const result = parseModBlock(raw);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.operations).toHaveLength(4);
    expect(result.operations[0]!.fieldTarget).toBe("trait");
    expect(result.operations[1]!.fieldTarget).toBe("hp");
    expect(result.operations[2]!.fieldTarget).toBe("hp");
    expect(result.operations[3]!.fieldTarget).toBe("save");
  });

  it("reports diagnostics for unknown modes within a block", () => {
    const raw = {
      trait: { mode: "appendArr", items: [] },
      _: { mode: "unknownOp", data: "x" },
    };
    const result = parseModBlock(raw);
    expect(result.operations).toHaveLength(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.unknownMode).toBe("unknownOp");
  });

  it("handles empty block", () => {
    const result = parseModBlock({});
    expect(result.operations).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    expect(parseModBlock(null).diagnostics.length).toBe(1);
    expect(parseModBlock([]).diagnostics.length).toBe(1);
    expect(parseModBlock("string").diagnostics.length).toBe(1);
  });
});

/* ── isRawModBlock ─────────────────────────────────────────────── */

describe("isRawModBlock", () => {
  it("accepts valid mod block with single operations", () => {
    expect(
      isRawModBlock({
        trait: { mode: "appendArr", items: [] },
      }),
    ).toBe(true);
  });

  it("accepts valid mod block with array operations", () => {
    expect(
      isRawModBlock({
        _: [{ mode: "maxSize", max: "L" }, { mode: "scalarMultXp", scalar: 0.5 }],
      }),
    ).toBe(true);
  });

  it("accepts empty block", () => {
    expect(isRawModBlock({})).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(isRawModBlock(null)).toBe(false);
    expect(isRawModBlock([])).toBe(false);
    expect(isRawModBlock("string")).toBe(false);
  });

  it("rejects operations without mode field", () => {
    expect(
      isRawModBlock({
        trait: { items: [] },
      }),
    ).toBe(false);
  });
});

/* ── isKnownModOperation / isUnknownModDiagnostic ──────────────── */

describe("type guards", () => {
  it("isKnownModOperation accepts valid operations", () => {
    expect(
      isKnownModOperation({ mode: "appendArr", items: [] }),
    ).toBe(true);
    expect(
      isKnownModOperation({ mode: "replaceTxt", replace: "a", with: "b" }),
    ).toBe(true);
  });

  it("isKnownModOperation rejects unknown modes", () => {
    expect(
      isKnownModOperation({ mode: "unknownMode", data: "x" }),
    ).toBe(false);
  });

  it("isKnownModOperation rejects non-objects", () => {
    expect(isKnownModOperation(null)).toBe(false);
    expect(isKnownModOperation("string")).toBe(false);
  });

  it("isUnknownModDiagnostic accepts diagnostics", () => {
    expect(
      isUnknownModDiagnostic({
        code: "UNKNOWN_MOD_MODE",
        severity: "error",
        message: "test",
        unknownMode: "x",
        fieldTarget: "_",
        rawOperation: {},
      }),
    ).toBe(true);
  });

  it("isUnknownModDiagnostic rejects non-matching objects", () => {
    expect(
      isUnknownModDiagnostic({ code: "OTHER_CODE" }),
    ).toBe(false);
  });
});
