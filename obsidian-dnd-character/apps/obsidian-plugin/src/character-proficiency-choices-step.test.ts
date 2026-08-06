import { describe, it, expect } from "vitest";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
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
  // Manually resolve background-choices since background step doesn't exist yet
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("background-choices", "resolved");
  // Manually resolve class since class step doesn't exist yet
  draft.stepStatuses.set("class", "resolved");
  // Resolve species-choices (required by proficiency-choices and language-choices)
  selectSpeciesChoices(draft, {});
}

/* ── selectProficiencyChoices: valid input ─────────────────────── */

describe("selectProficiencyChoices with valid input", () => {
  it("sets proficiency choices on the draft", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const athletics = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedOptionIds: [createEntityId("skill_athletics")],
    });

    const result = selectProficiencyChoices(draft, { athletics });

    expect(result).toBe(true);
    expect(draft.proficiencyChoices.choices).toHaveProperty("athletics");
    expect(draft.proficiencyChoices.choices["athletics" as ChoiceInstanceId]).toBe(athletics);
  });

  it("marks the proficiency-choices draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedOptionIds: [createEntityId("skill_athletics")],
    });

    selectProficiencyChoices(draft, { athletics: choice });

    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");
  });

  it("accepts empty choices record", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = selectProficiencyChoices(draft, {});

    expect(result).toBe(true);
    expect(draft.proficiencyChoices.choices).toEqual({});
    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");
  });

  it("overwrites previously selected proficiency choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice1 = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedOptionIds: [createEntityId("skill_athletics")],
    });

    selectProficiencyChoices(draft, { athletics: choice1 });
    expect(Object.keys(draft.proficiencyChoices.choices)).toHaveLength(1);

    const choice2 = createCharacterChoice({
      instanceId: createChoiceInstanceId("stealth"),
      definitionId: createChoiceDefinitionId("stealth_def"),
      originGrantId: createEntityId("rogue"),
      selectedOptionIds: [createEntityId("skill_stealth")],
    });

    selectProficiencyChoices(draft, { stealth: choice2 });
    expect(Object.keys(draft.proficiencyChoices.choices)).toHaveLength(1);
    expect(draft.proficiencyChoices.choices).toHaveProperty("stealth");
    expect(draft.proficiencyChoices.choices).not.toHaveProperty("athletics");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2014");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedOptionIds: [createEntityId("skill_athletics")],
    });

    const result = selectProficiencyChoices(draft, { athletics: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("stealth"),
      definitionId: createChoiceDefinitionId("stealth_def"),
      originGrantId: createEntityId("rogue"),
      selectedOptionIds: [createEntityId("skill_stealth")],
    });

    const result = selectProficiencyChoices(draft, { stealth: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "proficiency-choices")).toBe("resolved");
  });

  it("creates a shallow copy of choices (does not mutate input)", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("athletics"),
      definitionId: createChoiceDefinitionId("athletics_def"),
      originGrantId: createEntityId("soldier"),
      selectedOptionIds: [createEntityId("skill_athletics")],
    });
    const input = { athletics: choice };

    selectProficiencyChoices(draft, input);

    expect(draft.proficiencyChoices.choices).not.toBe(input);
  });
});

/* ── selectLanguageChoices: valid input ────────────────────────── */

describe("selectLanguageChoices with valid input", () => {
  it("sets language choices on the draft", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const common = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [createEntityId("language_common")],
    });

    const result = selectLanguageChoices(draft, { common });

    expect(result).toBe(true);
    expect(draft.languageChoices.choices).toHaveProperty("common");
    expect(draft.languageChoices.choices["common" as ChoiceInstanceId]).toBe(common);
  });

  it("marks the language-choices draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [createEntityId("language_common")],
    });

    selectLanguageChoices(draft, { common: choice });

    expect(getStepState(draft, "language-choices")).toBe("resolved");
  });

  it("accepts empty choices record", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = selectLanguageChoices(draft, {});

    expect(result).toBe(true);
    expect(draft.languageChoices.choices).toEqual({});
    expect(getStepState(draft, "language-choices")).toBe("resolved");
  });

  it("overwrites previously selected language choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice1 = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [createEntityId("language_common")],
    });

    selectLanguageChoices(draft, { common: choice1 });
    expect(Object.keys(draft.languageChoices.choices)).toHaveLength(1);

    const choice2 = createCharacterChoice({
      instanceId: createChoiceInstanceId("dwarvish"),
      definitionId: createChoiceDefinitionId("dwarvish_def"),
      originGrantId: createEntityId("dwarf"),
      selectedOptionIds: [createEntityId("language_dwarvish")],
    });

    selectLanguageChoices(draft, { dwarvish: choice2 });
    expect(Object.keys(draft.languageChoices.choices)).toHaveLength(1);
    expect(draft.languageChoices.choices).toHaveProperty("dwarvish");
    expect(draft.languageChoices.choices).not.toHaveProperty("common");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2014");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [createEntityId("language_common")],
    });

    const result = selectLanguageChoices(draft, { common: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "language-choices")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("elvish"),
      definitionId: createChoiceDefinitionId("elvish_def"),
      originGrantId: createEntityId("elf"),
      selectedOptionIds: [createEntityId("language_elvish")],
    });

    const result = selectLanguageChoices(draft, { elvish: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "language-choices")).toBe("resolved");
  });

  it("creates a shallow copy of choices (does not mutate input)", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("common"),
      definitionId: createChoiceDefinitionId("common_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [createEntityId("language_common")],
    });
    const input = { common: choice };

    selectLanguageChoices(draft, input);

    expect(draft.languageChoices.choices).not.toBe(input);
  });
});
