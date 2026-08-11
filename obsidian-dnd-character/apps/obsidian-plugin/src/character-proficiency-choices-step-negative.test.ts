import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
} from "@obsidian-dnd/domain";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectSpeciesChoices } from "./character-species-choices-step";
import {
  selectProficiencyChoices,
  selectLanguageChoices,
} from "./character-proficiency-choices-step";

/**
 * Helper: resolve all prerequisite steps for proficiency/language choices.
 */
function resolvePrerequisites(draft: CharacterDraft, ruleset: "2014" | "2024") {
  selectRuleset(draft, ruleset);
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("background-choices", "resolved");
  draft.stepStatuses.set("class", "resolved");
  selectSpeciesChoices(draft, {});
}

/* ── selectProficiencyChoices: rejects when deps not resolved ──── */

describe("selectProficiencyChoices rejects when deps not resolved", () => {
  it("rejects when species-choices is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("background-choices", "resolved");
    draft.stepStatuses.set("class", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    const result = selectProficiencyChoices(draft, { athletics: choice });
    expect(result).toBe(false);
  });

  it("rejects when background-choices is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectSpeciesChoices(draft, {});
    draft.stepStatuses.set("class", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    const result = selectProficiencyChoices(draft, { athletics: choice });
    expect(result).toBe(false);
  });

  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectSpeciesChoices(draft, {});
    draft.stepStatuses.set("background-choices", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    const result = selectProficiencyChoices(draft, { athletics: choice });
    expect(result).toBe(false);
  });

  it("rejects when all deps are unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    const result = selectProficiencyChoices(draft, { athletics: choice });
    expect(result).toBe(false);
  });
});

/* ── selectLanguageChoices: rejects when deps not resolved ─────── */

describe("selectLanguageChoices rejects when deps not resolved", () => {
  it("rejects when species-choices is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("background-choices", "resolved");
    draft.stepStatuses.set("class", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    const result = selectLanguageChoices(draft, { common: choice });
    expect(result).toBe(false);
  });

  it("rejects when background-choices is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectSpeciesChoices(draft, {});
    draft.stepStatuses.set("class", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    const result = selectLanguageChoices(draft, { common: choice });
    expect(result).toBe(false);
  });

  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    selectSpeciesChoices(draft, {});
    draft.stepStatuses.set("background-choices", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    const result = selectLanguageChoices(draft, { common: choice });
    expect(result).toBe(false);
  });

  it("rejects when all deps are unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    const result = selectLanguageChoices(draft, { common: choice });
    expect(result).toBe(false);
  });
});

/* ── selectProficiencyChoices: rejects invalid choices ─────────── */

describe("selectProficiencyChoices rejects invalid choices", () => {
  it("rejects null choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectProficiencyChoices(draft, null)).toBe(false);
  });

  it("rejects undefined choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectProficiencyChoices(draft, undefined)).toBe(false);
  });

  it("rejects empty string choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectProficiencyChoices(draft, "")).toBe(false);
  });

  it("rejects number choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectProficiencyChoices(draft, 42)).toBe(false);
  });

  it("rejects array of choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    expect(selectProficiencyChoices(draft, [choice])).toBe(false);
  });
});

/* ── selectLanguageChoices: rejects invalid choices ────────────── */

describe("selectLanguageChoices rejects invalid choices", () => {
  it("rejects null choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectLanguageChoices(draft, null)).toBe(false);
  });

  it("rejects undefined choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectLanguageChoices(draft, undefined)).toBe(false);
  });

  it("rejects empty string choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectLanguageChoices(draft, "")).toBe(false);
  });

  it("rejects number choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectLanguageChoices(draft, 42)).toBe(false);
  });

  it("rejects array of choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    expect(selectLanguageChoices(draft, [choice])).toBe(false);
  });
});

/* ── selectProficiencyChoices: no mutation on rejection ────────── */

describe("selectProficiencyChoices does not mutate draft on rejection", () => {
  it("does not change proficiency choices data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(draft.selections).toEqual({});

    selectProficiencyChoices(draft, null);
    expect(draft.selections).toEqual({});
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(getStepState(draft, "proficiency-choices")).toBe("unvisited");

    selectProficiencyChoices(draft, null);
    expect(getStepState(draft, "proficiency-choices")).toBe("unvisited");
  });

  it("does not resolve step when deps not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    selectProficiencyChoices(draft, { athletics: choice });
    expect(getStepState(draft, "proficiency-choices")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill_athletics")] },
    });

    selectProficiencyChoices(draft, { athletics: choice });
    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");

    selectProficiencyChoices(draft, null);
    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");
    expect(draft.selections).toHaveProperty("athletics");
  });
});

/* ── selectLanguageChoices: no mutation on rejection ───────────── */

describe("selectLanguageChoices does not mutate draft on rejection", () => {
  it("does not change language choices data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(draft.selections).toEqual({});

    selectLanguageChoices(draft, null);
    expect(draft.selections).toEqual({});
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(getStepState(draft, "language-choices")).toBe("unvisited");

    selectLanguageChoices(draft, null);
    expect(getStepState(draft, "language-choices")).toBe("unvisited");
  });

  it("does not resolve step when deps not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    selectLanguageChoices(draft, { common: choice });
    expect(getStepState(draft, "language-choices")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("language_common")] },
    });

    selectLanguageChoices(draft, { common: choice });
    expect(getStepState(draft, "language-choices")).toBe("resolved");

    selectLanguageChoices(draft, null);
    expect(getStepState(draft, "language-choices")).toBe("resolved");
    expect(draft.selections).toHaveProperty("common");
  });
});
