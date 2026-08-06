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

/* ── querySpellEligibility: rejects when deps not resolved ─────── */

describe("querySpellEligibility rejects when deps not resolved", () => {
  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    // class is not resolved

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(result).toBe(false);
  });

  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    // species is not resolved
    draft.stepStatuses.set("class", "resolved");

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(result).toBe(false);
  });

  it("rejects when all deps are unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const result = querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(result).toBe(false);
  });
});

/* ── querySpellEligibility: rejects invalid input ──────────────── */

describe("querySpellEligibility rejects invalid input", () => {
  it("rejects null eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, null)).toBe(false);
  });

  it("rejects undefined eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, undefined)).toBe(false);
  });

  it("rejects empty string eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, "")).toBe(false);
  });

  it("rejects number eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, 42)).toBe(false);
  });

  it("rejects boolean eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, true)).toBe(false);
  });

  it("rejects array eligibility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, [])).toBe(false);
  });

  it("rejects eligibility with invalid spellcastingAbility", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INVALID",
    })).toBe(false);
  });
});

/* ── querySpellEligibility: no mutation on rejection ───────────── */

describe("querySpellEligibility does not mutate draft on rejection", () => {
  it("does not change eligibility data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(draft.spellEligibility.isSpellcaster).toBe(false);

    querySpellEligibility(draft, null);
    expect(draft.spellEligibility.isSpellcaster).toBe(false);
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    // spell-eligibility remains "unvisited" after upstream resolution (P10-T020 fix)
    expect(getStepState(draft, "spell-eligibility")).toBe("unvisited");

    querySpellEligibility(draft, null);
    expect(getStepState(draft, "spell-eligibility")).toBe("unvisited");
  });

  it("does not resolve step when deps not resolved", () => {
    const draft = createEmptyCharacterDraft();

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(getStepState(draft, "spell-eligibility")).toBe("unvisited");
  });

  it("preserves existing valid eligibility after failed re-query", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    querySpellEligibility(draft, {
      isSpellcaster: true,
      spellcastingAbility: "INT",
    });
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
    expect(draft.spellEligibility.isSpellcaster).toBe(true);

    querySpellEligibility(draft, null);
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
    expect(draft.spellEligibility.isSpellcaster).toBe(true);
    expect(draft.spellEligibility.spellcastingAbility).toBe("INT");
  });
});
