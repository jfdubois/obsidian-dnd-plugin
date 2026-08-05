import { describe, it, expect } from "vitest";
import { createEntityId, createSourceId, createItemInstanceId } from "@obsidian-dnd/domain";
import {
  createEmptyCharacterDraft,
  isCharacterDraft,
  markStepResolved,
  isDraftComplete,
  getStepState,
  getStepStatuses,
} from "./character-draft";
import {
  ALL_DRAFT_STEPS,
  isDraftStep,
  createEmptyDraftRulesetData,
  createEmptyDraftSourceData,
  createEmptyDraftIdentityData,
  createEmptyDraftSpeciesData,
  createEmptyDraftSpeciesChoiceData,
  createEmptyDraftBackgroundData,
  createEmptyDraftBackgroundChoiceData,
  createEmptyDraftClassData,
  createEmptyDraftClassGrantData,
  createEmptyDraftAbilityData,
  createEmptyDraftProficiencyData,
  createEmptyDraftLanguageData,
  createEmptyDraftEquipmentData,
  createEmptyDraftSpellEligibilityData,
  createEmptyDraftSpellData,
  isDraftRulesetData,
  isDraftSourceData,
  isDraftIdentityData,
  isDraftSpeciesData,
  isDraftSpeciesChoiceData,
  isDraftBackgroundData,
  isDraftBackgroundChoiceData,
  isDraftClassData,
  isDraftClassGrantData,
  isDraftAbilityData,
  isDraftProficiencyData,
  isDraftLanguageData,
  isDraftEquipmentData,
  isDraftSpellEligibilityData,
  isDraftSpellData,
  isAbilityScoreMethod,
} from "./character-draft-steps";

describe("CharacterDraft factory", () => {
  it("creates a valid empty draft with all step sections", () => {
    const draft = createEmptyCharacterDraft();

    expect(isCharacterDraft(draft)).toBe(true);
    expect(draft.ruleset).toEqual({ ruleset: null });
    expect(draft.sources).toEqual({ enabledSourceIds: [] });
    expect(draft.identity).toEqual({ name: "" });
    expect(draft.species).toEqual({ speciesId: null });
    expect(draft.speciesChoices).toEqual({ choices: {} });
    expect(draft.background).toEqual({ backgroundId: null });
    expect(draft.backgroundChoices).toEqual({ choices: {} });
    expect(draft.class).toEqual({ classId: null });
    expect(draft.classGrants).toEqual({ choices: {} });
    expect(draft.abilities).toEqual({ method: null });
    expect(draft.proficiencies).toEqual({ skillProficiencies: [], toolProficiencies: [] });
    expect(draft.languages).toEqual({ languageIds: [] });
    expect(draft.equipment).toEqual({ items: [] });
    expect(draft.spellEligibility).toEqual({ isSpellcaster: false });
    expect(draft.spells).toEqual({ selections: [] });
  });

  it("initializes all step statuses as unvisited", () => {
    const draft = createEmptyCharacterDraft();
    for (const step of ALL_DRAFT_STEPS) {
      expect(getStepState(draft, step)).toBe("unvisited");
    }
  });

  it("starts with no diagnostics", () => {
    const draft = createEmptyCharacterDraft();
    expect(draft.diagnostics).toEqual([]);
  });

  it("is not complete when empty", () => {
    const draft = createEmptyCharacterDraft();
    expect(isDraftComplete(draft)).toBe(false);
  });
});

describe("isCharacterDraft validator", () => {
  it("accepts a valid draft", () => {
    const draft = createEmptyCharacterDraft();
    expect(isCharacterDraft(draft)).toBe(true);
  });

  it("accepts draft with resolved steps", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "ruleset");
    draft.ruleset.ruleset = "2014";
    expect(isCharacterDraft(draft)).toBe(true);
  });
});

describe("DraftStep", () => {
  it("recognizes all valid step identifiers", () => {
    for (const step of ALL_DRAFT_STEPS) {
      expect(isDraftStep(step)).toBe(true);
    }
  });

  it("contains exactly 16 steps", () => {
    expect(ALL_DRAFT_STEPS).toHaveLength(16);
  });
});

