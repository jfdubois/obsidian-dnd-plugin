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
import { selectEquipmentChoices } from "./character-equipment-choices-step";

/**
 * Helper: resolve all prerequisite steps for equipment choices.
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

/* ── selectEquipmentChoices: rejects when deps not resolved ────── */

describe("selectEquipmentChoices rejects when deps not resolved", () => {
  it("rejects when background-choices is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("class", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    const result = selectEquipmentChoices(draft, { longsword: choice });
    expect(result).toBe(false);
  });

  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("background-choices", "resolved");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    const result = selectEquipmentChoices(draft, { longsword: choice });
    expect(result).toBe(false);
  });

  it("rejects when all deps are unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    const result = selectEquipmentChoices(draft, { longsword: choice });
    expect(result).toBe(false);
  });
});

/* ── selectEquipmentChoices: rejects invalid choices ───────────── */

describe("selectEquipmentChoices rejects invalid choices", () => {
  it("rejects null choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectEquipmentChoices(draft, null)).toBe(false);
  });

  it("rejects undefined choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectEquipmentChoices(draft, undefined)).toBe(false);
  });

  it("rejects empty string choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectEquipmentChoices(draft, "")).toBe(false);
  });

  it("rejects number choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectEquipmentChoices(draft, 42)).toBe(false);
  });

  it("rejects array of choices", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    expect(selectEquipmentChoices(draft, [choice])).toBe(false);
  });
});

/* ── selectEquipmentChoices: no mutation on rejection ──────────── */

describe("selectEquipmentChoices does not mutate draft on rejection", () => {
  it("does not change equipment choices data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(draft.selections).toEqual({});

    selectEquipmentChoices(draft, null);
    expect(draft.selections).toEqual({});
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(getStepState(draft, "equipment-choices")).toBe("unvisited");

    selectEquipmentChoices(draft, null);
    expect(getStepState(draft, "equipment-choices")).toBe("unvisited");
  });

  it("does not resolve step when deps not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    selectEquipmentChoices(draft, { longsword: choice });
    expect(getStepState(draft, "equipment-choices")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("longsword"),
      definitionId: createChoiceDefinitionId("weapon_choice_def"),
      originGrantId: createEntityId("fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("weapon_longsword")] },
    });

    selectEquipmentChoices(draft, { longsword: choice });
    expect(getStepState(draft, "equipment-choices")).toBe("resolved");

    selectEquipmentChoices(draft, null);
    expect(getStepState(draft, "equipment-choices")).toBe("resolved");
    expect(draft.selections).toHaveProperty("longsword");
  });
});
