import { describe, it, expect } from "vitest";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import {
  selectAbilityScoreMethod,
  validatePointBuyScores,
  validateCustomScores,
} from "./character-ability-score-methods";

/* ── Helper: draft with resolved ruleset ────────────────────────── */

function draftWithRuleset(ruleset: "2014" | "2024"): CharacterDraft {
  const draft = createEmptyCharacterDraft();
  selectRuleset(draft, ruleset);
  return draft;
}

/* ── selectAbilityScoreMethod: negative cases ───────────────────── */

describe("selectAbilityScoreMethod (negative)", () => {
  it("rejects when ruleset step is unresolved", () => {
    const draft = createEmptyCharacterDraft();
    // ruleset is null and stepStatuses.ruleset is "unvisited"
    expect(selectAbilityScoreMethod(draft, "point-buy")).toBe(false);
    expect(draft.abilities.method).toBeNull();
  });

  it("rejects invalid method string", () => {
    const draft = draftWithRuleset("2014");
    expect(selectAbilityScoreMethod(draft, "dice-rolling")).toBe(false);
    expect(draft.abilities.method).toBeNull();
  });

  it("rejects non-string method", () => {
    const draft = draftWithRuleset("2014");
    expect(selectAbilityScoreMethod(draft, 42)).toBe(false);
    expect(selectAbilityScoreMethod(draft, null)).toBe(false);
    expect(selectAbilityScoreMethod(draft, undefined)).toBe(false);
    expect(selectAbilityScoreMethod(draft, {})).toBe(false);
    expect(draft.abilities.method).toBeNull();
  });

  it("rejects standard-array on 2024 ruleset", () => {
    const draft = draftWithRuleset("2024");
    expect(selectAbilityScoreMethod(draft, "standard-array")).toBe(false);
    expect(draft.abilities.method).toBeNull();
  });

  it("leaves draft unchanged on rejection", () => {
    const draft = draftWithRuleset("2014");
    draft.abilities.method = "point-buy";
    selectAbilityScoreMethod(draft, "standard-array"); // valid for 2014
    // Now draft.abilities.method is "standard-array"
    // Try to set an invalid method
    selectAbilityScoreMethod(draft, "dice-rolling");
    // Should still be "standard-array"
    expect(draft.abilities.method).toBe("standard-array");
  });
});

/* ── validatePointBuyScores: negative cases ─────────────────────── */

describe("validatePointBuyScores (negative)", () => {
  it("rejects scores below 8", () => {
    const scores = { STR: 7, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(validatePointBuyScores(scores, "2014")).toBe(false);
    expect(validatePointBuyScores(scores, "2024")).toBe(false);
  });

  it("rejects scores above 15", () => {
    const scores = { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(validatePointBuyScores(scores, "2014")).toBe(false);
    expect(validatePointBuyScores(scores, "2024")).toBe(false);
  });

  it("rejects exceeding 2014 budget (27pt > 26)", () => {
    // 15(9) + 14(7) + 13(5) + 12(4) + 10(2) + 8(0) = 27
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    expect(validatePointBuyScores(scores, "2014")).toBe(false);
  });

  it("rejects exceeding 2024 budget (28pt > 27)", () => {
    // 15(9) + 15(9) + 12(4) + 12(4) + 10(2) + 8(0) = 28
    const scores = { STR: 15, DEX: 15, CON: 12, INT: 12, WIS: 10, CHA: 8 };
    expect(validatePointBuyScores(scores, "2024")).toBe(false);
  });

  it("rejects missing ability score", () => {
    const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10 };
    // @ts-expect-error - intentionally missing CHA
    expect(validatePointBuyScores(scores, "2014")).toBe(false);
  });
});

/* ── validateCustomScores: negative cases ───────────────────────── */

describe("validateCustomScores (negative)", () => {
  it("rejects score below 1", () => {
    const scores = { STR: 0, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(validateCustomScores(scores)).toBe(false);
  });

  it("rejects score above 30", () => {
    const scores = { STR: 31, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    expect(validateCustomScores(scores)).toBe(false);
  });

  it("rejects negative scores", () => {
    const scores = {
      STR: -5,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    };
    expect(validateCustomScores(scores)).toBe(false);
  });

  it("rejects non-integer scores", () => {
    const scores = {
      STR: 10.5,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10,
    };
    expect(validateCustomScores(scores)).toBe(false);
  });

  it("rejects missing ability score", () => {
    const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10 };
    // @ts-expect-error - intentionally missing CHA
    expect(validateCustomScores(scores)).toBe(false);
  });
});
