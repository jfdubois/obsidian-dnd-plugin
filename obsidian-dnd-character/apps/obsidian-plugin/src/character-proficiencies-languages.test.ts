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
  // Background and class steps are not implemented yet (P10-T010, etc.)
  // Manually mark them as resolved for testing proficiencies/languages
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("class", "resolved");
  return draft;
}

/* ── Language validation accepts valid input ──────────────────── */

describe("validateLanguages accepts valid input", () => {
  it("accepts empty languages", () => {
    const langs = { languageIds: [] };
    expect(validateLanguages(langs)).toBe(true);
  });

  it("accepts single language", () => {
    const langs = { languageIds: [createEntityId("common")] };
    expect(validateLanguages(langs)).toBe(true);
  });

  it("accepts multiple languages", () => {
    const langs = {
      languageIds: [
        createEntityId("common"),
        createEntityId("elvish"),
        createEntityId("dwarvish"),
      ],
    };
    expect(validateLanguages(langs)).toBe(true);
  });

  it("type-narrows on success", () => {
    const langs = { languageIds: [createEntityId("common")] };
    if (validateLanguages(langs)) {
      expect(Array.isArray(langs.languageIds)).toBe(true);
    }
  });
});

/* ── Language selection with valid input ──────────────────────── */

describe("selectLanguages with valid input", () => {
  it("sets languages on the draft", () => {
    const draft = setupDraft();
    const langs = {
      languageIds: [createEntityId("common"), createEntityId("elvish")],
    };
    const result = selectLanguages(draft, langs);

    expect(result).toBe(true);
    expect(draft.languages.languageIds).toEqual(langs.languageIds);
  });

  it("marks the languages draft step as resolved", () => {
    const draft = setupDraft();
    const langs = { languageIds: [createEntityId("common")] };
    selectLanguages(draft, langs);

    expect(getStepState(draft, "languages")).toBe("resolved");
  });

  it("accepts empty languages", () => {
    const draft = setupDraft();
    const langs = { languageIds: [] };
    const result = selectLanguages(draft, langs);

    expect(result).toBe(true);
    expect(draft.languages.languageIds).toEqual([]);
    expect(getStepState(draft, "languages")).toBe("resolved");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("dwarf"));
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

    const langs = {
      languageIds: [createEntityId("common"), createEntityId("dwarvish")],
    };
    const result = selectLanguages(draft, langs);

    expect(result).toBe(true);
    expect(getStepState(draft, "languages")).toBe("resolved");
  });

  it("creates a shallow copy of arrays (does not mutate input)", () => {
    const draft = setupDraft();
    const langIds = [createEntityId("common")];
    const langs = { languageIds: langIds };

    selectLanguages(draft, langs);

    expect(draft.languages.languageIds).not.toBe(langIds);
    expect(draft.languages.languageIds).toEqual(langIds);
  });

  it("overwrites previously selected languages", () => {
    const draft = setupDraft();

    const langs1 = { languageIds: [createEntityId("common")] };
    selectLanguages(draft, langs1);
    expect(draft.languages.languageIds.length).toBe(1);

    const langs2 = {
      languageIds: [createEntityId("common"), createEntityId("elvish"), createEntityId("dwarvish")],
    };
    selectLanguages(draft, langs2);
    expect(draft.languages.languageIds.length).toBe(3);
  });

  it("updates diagnostics after selection", () => {
    const draft = setupDraft();
    const langs = { languageIds: [createEntityId("common")] };
    selectLanguages(draft, langs);

    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });
});
