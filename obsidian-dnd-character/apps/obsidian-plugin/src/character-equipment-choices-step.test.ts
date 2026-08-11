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
import { selectEquipmentChoices } from "./character-equipment-choices-step";

/**
 * Helper: resolve all prerequisite steps for equipment choices.
 */
function resolvePrerequisites(draft: CharacterDraft, ruleset: "2014" | "2024") {
  selectRuleset(draft, ruleset);
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  // Resolve background and background-choices
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("background-choices", "resolved");
  // Resolve class
  draft.stepStatuses.set("class", "resolved");
  // Resolve species-choices (required by downstream steps)
  selectSpeciesChoices(draft, {});
}

/* ── selectEquipmentChoices: valid input ───────────────────────── */

describe("selectEquipmentChoices with valid input", () => {
  it("sets equipment choices on the draft", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const longsword = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    const result = selectEquipmentChoices(draft, { longsword });

    expect(result).toBe(true);
    expect(draft.equipmentChoices.choices).toHaveProperty("longsword");
    expect(draft.equipmentChoices.choices["longsword" as ChoiceInstanceId]).toBe(longsword);
  });

  it("marks the equipment-choices draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("shield"),
      definitionId: createChoiceDefinitionId("armor_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("armor_shield")] },
    });

    selectEquipmentChoices(draft, { shield: choice });

    expect(getStepState(draft, "equipment-choices")).toBe("resolved");
  });

  it("accepts empty choices record", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = selectEquipmentChoices(draft, {});

    expect(result).toBe(true);
    expect(draft.equipmentChoices.choices).toEqual({});
    expect(getStepState(draft, "equipment-choices")).toBe("resolved");
  });

  it("overwrites previously selected equipment choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice1 = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    selectEquipmentChoices(draft, { longsword: choice1 });
    expect(Object.keys(draft.equipmentChoices.choices)).toHaveLength(1);

    const choice2 = createCharacterChoice({
      instanceId: createChoiceInstanceId("greatsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_greatsword")] },
    });

    selectEquipmentChoices(draft, { greatsword: choice2 });
    expect(Object.keys(draft.equipmentChoices.choices)).toHaveLength(1);
    expect(draft.equipmentChoices.choices).toHaveProperty("greatsword");
    expect(draft.equipmentChoices.choices).not.toHaveProperty("longsword");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2014");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longbow"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("ranger"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longbow")] },
    });

    const result = selectEquipmentChoices(draft, { longbow: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "equipment-choices")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("rapier"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("rogue"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_rapier")] },
    });

    const result = selectEquipmentChoices(draft, { rapier: choice });
    expect(result).toBe(true);
    expect(getStepState(draft, "equipment-choices")).toBe("resolved");
  });

  it("creates a shallow copy of choices (does not mutate input)", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("shield"),
      definitionId: createChoiceDefinitionId("armor_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("armor_shield")] },
    });
    const input = { shield: choice };

    selectEquipmentChoices(draft, input);

    expect(draft.equipmentChoices.choices).not.toBe(input);
  });
});
