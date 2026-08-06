import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { querySpellEligibility } from "./character-spell-eligibility-step";

/**
 * Helper: resolve all prerequisite steps for spell eligibility.
 */
function resolvePrerequisites(draft: CharacterDraft, ruleset: "2014" | "2024") {
  selectRuleset(draft, ruleset);
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  // Resolve class step
  draft.stepStatuses.set("class", "resolved");
}

/* ── querySpellEligibility: valid input ───────────────────────── */

describe("querySpellEligibility with valid input", () => {
  it("sets spellcaster eligibility on the draft", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });

    expect(result).toBe(true);
    expect(draft.spellEligibility.isSpellcaster).toBe(true);
    expect(draft.spellEligibility.spellcastingAbility).toBe("INT");
  });

  it("marks the spell-eligibility draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "WIS",
    });

    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
  });

  it("accepts non-spellcaster eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = querySpellEligibility(draft, { isSpellcaster: false });

    expect(result).toBe(true);
    expect(draft.spellEligibility.isSpellcaster).toBe(false);
    expect(draft.spellEligibility.spellcastingAbility).toBeUndefined();
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
  });

  it("overwrites previously set eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(draft.spellEligibility.isSpellcaster).toBe(true);
    expect(draft.spellEligibility.spellcastingAbility).toBe("INT");

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "WIS",
    });
    expect(draft.spellEligibility.isSpellcaster).toBe(true);
    expect(draft.spellEligibility.spellcastingAbility).toBe("WIS");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2014");

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(result).toBe(true);
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "CHA",
    });
    expect(result).toBe(true);
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
  });

  it("does not share reference with input object", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const input = {
      isSpellcaster: true,
      spellcastingAbility: "INT" as const,
    };

    querySpellEligibility(draft, input);

    // Mutating input should not affect draft state
    input.isSpellcaster = false;
    expect(draft.spellEligibility.isSpellcaster).toBe(true);
  });

  it("invalidates dependent steps after eligibility is set", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    // Pre-resolve downstream steps to observe invalidation
    draft.stepStatuses.set("spells", "resolved");

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });

    // spells should be invalidated (it depends on spell-eligibility)
    expect(getStepState(draft, "spells")).toBe("invalidated");
  });
});