describe("Step data validators", () => {
  it("accepts empty draft ruleset data", () => {
    expect(isDraftRulesetData(createEmptyDraftRulesetData())).toBe(true);
  });

  it("accepts draft ruleset data with valid ruleset", () => {
    expect(isDraftRulesetData({ ruleset: "2014" })).toBe(true);
    expect(isDraftRulesetData({ ruleset: "2024" })).toBe(true);
  });

  it("accepts empty draft source data", () => {
    expect(isDraftSourceData(createEmptyDraftSourceData())).toBe(true);
  });

  it("accepts draft source data with valid source IDs", () => {
    const sourceId = createSourceId("phb");
    expect(isDraftSourceData({ enabledSourceIds: [sourceId] })).toBe(true);
  });

  it("accepts empty draft identity data", () => {
    expect(isDraftIdentityData(createEmptyDraftIdentityData())).toBe(true);
  });

  it("accepts draft identity data with name", () => {
    expect(isDraftIdentityData({ name: "Frodo" })).toBe(true);
    expect(isDraftIdentityData({ name: "Frodo", playerName: "Alice" })).toBe(true);
  });

  it("accepts empty draft species data", () => {
    expect(isDraftSpeciesData(createEmptyDraftSpeciesData())).toBe(true);
  });

  it("accepts draft species data with valid entity ID", () => {
    const entityId = createEntityId("human");
    expect(isDraftSpeciesData({ speciesId: entityId })).toBe(true);
  });

  it("accepts empty draft species choice data", () => {
    expect(isDraftSpeciesChoiceData(createEmptyDraftSpeciesChoiceData())).toBe(true);
  });

  it("accepts empty draft background data", () => {
    expect(isDraftBackgroundData(createEmptyDraftBackgroundData())).toBe(true);
  });

  it("accepts empty draft background choice data", () => {
    expect(isDraftBackgroundChoiceData(createEmptyDraftBackgroundChoiceData())).toBe(true);
  });

  it("accepts empty draft class data", () => {
    expect(isDraftClassData(createEmptyDraftClassData())).toBe(true);
  });

  it("accepts draft class data with class and subclass", () => {
    const classId = createEntityId("fighter");
    const subclassId = createEntityId("champion");
    expect(isDraftClassData({ classId, subclassId })).toBe(true);
  });

  it("accepts empty draft class grant data", () => {
    expect(isDraftClassGrantData(createEmptyDraftClassGrantData())).toBe(true);
  });

  it("accepts empty draft ability data", () => {
    expect(isDraftAbilityData(createEmptyDraftAbilityData())).toBe(true);
  });

  it("accepts draft ability data with valid scores", () => {
    expect(isDraftAbilityData({
      method: "standard-array",
      scores: { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 10, CHA: 8 },
    })).toBe(true);
  });

  it("accepts empty draft proficiency data", () => {
    expect(isDraftProficiencyData(createEmptyDraftProficiencyData())).toBe(true);
  });

  it("accepts empty draft language data", () => {
    expect(isDraftLanguageData(createEmptyDraftLanguageData())).toBe(true);
  });

  it("accepts empty draft equipment data", () => {
    expect(isDraftEquipmentData(createEmptyDraftEquipmentData())).toBe(true);
  });

  it("accepts draft equipment data with valid items", () => {
    const item = {
      instanceId: createItemInstanceId("weapon-1"),
      itemId: createEntityId("longsword"),
      quantity: 1,
      equipped: true,
      attuned: false,
    };
    expect(isDraftEquipmentData({ items: [item] })).toBe(true);
  });

  it("accepts empty draft spell eligibility data", () => {
    expect(isDraftSpellEligibilityData(createEmptyDraftSpellEligibilityData())).toBe(true);
  });

  it("accepts draft spell eligibility data with spellcasting ability", () => {
    expect(isDraftSpellEligibilityData({
      isSpellcaster: true,
      spellcastingAbility: "INT",
    })).toBe(true);
  });

  it("accepts empty draft spell data", () => {
    expect(isDraftSpellData(createEmptyDraftSpellData())).toBe(true);
  });
});

describe("AbilityScoreMethod", () => {
  it("recognizes all valid methods", () => {
    expect(isAbilityScoreMethod("standard-array")).toBe(true);
    expect(isAbilityScoreMethod("point-buy")).toBe(true);
    expect(isAbilityScoreMethod("rolling")).toBe(true);
    expect(isAbilityScoreMethod("custom")).toBe(true);
  });
});

describe("Step status operations", () => {
  it("marks a step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "ruleset");
    expect(getStepState(draft, "ruleset")).toBe("resolved");
  });

  it("resolves all steps marks draft as complete", () => {
    const draft = createEmptyCharacterDraft();
    for (const step of ALL_DRAFT_STEPS) {
      markStepResolved(draft, step);
    }
    expect(isDraftComplete(draft)).toBe(true);
  });

  it("getStepStatuses returns all steps", () => {
    const draft = createEmptyCharacterDraft();
    const statuses = getStepStatuses(draft);
    expect(statuses).toHaveLength(16);
  });
});

describe("Draft mutation", () => {
  it("allows mutating step data after creation", () => {
    const draft = createEmptyCharacterDraft();
    draft.ruleset.ruleset = "2024";
    draft.identity.name = "Gandalf";
    draft.species.speciesId = createEntityId("wizard");
    draft.abilities.method = "point-buy";
    draft.abilities.scores = { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 16, CHA: 12 };

    expect(draft.ruleset.ruleset).toBe("2024");
    expect(draft.identity.name).toBe("Gandalf");
    expect(draft.abilities.method).toBe("point-buy");
    expect(draft.abilities.scores?.INT).toBe(18);
  });
});
