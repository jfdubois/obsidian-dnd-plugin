import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectAbilityScores } from "./character-ability-scores-step";
import {
  validateProficiencies,
  selectProficiencies,
} from "./character-proficiencies-step";

/* ── Helper: set up draft with all dependencies resolved ──────── */

function setupDraft() {
  const draft = createEmptyCharacterDraft();
  selectRuleset(draft, "2024");
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  selectAbilityScores(draft, {
    STR: 15,
    DEX: 14,
    CON: 13,
    INT: 10,
    WIS: 10,
    CHA: 8,
  });
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("class", "resolved");
  return draft;
}

/* ── Proficiency validation rejects invalid input ─────────────── */

describe("validateProficiencies rejects invalid input", () => {
  it("rejects null, undefined, string, number, boolean", () => {
    expect(validateProficiencies(null)).toBe(false);
    expect(validateProficiencies(undefined)).toBe(false);
    expect(validateProficiencies("")).toBe(false);
    expect(validateProficiencies(42)).toBe(false);
    expect(validateProficiencies(true)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(validateProficiencies([])).toBe(false);
    expect(validateProficiencies([createEntityId("athletics")])).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateProficiencies({})).toBe(false);
  });

  it("rejects missing skillProficiencies", () => {
    const profs = { toolProficiencies: [] };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects missing toolProficiencies", () => {
    const profs = { skillProficiencies: [] };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects non-array skillProficiencies", () => {
    const profs = { skillProficiencies: null, toolProficiencies: [] };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects non-array toolProficiencies", () => {
    const profs = { skillProficiencies: [], toolProficiencies: null };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects null in skillProficiencies array", () => {
    const profs = {
      skillProficiencies: [null],
      toolProficiencies: [],
    };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects null in toolProficiencies array", () => {
    const profs = {
      skillProficiencies: [],
      toolProficiencies: [null],
    };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects mixed valid and null IDs", () => {
    const profs = {
      skillProficiencies: [createEntityId("athletics"), null],
      toolProficiencies: [],
    };
    expect(validateProficiencies(profs)).toBe(false);
  });

  it("rejects number values in proficiency arrays", () => {
    const profs = {
      skillProficiencies: [42],
      toolProficiencies: [],
    };
    expect(validateProficiencies(profs)).toBe(false);
  });
});

/* ── Proficiency selection rejects when dependencies not resolved ─ */

describe("selectProficiencies rejects when species not resolved", () => {
  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    expect(selectProficiencies(draft, profs)).toBe(false);
  });
});

describe("selectProficiencies rejects when background not resolved", () => {
  it("rejects when background is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectAbilityScores(draft, {
      STR: 15,
      DEX: 14,
      CON: 13,
      INT: 10,
      WIS: 10,
      CHA: 8,
    });
    draft.stepStatuses.set("class", "resolved");
    // background is not resolved

    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    expect(selectProficiencies(draft, profs)).toBe(false);
  });
});

describe("selectProficiencies rejects when class not resolved", () => {
  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectAbilityScores(draft, {
      STR: 15,
      DEX: 14,
      CON: 13,
      INT: 10,
      WIS: 10,
      CHA: 8,
    });
    draft.stepStatuses.set("background", "resolved");
    // class is not resolved

    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    expect(selectProficiencies(draft, profs)).toBe(false);
  });
});

describe("selectProficiencies rejects when abilities not resolved", () => {
  it("rejects when abilities is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    // abilities not resolved
    draft.stepStatuses.set("background", "resolved");
    draft.stepStatuses.set("class", "resolved");

    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    expect(selectProficiencies(draft, profs)).toBe(false);
  });
});

/* ── Proficiency selection rejects invalid data ────────────────── */

describe("selectProficiencies rejects invalid proficiencies", () => {
  it("rejects null, undefined, string, number, array", () => {
    const draft = setupDraft();
    expect(selectProficiencies(draft, null)).toBe(false);
    expect(selectProficiencies(draft, undefined)).toBe(false);
    expect(selectProficiencies(draft, "")).toBe(false);
    expect(selectProficiencies(draft, 42)).toBe(false);
    expect(selectProficiencies(draft, [])).toBe(false);
  });

  it("rejects empty object", () => {
    const draft = setupDraft();
    expect(selectProficiencies(draft, {})).toBe(false);
  });

  it("rejects proficiencies with null IDs", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [null],
      toolProficiencies: [],
    };
    expect(selectProficiencies(draft, profs)).toBe(false);
  });
});

/* ── Proficiency selection does not mutate draft on rejection ──── */

describe("selectProficiencies does not mutate draft on rejection", () => {
  it("does not change proficiencies data for invalid input", () => {
    const draft = setupDraft();
    const initialSkill = [...draft.proficiencies.skillProficiencies];
    const initialTool = [...draft.proficiencies.toolProficiencies];

    selectProficiencies(draft, null);

    expect(draft.proficiencies.skillProficiencies).toEqual(initialSkill);
    expect(draft.proficiencies.toolProficiencies).toEqual(initialTool);
  });

  it("does not resolve step for invalid input", () => {
    const draft = setupDraft();
    const initialState = getStepState(draft, "proficiencies");

    selectProficiencies(draft, null);

    expect(getStepState(draft, "proficiencies")).toBe(initialState);
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    selectProficiencies(draft, profs);
    expect(getStepState(draft, "proficiencies")).toBe("resolved");

    selectProficiencies(draft, null);
    expect(getStepState(draft, "proficiencies")).toBe("resolved");
    expect(draft.proficiencies.skillProficiencies).toEqual(profs.skillProficiencies);
  });
});
