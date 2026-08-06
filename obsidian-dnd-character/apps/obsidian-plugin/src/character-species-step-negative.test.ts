import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import {
  validateSpeciesSelection,
  selectSpecies,
} from "./character-species-step";

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateSpeciesSelection rejects invalid input", () => {
  it("rejects null", () => {
    expect(validateSpeciesSelection(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateSpeciesSelection(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateSpeciesSelection("")).toBe(false);
  });

  it("rejects number", () => {
    expect(validateSpeciesSelection(42)).toBe(false);
  });

  it("rejects boolean", () => {
    expect(validateSpeciesSelection(true)).toBe(false);
  });

  it("rejects object", () => {
    expect(validateSpeciesSelection({})).toBe(false);
  });

  it("rejects array", () => {
    expect(validateSpeciesSelection([])).toBe(false);
  });

  // Note: isEntityId only checks for non-empty string at runtime;
  // the brand is a compile-time TypeScript construct.
  it("accepts non-empty strings at runtime (brand is compile-time only)", () => {
    expect(validateSpeciesSelection("human")).toBe(true);
  });
});

/* ── Selection rejects when ruleset not resolved ──────────────── */

describe("selectSpecies rejects when ruleset not resolved", () => {
  it("rejects when ruleset is unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(false);
  });

  it("rejects when ruleset is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    // Manually invalidate the ruleset step
    draft.stepStatuses.set("ruleset", "invalidated");

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(false);
  });
});

/* ── Selection rejects when sources not resolved ──────────────── */

describe("selectSpecies rejects when sources not resolved", () => {
  it("rejects when sources is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    // sources is invalidated by ruleset selection, not resolved

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(false);
  });

  it("rejects when sources is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    // Manually invalidate the sources step
    draft.stepStatuses.set("sources", "invalidated");

    const result = selectSpecies(draft, createEntityId("human"));
    expect(result).toBe(false);
  });
});

/* ── Selection rejects invalid species IDs ────────────────────── */

describe("selectSpecies rejects invalid species IDs", () => {
  it("rejects null species ID", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(selectSpecies(draft, null)).toBe(false);
  });

  it("rejects undefined species ID", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(selectSpecies(draft, undefined)).toBe(false);
  });

  it("rejects empty string species ID", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(selectSpecies(draft, "")).toBe(false);
  });

  it("rejects number species ID", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(selectSpecies(draft, 42)).toBe(false);
  });

  // Note: isEntityId accepts any non-empty string at runtime;
  // the brand is a compile-time TypeScript construct.
  it("accepts non-empty string species ID at runtime", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(selectSpecies(draft, "human")).toBe(true);
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectSpecies does not mutate draft on rejection", () => {
  it("does not change species data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    expect(draft.species.speciesId).toBeNull();

    selectSpecies(draft, null);
    expect(draft.species.speciesId).toBeNull();
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    // species is "invalidated" by upstream resolution
    expect(getStepState(draft, "species")).toBe("invalidated");

    selectSpecies(draft, null);
    // Must remain invalidated, not become resolved
    expect(getStepState(draft, "species")).toBe("invalidated");
  });

  it("does not invalidate dependents for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    // Pre-resolve a dependent step
    draft.stepStatuses.set("species-choices", "resolved");

    selectSpecies(draft, null);
    // species-choices should remain resolved (not invalidated)
    expect(getStepState(draft, "species-choices")).toBe("resolved");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);

    selectSpecies(draft, createEntityId("human"));
    expect(draft.species.speciesId).toBe(createEntityId("human"));

    selectSpecies(draft, null);
    expect(draft.species.speciesId).toBe(createEntityId("human"));
  });

  it("does not set species when ruleset not resolved", () => {
    const draft = createEmptyCharacterDraft();

    selectSpecies(draft, createEntityId("human"));
    expect(draft.species.speciesId).toBeNull();
    expect(getStepState(draft, "species")).toBe("unvisited");
  });

  it("does not set species when sources not resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    // sources remains unvisited on first ruleset selection, not resolved

    selectSpecies(draft, createEntityId("human"));
    expect(draft.species.speciesId).toBeNull();
    expect(getStepState(draft, "species")).toBe("unvisited");
  });
});
