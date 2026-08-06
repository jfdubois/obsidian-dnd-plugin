import { describe, it, expect } from "vitest";
import { ABILITIES } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import {
  selectAbilityScoreMethod,
  generateStandardArrayScores,
  validatePointBuyScores,
  generateRollingScores,
  validateCustomScores,
  getAvailableAbilityScoreMethods,
  isMethodAvailableForRuleset,
} from "./character-ability-score-methods";

/* ── Helper: draft with resolved ruleset ────────────────────────── */

function draftWithRuleset(ruleset: "2014" | "2024"): CharacterDraft {
  const draft = createEmptyCharacterDraft();
  selectRuleset(draft, ruleset);
  return draft;
}

/* ── getAvailableAbilityScoreMethods ────────────────────────────── */

describe("getAvailableAbilityScoreMethods", () => {
  it("returns standard-array, point-buy, rolling, custom for 2014", () => {
    const methods = getAvailableAbilityScoreMethods("2014");
    expect(methods).toEqual(
      expect.arrayContaining([
        "standard-array",
        "point-buy",
        "rolling",
        "custom",
      ]),
    );
    expect(methods).toHaveLength(4);
  });

  it("returns point-buy, rolling, custom for 2024", () => {
    const methods = getAvailableAbilityScoreMethods("2024");
    expect(methods).toEqual(
      expect.arrayContaining(["point-buy", "rolling", "custom"]),
    );
    expect(methods).toHaveLength(3);
    expect(methods).not.toContain("standard-array");
  });
});

/* ── isMethodAvailableForRuleset ────────────────────────────────── */

describe("isMethodAvailableForRuleset", () => {
  it("returns true for standard-array on 2014", () => {
    expect(isMethodAvailableForRuleset("standard-array", "2014")).toBe(true);
  });

  it("returns false for standard-array on 2024", () => {
    expect(isMethodAvailableForRuleset("standard-array", "2024")).toBe(false);
  });

  it("returns true for point-buy on both rulesets", () => {
    expect(isMethodAvailableForRuleset("point-buy", "2014")).toBe(true);
    expect(isMethodAvailableForRuleset("point-buy", "2024")).toBe(true);
  });
});

/* ── selectAbilityScoreMethod ───────────────────────────────────── */

describe("selectAbilityScoreMethod", () => {
  it("accepts valid method for 2014 ruleset", () => {
    const draft = draftWithRuleset("2014");
    expect(selectAbilityScoreMethod(draft, "standard-array")).toBe(true);
    expect(draft.abilities.method).toBe("standard-array");
  });

  it("accepts valid method for 2024 ruleset", () => {
    const draft = draftWithRuleset("2024");
    expect(selectAbilityScoreMethod(draft, "point-buy")).toBe(true);
    expect(draft.abilities.method).toBe("point-buy");
  });

  it("clears existing scores when method changes", () => {
    const draft = draftWithRuleset("2014");
    draft.abilities.scores = generateStandardArrayScores();
    selectAbilityScoreMethod(draft, "point-buy");
    expect(draft.abilities.scores).toBeUndefined();
    expect(draft.abilities.rollResults).toBeUndefined();
  });

  it("invalidates abilities step when method changes", () => {
    const draft = draftWithRuleset("2014");
    // Manually set abilities to resolved for testing
    draft.stepStatuses.set("abilities", "resolved");
    selectAbilityScoreMethod(draft, "rolling");
    expect(getStepState(draft, "abilities")).toBe("invalidated");
  });
});

/* ── generateStandardArrayScores ────────────────────────────────── */

describe("generateStandardArrayScores", () => {
  it("returns the canonical standard array in ability order", () => {
    const scores = generateStandardArrayScores();
    expect(scores).toEqual({
      STR: 15,
      DEX: 14,
      CON: 13,
      INT: 12,
      WIS: 10,
      CHA: 8,
    });
  });

  it("includes all six abilities", () => {
    const scores = generateStandardArrayScores();
    for (const ability of ABILITIES) {
      expect(scores[ability]).toBeDefined();
    }
  });
});

/* ── validatePointBuyScores ─────────────────────────────────────── */

describe("validatePointBuyScores", () => {
  it("accepts valid 27-point scores for 2024", () => {
    // 15(9) + 14(7) + 13(5) + 12(4) + 10(2) + 8(0) = 27
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    expect(validatePointBuyScores(scores, "2024")).toBe(true);
  });

  it("accepts valid 26-point scores for 2014", () => {
    // 15(9) + 14(7) + 13(5) + 12(4) + 10(2) + 8(0) = 27, over budget
    // 15(9) + 14(7) + 12(4) + 12(4) + 10(2) + 8(0) = 26
    const scores = { STR: 15, DEX: 14, CON: 12, INT: 12, WIS: 10, CHA: 8 };
    expect(validatePointBuyScores(scores, "2014")).toBe(true);
  });

  it("accepts all 8s (zero cost) for any ruleset", () => {
    const scores = {
      STR: 8,
      DEX: 8,
      CON: 8,
      INT: 8,
      WIS: 8,
      CHA: 8,
    };
    expect(validatePointBuyScores(scores, "2014")).toBe(true);
    expect(validatePointBuyScores(scores, "2024")).toBe(true);
  });
});

/* ── generateRollingScores ──────────────────────────────────────── */

describe("generateRollingScores", () => {
  it("returns scores and roll results for all six abilities", () => {
    const result = generateRollingScores();
    for (const ability of ABILITIES) {
      expect(result.scores[ability]).toBeDefined();
      expect(result.rollResults[ability]).toHaveLength(4);
    }
  });

  it("produces scores between 3 and 18", () => {
    // Run multiple times to ensure randomness works
    for (let i = 0; i < 20; i++) {
      const result = generateRollingScores();
      for (const ability of ABILITIES) {
        const score = result.scores[ability];
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      }
    }
  });

  it("roll results are sorted ascending", () => {
    const result = generateRollingScores();
    for (const ability of ABILITIES) {
      const rolls = result.rollResults[ability];
      for (let i = 1; i < rolls.length; i++) {
        expect(rolls[i]).toBeGreaterThanOrEqual(rolls[i - 1]!);
      }
    }
  });

  it("score equals sum of top three rolls", () => {
    const result = generateRollingScores();
    for (const ability of ABILITIES) {
      const rolls = result.rollResults[ability];
      const expected = rolls[1]! + rolls[2]! + rolls[3]!;
      expect(result.scores[ability]).toBe(expected);
    }
  });
});

/* ── validateCustomScores ───────────────────────────────────────── */

describe("validateCustomScores", () => {
  it("accepts valid scores in range 1-30", () => {
    const scores = {
      STR: 10,
      DEX: 14,
      CON: 12,
      INT: 8,
      WIS: 16,
      CHA: 20,
    };
    expect(validateCustomScores(scores)).toBe(true);
  });

  it("accepts minimum value 1", () => {
    const scores = {
      STR: 1,
      DEX: 1,
      CON: 1,
      INT: 1,
      WIS: 1,
      CHA: 1,
    };
    expect(validateCustomScores(scores)).toBe(true);
  });

  it("accepts maximum value 30", () => {
    const scores = {
      STR: 30,
      DEX: 30,
      CON: 30,
      INT: 30,
      WIS: 30,
      CHA: 30,
    };
    expect(validateCustomScores(scores)).toBe(true);
  });
});
