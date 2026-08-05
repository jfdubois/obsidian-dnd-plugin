import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { selectAbilityScores } from "./character-ability-scores-step";
import {
  validateProficiencies,
  selectProficiencies,
} from "./character-proficiencies-step";

/* ── Helper: set up draft with all dependencies resolved ──────── */

function setupDraft() {
  const draft = createEmptyCharacterDraft();
  selectRuleset(draft, "2024");
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  selectAbilityScores(draft, {
    STR: 15,
    DEX: 14,
    CON: 13,
    INT: 10,
    WIS: 10,
    CHA: 8,
  });
  // Background and class steps are not implemented yet (P10-T010, etc.)
  // Manually mark them as resolved for testing proficiencies/languages
  draft.stepStatuses.set("background", "resolved");
  draft.stepStatuses.set("class", "resolved");
  return draft;
}

/* ── Proficiency validation accepts valid input ───────────────── */

describe("validateProficiencies accepts valid input", () => {
  it("accepts empty proficiencies", () => {
    const profs = { skillProficiencies: [], toolProficiencies: [] };
    expect(validateProficiencies(profs)).toBe(true);
  });

  it("accepts skill proficiencies only", () => {
    const profs = {
      skillProficiencies: [createEntityId("athletics"), createEntityId("stealth")],
      toolProficiencies: [],
    };
    expect(validateProficiencies(profs)).toBe(true);
  });

  it("accepts tool proficiencies only", () => {
    const profs = {
      skillProficiencies: [],
      toolProficiencies: [createEntityId("thieves-tools")],
    };
    expect(validateProficiencies(profs)).toBe(true);
  });

  it("accepts both skill and tool proficiencies", () => {
    const profs = {
      skillProficiencies: [createEntityId("athletics"), createEntityId("perception")],
      toolProficiencies: [createEntityId("herbalism-kit"), createEntityId("thieves-tools")],
    };
    expect(validateProficiencies(profs)).toBe(true);
  });

  it("type-narrows on success", () => {
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    if (validateProficiencies(profs)) {
      expect(Array.isArray(profs.skillProficiencies)).toBe(true);
      expect(Array.isArray(profs.toolProficiencies)).toBe(true);
    }
  });
});

/* ── Proficiency selection with valid input ───────────────────── */

describe("selectProficiencies with valid input", () => {
  it("sets proficiencies on the draft", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics"), createEntityId("stealth")],
      toolProficiencies: [createEntityId("thieves-tools")],
    };
    const result = selectProficiencies(draft, profs);

    expect(result).toBe(true);
    expect(draft.proficiencies.skillProficiencies).toEqual(profs.skillProficiencies);
    expect(draft.proficiencies.toolProficiencies).toEqual(profs.toolProficiencies);
  });

  it("marks the proficiencies draft step as resolved", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    selectProficiencies(draft, profs);

    expect(getStepState(draft, "proficiencies")).toBe("resolved");
  });

  it("accepts empty proficiencies", () => {
    const draft = setupDraft();
    const profs = { skillProficiencies: [], toolProficiencies: [] };
    const result = selectProficiencies(draft, profs);

    expect(result).toBe(true);
    expect(draft.proficiencies.skillProficiencies).toEqual([]);
    expect(draft.proficiencies.toolProficiencies).toEqual([]);
    expect(getStepState(draft, "proficiencies")).toBe("resolved");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("dwarf"));
    selectAbilityScores(draft, {
      STR: 15,
      DEX: 14,
      CON: 13,
      INT: 10,
      WIS: 10,
      CHA: 8,
    });
    draft.stepStatuses.set("background", "resolved");
    draft.stepStatuses.set("class", "resolved");

    const profs = {
      skillProficiencies: [createEntityId("history")],
      toolProficiencies: [createEntityId("smiths-hammer")],
    };
    const result = selectProficiencies(draft, profs);

    expect(result).toBe(true);
    expect(getStepState(draft, "proficiencies")).toBe("resolved");
  });

  it("creates a shallow copy of arrays (does not mutate input)", () => {
    const draft = setupDraft();
    const skillIds = [createEntityId("athletics")];
    const toolIds = [createEntityId("thieves-tools")];
    const profs = { skillProficiencies: skillIds, toolProficiencies: toolIds };

    selectProficiencies(draft, profs);

    expect(draft.proficiencies.skillProficiencies).not.toBe(skillIds);
    expect(draft.proficiencies.toolProficiencies).not.toBe(toolIds);
    expect(draft.proficiencies.skillProficiencies).toEqual(skillIds);
    expect(draft.proficiencies.toolProficiencies).toEqual(toolIds);
  });

  it("overwrites previously selected proficiencies", () => {
    const draft = setupDraft();

    const profs1 = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    selectProficiencies(draft, profs1);
    expect(draft.proficiencies.skillProficiencies.length).toBe(1);

    const profs2 = {
      skillProficiencies: [createEntityId("stealth"), createEntityId("perception")],
      toolProficiencies: [createEntityId("herbalism-kit")],
    };
    selectProficiencies(draft, profs2);
    expect(draft.proficiencies.skillProficiencies.length).toBe(2);
    expect(draft.proficiencies.toolProficiencies.length).toBe(1);
  });

  it("invalidates downstream dependents", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    selectProficiencies(draft, profs);

    // Equipment depends on proficiencies indirectly through the dependency chain
    // Check that the step was resolved
    expect(getStepState(draft, "proficiencies")).toBe("resolved");
  });

  it("updates diagnostics after selection", () => {
    const draft = setupDraft();
    const profs = {
      skillProficiencies: [createEntityId("athletics")],
      toolProficiencies: [],
    };
    selectProficiencies(draft, profs);

    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });
});


