import { describe, it, expect } from "vitest";
import { isCharacterDraft } from "./character-draft";
import {
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
  isDraftStep,
} from "./character-draft-steps";

describe("isCharacterDraft rejects invalid input", () => {
  it("rejects null", () => {
    expect(isCharacterDraft(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isCharacterDraft(undefined)).toBe(false);
  });

  it("rejects a plain object", () => {
    expect(isCharacterDraft({})).toBe(false);
  });

  it("rejects a string", () => {
    expect(isCharacterDraft("draft")).toBe(false);
  });

  it("rejects a number", () => {
    expect(isCharacterDraft(42)).toBe(false);
  });

  it("rejects an array", () => {
    expect(isCharacterDraft([])).toBe(false);
  });

  it("rejects object missing stepStatuses", () => {
    expect(isCharacterDraft({
      ruleset: { ruleset: null },
      sources: { enabledSourceIds: [] },
      identity: { name: "" },
      species: { speciesId: null },
      speciesChoices: { choices: {} },
      background: { backgroundId: null },
      backgroundChoices: { choices: {} },
      class: { classId: null },
      classGrants: { choices: {} },
      abilities: { method: null },
      proficiencies: { skillProficiencies: [], toolProficiencies: [] },
      languages: { languageIds: [] },
      equipment: { items: [] },
      spellEligibility: { isSpellcaster: false },
      spells: { selections: [] },
      diagnostics: [],
    })).toBe(false);
  });

  it("rejects object with non-Map stepStatuses", () => {
    expect(isCharacterDraft({
      ruleset: { ruleset: null },
      sources: { enabledSourceIds: [] },
      identity: { name: "" },
      species: { speciesId: null },
      speciesChoices: { choices: {} },
      background: { backgroundId: null },
      backgroundChoices: { choices: {} },
      class: { classId: null },
      classGrants: { choices: {} },
      abilities: { method: null },
      proficiencies: { skillProficiencies: [], toolProficiencies: [] },
      languages: { languageIds: [] },
      equipment: { items: [] },
      spellEligibility: { isSpellcaster: false },
      spells: { selections: [] },
      stepStatuses: {},
      diagnostics: [],
    })).toBe(false);
  });

  it("rejects object with non-array diagnostics", () => {
    expect(isCharacterDraft({
      ruleset: { ruleset: null },
      sources: { enabledSourceIds: [] },
      identity: { name: "" },
      species: { speciesId: null },
      speciesChoices: { choices: {} },
      background: { backgroundId: null },
      backgroundChoices: { choices: {} },
      class: { classId: null },
      classGrants: { choices: {} },
      abilities: { method: null },
      proficiencies: { skillProficiencies: [], toolProficiencies: [] },
      languages: { languageIds: [] },
      equipment: { items: [] },
      spellEligibility: { isSpellcaster: false },
      spells: { selections: [] },
      stepStatuses: new Map(),
      diagnostics: {},
    })).toBe(false);
  });
});

describe("isDraftRulesetData rejects invalid input", () => {
  it("rejects null", () => {
    expect(isDraftRulesetData(null)).toBe(false);
  });

  it("rejects invalid ruleset value", () => {
    expect(isDraftRulesetData({ ruleset: "3e" })).toBe(false);
    expect(isDraftRulesetData({ ruleset: "5e" })).toBe(false);
  });

  it("rejects missing ruleset field", () => {
    expect(isDraftRulesetData({})).toBe(false);
  });
});

describe("isDraftSourceData rejects invalid input", () => {
  it("rejects non-array enabledSourceIds", () => {
    expect(isDraftSourceData({ enabledSourceIds: "phb" })).toBe(false);
  });

  it("rejects invalid source IDs", () => {
    expect(isDraftSourceData({ enabledSourceIds: [null] })).toBe(false);
    expect(isDraftSourceData({ enabledSourceIds: [123] })).toBe(false);
  });
});

describe("isDraftIdentityData rejects invalid input", () => {
  it("rejects missing name", () => {
    expect(isDraftIdentityData({})).toBe(false);
  });

  it("rejects non-string name", () => {
    expect(isDraftIdentityData({ name: 123 })).toBe(false);
  });

  it("rejects non-string playerName", () => {
    expect(isDraftIdentityData({ name: "Frodo", playerName: 42 })).toBe(false);
  });
});

describe("isDraftSpeciesData rejects invalid input", () => {
  it("rejects invalid speciesId", () => {
    expect(isDraftSpeciesData({ speciesId: 123 })).toBe(false);
  });
});

describe("isDraftSpeciesChoiceData rejects invalid input", () => {
  it("rejects array as choices", () => {
    expect(isDraftSpeciesChoiceData({ choices: [] })).toBe(false);
  });

  it("rejects null as choices", () => {
    expect(isDraftSpeciesChoiceData({ choices: null })).toBe(false);
  });
});

describe("isDraftBackgroundData rejects invalid input", () => {
  it("rejects invalid backgroundId", () => {
    expect(isDraftBackgroundData({ backgroundId: 123 })).toBe(false);
  });
});

describe("isDraftClassData rejects invalid input", () => {
  it("rejects invalid classId", () => {
    expect(isDraftClassData({ classId: 123 })).toBe(false);
  });

  it("rejects invalid subclassId", () => {
    expect(isDraftClassData({ classId: null, subclassId: 123 })).toBe(false);
  });
});

describe("isDraftAbilityData rejects invalid input", () => {
  it("rejects invalid method", () => {
    expect(isDraftAbilityData({ method: "dice" })).toBe(false);
  });

  it("rejects out-of-range ability scores", () => {
    expect(isDraftAbilityData({
      method: "custom",
      scores: { STR: 0, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 8 },
    })).toBe(false);
  });

  it("rejects ability score above 30", () => {
    expect(isDraftAbilityData({
      method: "custom",
      scores: { STR: 31, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 8 },
    })).toBe(false);
  });

  it("rejects non-ability score keys", () => {
    expect(isDraftAbilityData({
      method: "custom",
      scores: { LUCK: 15, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 8 },
    })).toBe(false);
  });

  it("rejects invalid roll results (out of range)", () => {
    expect(isDraftAbilityData({
      method: "rolling",
      rollResults: { STR: [21, 15, 12], DEX: [14, 10, 8], CON: [12, 10, 8], INT: [10, 8, 6], WIS: [10, 8, 6], CHA: [8, 6, 4] },
    })).toBe(false);
  });
});

describe("isDraftProficiencyData rejects invalid input", () => {
  it("rejects non-array skillProficiencies", () => {
    expect(isDraftProficiencyData({ skillProficiencies: "athletics", toolProficiencies: [] })).toBe(false);
  });

  it("rejects invalid entity IDs in skillProficiencies", () => {
    expect(isDraftProficiencyData({ skillProficiencies: [123], toolProficiencies: [] })).toBe(false);
  });
});

describe("isDraftLanguageData rejects invalid input", () => {
  it("rejects non-array languageIds", () => {
    expect(isDraftLanguageData({ languageIds: "common" })).toBe(false);
  });
});

describe("isDraftSpellEligibilityData rejects invalid input", () => {
  it("rejects missing isSpellcaster", () => {
    expect(isDraftSpellEligibilityData({})).toBe(false);
  });

  it("rejects non-boolean isSpellcaster", () => {
    expect(isDraftSpellEligibilityData({ isSpellcaster: "yes" })).toBe(false);
  });

  it("rejects invalid spellcastingAbility", () => {
    expect(isDraftSpellEligibilityData({
      isSpellcaster: true,
      spellcastingAbility: "LUCK",
    })).toBe(false);
  });
});

describe("isAbilityScoreMethod rejects invalid input", () => {
  it("rejects unknown methods", () => {
    expect(isAbilityScoreMethod("dice")).toBe(false);
    expect(isAbilityScoreMethod("random")).toBe(false);
    expect(isAbilityScoreMethod(null)).toBe(false);
  });
});

describe("isDraftStep rejects invalid input", () => {
  it("rejects unknown step names", () => {
    expect(isDraftStep("level-up")).toBe(false);
    expect(isDraftStep("equipment-slots")).toBe(false);
    expect(isDraftStep("feats")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isDraftStep(123)).toBe(false);
    expect(isDraftStep(null)).toBe(false);
  });
});

describe("choice-data validators reject invalid input", () => {
  it("rejects array or null as choices for class grants", () => {
    expect(isDraftClassGrantData({ choices: [] })).toBe(false);
    expect(isDraftClassGrantData({ choices: null })).toBe(false);
  });

  it("rejects array as choices for background choices", () => {
    expect(isDraftBackgroundChoiceData({ choices: [] })).toBe(false);
  });
});

describe("isDraftEquipmentData rejects invalid input", () => {
  it("rejects non-array or invalid items", () => {
    expect(isDraftEquipmentData({ items: {} })).toBe(false);
    expect(isDraftEquipmentData({ items: [{}] })).toBe(false);
  });
});

describe("isDraftSpellData rejects invalid input", () => {
  it("rejects non-array or invalid selections", () => {
    expect(isDraftSpellData({ selections: {} })).toBe(false);
    expect(isDraftSpellData({ selections: [{}] })).toBe(false);
  });
});
