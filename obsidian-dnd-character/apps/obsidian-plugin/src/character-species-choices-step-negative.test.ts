import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
} from "@obsidian-dnd/domain";
import { createCharacterChoice } from "@obsidian-dnd/character-contract";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import {
  validateSpeciesChoices,
  selectSpeciesChoices,
} from "./character-species-choices-step";

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateSpeciesChoices rejects invalid input", () => {
  it("rejects null", () => {
    expect(validateSpeciesChoices(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateSpeciesChoices(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateSpeciesChoices("")).toBe(false);
  });

  it("rejects number", () => {
    expect(validateSpeciesChoices(42)).toBe(false);
  });

  it("rejects boolean", () => {
    expect(validateSpeciesChoices(true)).toBe(false);
  });

  it("rejects array", () => {
    expect(validateSpeciesChoices([])).toBe(false);
  });

  it("rejects array of choices", () => {
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });
    expect(validateSpeciesChoices([choice])).toBe(false);
  });

  it("rejects record with invalid choice value", () => {
    expect(
      validateSpeciesChoices({ darkvision: null }),
    ).toBe(false);
  });

  it("rejects record with non-CharacterChoice value", () => {
    expect(
      validateSpeciesChoices({ darkvision: "not a choice" }),
    ).toBe(false);
  });

  it("rejects record with partial CharacterChoice (missing fields)", () => {
    expect(
      validateSpeciesChoices({
        darkvision: {
          instanceId: createChoiceInstanceId("trait"),
          // missing definitionId, originGrantId, selectedOptionIds
        },
      }),
    ).toBe(false);
  });

  it("rejects record with one valid and one invalid choice", () => {
    const valid = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });
    expect(
      validateSpeciesChoices({ valid, invalid: null }),
    ).toBe(false);
  });
});

/* ── Selection rejects when species not resolved ──────────────── */

describe("selectSpeciesChoices rejects when species not resolved", () => {
  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    const result = selectSpeciesChoices(draft, { trait: choice });
    expect(result).toBe(false);
  });

  it("rejects when species is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    // Manually invalidate the species step
    draft.stepStatuses.set("species", "invalidated");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    const result = selectSpeciesChoices(draft, { trait: choice });
    expect(result).toBe(false);
  });

  it("rejects when only ruleset and sources resolved (species not)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    // species is invalidated by upstream, not resolved

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    const result = selectSpeciesChoices(draft, { trait: choice });
    expect(result).toBe(false);
  });
});

/* ── Selection rejects invalid choices ────────────────────────── */

describe("selectSpeciesChoices rejects invalid choices", () => {
  it("rejects null choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(selectSpeciesChoices(draft, null)).toBe(false);
  });

  it("rejects undefined choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(selectSpeciesChoices(draft, undefined)).toBe(false);
  });

  it("rejects empty string choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(selectSpeciesChoices(draft, "")).toBe(false);
  });

  it("rejects number choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(selectSpeciesChoices(draft, 42)).toBe(false);
  });

  it("rejects array of choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    expect(selectSpeciesChoices(draft, [choice])).toBe(false);
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectSpeciesChoices does not mutate draft on rejection", () => {
  it("does not change species choices data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    expect(draft.speciesChoices.choices).toEqual({});

    selectSpeciesChoices(draft, null);
    expect(draft.speciesChoices.choices).toEqual({});
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // species-choices is "invalidated" by species resolution
    expect(getStepState(draft, "species-choices")).toBe("invalidated");

    selectSpeciesChoices(draft, null);
    // Must remain invalidated, not become resolved
    expect(getStepState(draft, "species-choices")).toBe("invalidated");
  });

  it("does not resolve step when species not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    selectSpeciesChoices(draft, { trait: choice });
    expect(getStepState(draft, "species-choices")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("elf"),
      selectedOptionIds: [createEntityId("darkvision_60ft")],
    });

    selectSpeciesChoices(draft, { darkvision: choice });
    expect(getStepState(draft, "species-choices")).toBe("resolved");

    // Try to set invalid choices
    selectSpeciesChoices(draft, null);
    // Draft must remain unchanged
    expect(getStepState(draft, "species-choices")).toBe("resolved");
    expect(draft.speciesChoices.choices).toHaveProperty("darkvision");
  });

  it("does not set choices when species not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedOptionIds: [],
    });

    selectSpeciesChoices(draft, { trait: choice });
    expect(draft.speciesChoices.choices).toEqual({});
    expect(getStepState(draft, "species-choices")).toBe("unvisited");
  });
});
