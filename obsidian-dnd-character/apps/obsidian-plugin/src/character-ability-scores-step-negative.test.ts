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

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateAbilityScores rejects invalid input", () => {
  it("rejects null, undefined, string, number, boolean", () => {
    expect(validateAbilityScores(null)).toBe(false);
    expect(validateAbilityScores(undefined)).toBe(false);
    expect(validateAbilityScores("")).toBe(false);
    expect(validateAbilityScores(42)).toBe(false);
    expect(validateAbilityScores(true)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(validateAbilityScores([])).toBe(false);
    expect(validateAbilityScores([15, 14, 13, 10, 10, 8])).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateAbilityScores({})).toBe(false);
  });

  it("rejects missing ability (no CHA)", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects missing ability (no STR)", () => {
    const scores = { DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects invalid ability key (LCK)", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, LCK: 8 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects lowercase ability key", () => {
    const scores = { str: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects score out of range (0, 31, -1)", () => {
    expect(validateAbilityScores({ STR: 0, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 })).toBe(false);
    expect(validateAbilityScores({ STR: 31, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 })).toBe(false);
    expect(validateAbilityScores({ STR: -1, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 })).toBe(false);
  });

  it("rejects non-integer score", () => {
    const scores = { STR: 15.5, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects non-number score values (string, null)", () => {
    expect(validateAbilityScores({ STR: "15", DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 })).toBe(false);
    expect(validateAbilityScores({ STR: null, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 })).toBe(false);
  });

  it("rejects extra ability key (7 keys)", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8, CON2: 13 };
    expect(validateAbilityScores(scores)).toBe(false);
  });

  it("rejects duplicate key replacing ability (WIS2 instead of CHA)", () => {
    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, WIS2: 8 };
    expect(validateAbilityScores(scores)).toBe(false);
  });
});

/* ── Selection rejects when ruleset not resolved ──────────────── */

describe("selectAbilityScores rejects when ruleset not resolved", () => {
  it("rejects when ruleset is unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);
    expect(result).toBe(false);
  });

  it("rejects when ruleset is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("ruleset", "invalidated");

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);
    expect(result).toBe(false);
  });
});

/* ── Selection rejects when species not resolved ──────────────── */

describe("selectAbilityScores rejects when species not resolved", () => {
  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);
    expect(result).toBe(false);
  });

  it("rejects when species is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("species", "invalidated");

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    const result = selectAbilityScores(draft, scores);
    expect(result).toBe(false);
  });
});

/* ── Selection rejects invalid scores ─────────────────────────── */

describe("selectAbilityScores rejects invalid scores", () => {
  it("rejects null, undefined, string, number, array", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(selectAbilityScores(draft, null)).toBe(false);
    expect(selectAbilityScores(draft, undefined)).toBe(false);
    expect(selectAbilityScores(draft, "")).toBe(false);
    expect(selectAbilityScores(draft, 42)).toBe(false);
    expect(selectAbilityScores(draft, [15, 14, 13, 10, 10, 8])).toBe(false);
  });

  it("rejects scores with value out of range", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 0, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    expect(selectAbilityScores(draft, scores)).toBe(false);
  });

  it("rejects scores with missing ability", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10 };
    expect(selectAbilityScores(draft, scores)).toBe(false);
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectAbilityScores does not mutate draft on rejection", () => {
  it("does not change abilities data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(draft.abilities.scores).toBeUndefined();
    selectAbilityScores(draft, null);
    expect(draft.abilities.scores).toBeUndefined();
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(getStepState(draft, "abilities")).toBe("invalidated");
    selectAbilityScores(draft, null);
    expect(getStepState(draft, "abilities")).toBe("invalidated");
  });

  it("does not resolve step when ruleset not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);
    expect(getStepState(draft, "abilities")).toBe("unvisited");
  });

  it("does not resolve step when species not resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);
    expect(getStepState(draft, "abilities")).toBe("invalidated");
    expect(draft.abilities.scores).toBeUndefined();
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);
    expect(getStepState(draft, "abilities")).toBe("resolved");
    expect(draft.abilities.scores?.STR).toBe(15);

    selectAbilityScores(draft, null);
    expect(getStepState(draft, "abilities")).toBe("resolved");
    expect(draft.abilities.scores?.STR).toBe(15);
  });

  it("does not set scores when species not resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    const scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 };
    selectAbilityScores(draft, scores);
    expect(draft.abilities.scores).toBeUndefined();
    expect(getStepState(draft, "abilities")).toBe("invalidated");
  });
});
