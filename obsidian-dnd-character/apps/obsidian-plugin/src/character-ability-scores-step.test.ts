import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import {
  validateAbilityScores,
  selectAbilityScores,
} from "./character-ability-scores-step";

/* ── Validation accepts valid input ───────────────────────────── */

describe("validateAbilityScores accepts valid input", () => {
  it("accepts standard array scores", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    expect(validateAbilityScores(scores)).toBe(true);
  });

  it("accepts point-buy scores", () => {
    const scores = { STR: 8, DEX: 14, CON: 10, INT: 15, WIS: 12, CHA: 8 };
    expect(validateAbilityScores(scores)).toBe(true);
  });

  it("accepts minimum valid scores (all 1)", () => {
    const scores = { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 };
    expect(validateAbilityScores(scores)).toBe(true);
  });

  it("accepts maximum valid scores (all 30)", () => {
    const scores = { STR: 30, DEX: 30, CON: 30, INT: 30, WIS: 30, CHA: 30 };
    expect(validateAbilityScores(scores)).toBe(true);
  });

  it("accepts scores with mixed values", () => {
    const scores = { STR: 16, DEX: 16, CON: 16, INT: 16, WIS: 16, CHA: 16 };
    expect(validateAbilityScores(scores)).toBe(true);
  });

  it("type-narrows to Record<Ability, number> on success", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    if (validateAbilityScores(scores)) {
      // Narrows to Record<Ability, number>
      expect(typeof scores.STR).toBe("number");
    }
  });
});

/* ── Selection with valid input ────────────────────────────────── */

describe("selectAbilityScores with valid input", () => {
  it("sets ability scores on the draft", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);

    expect(result).toBe(true);
    expect(draft.abilities.scores).toEqual(scores);
  });

  it("marks the abilities draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);

    expect(getStepState(draft, "abilities")).toBe("resolved");
  });

  it("does not mark species-choices as resolved (that was P10-T007)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);

    // Only the abilities draft step is resolved
    expect(getStepState(draft, "abilities")).toBe("resolved");
    // Species-choices was invalidated by species resolution
    expect(getStepState(draft, "species-choices")).toBe("invalidated");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("dwarf"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);

    expect(result).toBe(true);
    expect(getStepState(draft, "abilities")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const scores = { STR: 8, DEX: 14, CON: 10, INT: 15, WIS: 12, CHA: 8 };
    const result = selectAbilityScores(draft, scores);

    expect(result).toBe(true);
    expect(getStepState(draft, "abilities")).toBe("resolved");
  });

  it("works with optional sources selected", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, [createEntityId("XGtE")]);
    selectSpecies(draft, createEntityId("gnome"));

    const scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    const result = selectAbilityScores(draft, scores);

    expect(result).toBe(true);
  });

  it("overwrites previously selected ability scores", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores1 = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores1);
    expect(draft.abilities.scores?.STR).toBe(15);

    const scores2 = { STR: 8, DEX: 14, CON: 10, INT: 15, WIS: 12, CHA: 8 };
    selectAbilityScores(draft, scores2);
    expect(draft.abilities.scores?.STR).toBe(8);
    expect(draft.abilities.scores?.INT).toBe(15);
  });

  it("updates diagnostics after selection (CRE-008: unresolved species choices)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);

    // CRE-008: species selected but species-choices not resolved → error
    const hasUnresolvedChoiceError = draft.diagnostics.some(
      (d) => d.severity === "error" && d.step === "species-choices",
    );
    expect(hasUnresolvedChoiceError).toBe(true);
  });

  it("creates a shallow copy of scores (does not mutate input)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };

    selectAbilityScores(draft, scores);

    // The draft stores a copy, not the same reference
    expect(draft.abilities.scores).not.toBe(scores);
    expect(draft.abilities.scores).toEqual(scores);
  });
});
