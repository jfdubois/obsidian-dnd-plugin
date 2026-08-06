import { describe, it, expect } from "vitest";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import {
  validateSpeciesSelection,
  selectSpecies,
} from "./character-species-step";

/* ── Validation accepts valid input ───────────────────────────── */

describe("validateSpeciesSelection accepts valid input", () => {
  it("accepts a valid entity ID", () => {
    expect(validateSpeciesSelection(createEntityId("human"))).toBe(true);
  });

  it("accepts entity ID for any species name", () => {
    expect(validateSpeciesSelection(createEntityId("elf"))).toBe(true);
    expect(validateSpeciesSelection(createEntityId("dwarf"))).toBe(true);
    expect(validateSpeciesSelection(createEntityId("halfling"))).toBe(true);
  });

  it("type-narrows to EntityId on success", () => {
    const id = createEntityId("human");
    if (validateSpeciesSelection(id)) {
      // Narrows to EntityId
      expect(typeof id).toBe("string");
    }
  });
});

/* ── Selection with valid input ────────────────────────────────── */

describe("selectSpecies with valid input", () => {
  it("sets speciesId on the draft", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    const speciesId = createEntityId("human");
    const result = selectSpecies(draft, speciesId);

    expect(result).toBe(true);
    expect(draft.species.speciesId).toBe(speciesId);
  });

  it("marks the species draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    selectSpecies(draft, createEntityId("elf"));

    expect(getStepState(draft, "species")).toBe("resolved");
  });

  it("does not mark species-choices as resolved (that is P10-T007)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    selectSpecies(draft, createEntityId("elf"));

    // Only the species draft step is resolved, not species-choices
    // species-choices remains unvisited (not invalidated) because it was never visited
    expect(getStepState(draft, "species")).toBe("resolved");
    expect(getStepState(draft, "species-choices")).toBe("unvisited");
  });

  it("invalidates dependent steps after selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    // Pre-resolve downstream steps to observe invalidation
    draft.stepStatuses.set("species-choices", "resolved");
    draft.stepStatuses.set("abilities", "resolved");
    draft.stepStatuses.set("proficiencies", "resolved");

    selectSpecies(draft, createEntityId("dwarf"));

    // All downstream dependents of species should be invalidated
    expect(getStepState(draft, "species-choices")).toBe("invalidated");
    expect(getStepState(draft, "abilities")).toBe("invalidated");
    expect(getStepState(draft, "proficiencies")).toBe("invalidated");
  });

  it("overwrites a previously selected species", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    selectSpecies(draft, createEntityId("human"));
    expect(draft.species.speciesId).toBe(createEntityId("human"));

    selectSpecies(draft, createEntityId("elf"));
    expect(draft.species.speciesId).toBe(createEntityId("elf"));
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(true);
    expect(draft.species.speciesId).toBe(createEntityId("human"));
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(true);
    expect(draft.species.speciesId).toBe(createEntityId("human"));
  });

  it("works with optional sources selected", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, [createSourceId("XGtE")]);

    const result = selectSpecies(draft, createEntityId("gnome"));
    expect(result).toBe(true);
    expect(draft.species.speciesId).toBe(createEntityId("gnome"));
  });

  it("updates diagnostics after selection (CRE-008: unresolved species choices)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));

    // CRE-008: species selected but species-choices not resolved → error
    const hasUnresolvedChoiceError = draft.diagnostics.some(
      (d) => d.severity === "error" && d.step === "species-choices",
    );
    expect(hasUnresolvedChoiceError).toBe(true);
  });
});
