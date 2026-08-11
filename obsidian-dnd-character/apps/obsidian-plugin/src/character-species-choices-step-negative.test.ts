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
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [] },
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

    expect(draft.selections).toEqual({});

    selectSpeciesChoices(draft, null);
    expect(draft.selections).toEqual({});
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // species-choices remains "unvisited" after species resolution (P10-T020 fix)
    expect(getStepState(draft, "species-choices")).toBe("unvisited");

    selectSpeciesChoices(draft, null);
    // Must remain unvisited, not become resolved
    expect(getStepState(draft, "species-choices")).toBe("unvisited");
  });

  it("does not resolve step when species not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [] },
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
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("darkvision_60ft")] },
    });

    selectSpeciesChoices(draft, { darkvision: choice });
    expect(getStepState(draft, "species-choices")).toBe("resolved");

    // Try to set invalid choices
    selectSpeciesChoices(draft, null);
    // Draft must remain unchanged
    expect(getStepState(draft, "species-choices")).toBe("resolved");
    expect(draft.selections).toHaveProperty("darkvision");
  });

  it("does not set choices when species not resolved", () => {
    const draft = createEmptyCharacterDraft();

    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("trait"),
      definitionId: createChoiceDefinitionId("trait_def"),
      originGrantId: createEntityId("human"),
      selectedValue: { type: "entity-ids", entityIds: [] },
    });

    selectSpeciesChoices(draft, { trait: choice });
    expect(draft.selections).toEqual({});
    expect(getStepState(draft, "species-choices")).toBe("unvisited");
  });
});

/* ── Zero-choice recursion guard (P10-T020) ─────────────────────
   Prevents infinite loop: renderSpeciesChoices() -> zero choices ->
   onChoicesResolved({}) -> selectSpeciesChoices() returns true ->
   renderCurrentStep() -> renderSpeciesChoices() -> repeat forever.   */

describe("selectSpeciesChoices zero-choice recursion guard", () => {
  it("rejects empty choices when step is already resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // First call: empty choices succeeds (zero-choice auto-resolve)
    expect(selectSpeciesChoices(draft, {})).toBe(true);
    expect(getStepState(draft, "species-choices")).toBe("resolved");

    // Second call: empty choices must be rejected (prevents infinite loop)
    expect(selectSpeciesChoices(draft, {})).toBe(false);
  });

  it("still accepts empty choices after species change invalidates step", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // Resolve with empty choices (zero-choice species)
    expect(selectSpeciesChoices(draft, {})).toBe(true);
    expect(getStepState(draft, "species-choices")).toBe("resolved");

    // Change species -> invalidates species-choices step
    selectSpecies(draft, createEntityId("elf"));
    expect(getStepState(draft, "species-choices")).toBe("invalidated");

    // Empty choices must be accepted again for new species
    expect(selectSpeciesChoices(draft, {})).toBe(true);
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("still accepts non-empty choices after step is resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("elf"));

    // First resolve with empty choices
    expect(selectSpeciesChoices(draft, {})).toBe(true);

    // Now submit actual choices (user interacted with dropdown)
    const choice = createCharacterChoice({
      instanceId: createChoiceInstanceId("fey_ancestry"),
      definitionId: createChoiceDefinitionId("fey_ancestry_def"),
      originGrantId: createEntityId("elf"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("fey_ancestry_feat")] },
    });
    expect(selectSpeciesChoices(draft, { feyAncestry: choice })).toBe(true);
    expect(draft.selections).toHaveProperty("feyAncestry");
  });

  it("does not mutate draft when rejecting duplicate empty choices", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // First call resolves
    expect(selectSpeciesChoices(draft, {})).toBe(true);
    const firstState = getStepState(draft, "species-choices");

    // Second call must not change anything
    expect(selectSpeciesChoices(draft, {})).toBe(false);
    expect(getStepState(draft, "species-choices")).toBe(firstState);
    expect(draft.selections).toEqual({});
  });
});
