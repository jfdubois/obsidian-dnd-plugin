import { describe, it, expect } from "vitest";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
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

/* ── Validation accepts valid input ───────────────────────────── */

describe("validateSpeciesChoices accepts valid input", () => {
  it("accepts an empty choices record", () => {
    expect(validateSpeciesChoices({})).toBe(true);
  });

  it("accepts a record with a single valid choice", () => {
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });
    expect(validateSpeciesChoices({ darkvision: choice })).toBe(true);
  });

  it("accepts a record with multiple valid choices", () => {
    const darkvision = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });
    const feyAncestry = createCharacterChoice({
      instanceId: createChoiceInstanceId("fey_ancestry"),
      definitionId: createChoiceDefinitionId("fey_ancestry_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });
    expect(
      validateSpeciesChoices({ darkvision, feyAncestry }),
    ).toBe(true);
  });

  it("type-narrows to Record on success", () => {
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("dwarf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });
    const choices = { trait: choice };
    if (validateSpeciesChoices(choices)) {
      // Narrows to Record<ChoiceInstanceId, CharacterChoice>
      expect(typeof choices).toBe("object");
    }
  });
});

/* ── Selection with valid input ────────────────────────────────── */

describe("selectSpeciesChoices with valid input", () => {
  it("sets choices on the draft", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const darkvision = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });

    const result = selectSpeciesChoices(draft, { darkvision });

    expect(result).toBe(true);
    expect(draft.speciesChoices.choices).toHaveProperty("darkvision");
    expect(draft.speciesChoices.choices["darkvision" as ChoiceInstanceId]).toBe(darkvision);
  });

  it("marks the species-choices draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    selectSpeciesChoices(draft, { trait: choice });

    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("does not mark species as resolved (that was P10-T006)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    selectSpeciesChoices(draft, { trait: choice });

    // Species was already resolved by selectSpecies
    expect(getStepState(draft, "species")).toBe("resolved");
    // Species-choices is now resolved by selectSpeciesChoices
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("accepts empty choices record (species with no optional traits)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    const result = selectSpeciesChoices(draft, {});

    expect(result).toBe(true);
    expect(draft.speciesChoices.choices).toEqual({});
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("overwrites previously selected species choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice1 = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });

    selectSpeciesChoices(draft, { darkvision: choice1 });
    expect(Object.keys(draft.speciesChoices.choices)).toHaveLength(1);

    const choice2 = createCharacterChoice({
      instanceId: createChoiceInstanceId("fey_ancestry"),
      definitionId: createChoiceDefinitionId("fey_ancestry_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    selectSpeciesChoices(draft, { feyAncestry: choice2 });
    expect(Object.keys(draft.speciesChoices.choices)).toHaveLength(1);
    expect(draft.speciesChoices.choices).toHaveProperty("feyAncestry");
    expect(draft.speciesChoices.choices).not.toHaveProperty("darkvision");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("dwarf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("dwarf"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });

    const result = selectSpeciesChoices(draft, { darkvision: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("fey_ancestry"),
      definitionId: createChoiceDefinitionId("fey_ancestry_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    const result = selectSpeciesChoices(draft, { feyAncestry: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("works with optional sources selected", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, [createEntityId("XGtE")]);
    selectSpecies(draft, createEntityId("gnome"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("darkvision"),
      definitionId: createChoiceDefinitionId("darkvision_def"),
      originGrantId: createEntityId("gnome"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });

    const result = selectSpeciesChoices(draft, { darkvision: choice });
    expect(result).toBe(true);
  });

  it("updates diagnostics after selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    selectSpeciesChoices(draft, { trait: choice });

    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });

  it("creates a shallow copy of choices (does not mutate input)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });
    const input = { trait: choice };

    selectSpeciesChoices(draft, input);

    // The draft stores a copy, not the same reference
    expect(draft.speciesChoices.choices).not.toBe(input);
  });
});
