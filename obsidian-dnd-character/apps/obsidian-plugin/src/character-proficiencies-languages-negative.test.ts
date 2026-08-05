import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectAbilityScores } from "./character-ability-scores-step";
import {
  validateLanguages,
  selectLanguages,
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

/* ── Language validation rejects invalid input ────────────────── */

describe("validateLanguages rejects invalid input", () => {
  it("rejects null, undefined, string, number, boolean", () => {
    expect(validateLanguages(null)).toBe(false);
    expect(validateLanguages(undefined)).toBe(false);
    expect(validateLanguages("")).toBe(false);
    expect(validateLanguages(42)).toBe(false);
    expect(validateLanguages(true)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(validateLanguages([])).toBe(false);
    expect(validateLanguages([createEntityId("common")])).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateLanguages({})).toBe(false);
  });

  it("rejects missing languageIds", () => {
    expect(validateLanguages({ otherField: [] })).toBe(false);
  });

  it("rejects non-array languageIds", () => {
    const langs = { languageIds: null };
    expect(validateLanguages(langs)).toBe(false);
  });

  it("rejects null in languageIds array", () => {
    const langs = { languageIds: [null] };
    expect(validateLanguages(langs)).toBe(false);
  });

  it("rejects number values in languageIds", () => {
    const langs = { languageIds: [42] };
    expect(validateLanguages(langs)).toBe(false);
  });
});

/* ── Language selection rejects when dependencies not resolved ─ */

describe("selectLanguages rejects when species not resolved", () => {
  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    const langs = { languageIds: [createEntityId("common")] };
    expect(selectLanguages(draft, langs)).toBe(false);
  });
});

describe("selectLanguages rejects when background not resolved", () => {
  it("rejects when background is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("class", "resolved");
    // background is not resolved

    const langs = { languageIds: [createEntityId("common")] };
    expect(selectLanguages(draft, langs)).toBe(false);
  });
});

describe("selectLanguages rejects when class not resolved", () => {
  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("background", "resolved");
    // class is not resolved

    const langs = { languageIds: [createEntityId("common")] };
    expect(selectLanguages(draft, langs)).toBe(false);
  });
});

/* ── Language selection rejects invalid data ──────────────────── */

describe("selectLanguages rejects invalid languages", () => {
  it("rejects null, undefined, string, number, array", () => {
    const draft = setupDraft();
    expect(selectLanguages(draft, null)).toBe(false);
    expect(selectLanguages(draft, undefined)).toBe(false);
    expect(selectLanguages(draft, "")).toBe(false);
    expect(selectLanguages(draft, 42)).toBe(false);
    expect(selectLanguages(draft, [])).toBe(false);
  });

  it("rejects empty object", () => {
    const draft = setupDraft();
    expect(selectLanguages(draft, {})).toBe(false);
  });

  it("rejects languages with null IDs", () => {
    const draft = setupDraft();
    const langs = { languageIds: [null] };
    expect(selectLanguages(draft, langs)).toBe(false);
  });
});

/* ── Language selection does not mutate draft on rejection ────── */

describe("selectLanguages does not mutate draft on rejection", () => {
  it("does not change languages data for invalid input", () => {
    const draft = setupDraft();
    const initialLangs = [...draft.languages.languageIds];

    selectLanguages(draft, null);

    expect(draft.languages.languageIds).toEqual(initialLangs);
  });

  it("does not resolve step for invalid input", () => {
    const draft = setupDraft();
    const initialState = getStepState(draft, "languages");

    selectLanguages(draft, null);

    expect(getStepState(draft, "languages")).toBe(initialState);
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = setupDraft();
    const langs = { languageIds: [createEntityId("common")] };
    selectLanguages(draft, langs);
    expect(getStepState(draft, "languages")).toBe("resolved");

    selectLanguages(draft, null);
    expect(getStepState(draft, "languages")).toBe("resolved");
    expect(draft.languages.languageIds).toEqual(langs.languageIds);
  });
});
