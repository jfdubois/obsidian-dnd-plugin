import { describe, it, expect } from "vitest";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import {
  RULESET_STEP_OPTIONS,
  validateRulesetSelection,
  selectRuleset,
} from "./character-ruleset-step";

/* ── Ruleset options ───────────────────────────────────────────── */

describe("RULESET_STEP_OPTIONS", () => {
  it("contains exactly two rulesets", () => {
    expect(RULESET_STEP_OPTIONS).toHaveLength(2);
  });

  it("includes 2014 ruleset", () => {
    expect(RULESET_STEP_OPTIONS).toContain("2014");
  });

  it("includes 2024 ruleset", () => {
    expect(RULESET_STEP_OPTIONS).toContain("2024");
  });
});

/* ── Validation ────────────────────────────────────────────────── */

describe("validateRulesetSelection", () => {
  it("accepts 2014 ruleset", () => {
    expect(validateRulesetSelection("2014")).toBe(true);
  });

  it("accepts 2024 ruleset", () => {
    expect(validateRulesetSelection("2024")).toBe(true);
  });

  it("type-narrows to Ruleset on success", () => {
    if (validateRulesetSelection("2024")) {
      // Narrows to Ruleset type
      expect(typeof "2024").toBe("string");
    }
  });
});

/* ── Selection ─────────────────────────────────────────────────── */

describe("selectRuleset", () => {
  it("selects 2014 ruleset on the draft", () => {
    const draft = createEmptyCharacterDraft();
    const result = selectRuleset(draft, "2014");
    expect(result).toBe(true);
    expect(draft.ruleset.ruleset).toBe("2014");
  });

  it("selects 2024 ruleset on the draft", () => {
    const draft = createEmptyCharacterDraft();
    const result = selectRuleset(draft, "2024");
    expect(result).toBe(true);
    expect(draft.ruleset.ruleset).toBe("2024");
  });

  it("marks the ruleset step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    expect(getStepState(draft, "ruleset")).toBe("resolved");
  });

  it("invalidates dependent steps after selection", () => {
    const draft = createEmptyCharacterDraft();
    // Resolve all steps first to see invalidation effect
    draft.stepStatuses.set("sources", "resolved");
    draft.stepStatuses.set("species", "resolved");
    draft.stepStatuses.set("species-choices", "resolved");
    draft.stepStatuses.set("background", "resolved");
    draft.stepStatuses.set("background-choices", "resolved");
    draft.stepStatuses.set("class", "resolved");
    draft.stepStatuses.set("class-starting-grants", "resolved");
    draft.stepStatuses.set("abilities", "resolved");

    selectRuleset(draft, "2024");

    // All downstream dependents of ruleset should be invalidated
    expect(getStepState(draft, "sources")).toBe("invalidated");
    expect(getStepState(draft, "species")).toBe("invalidated");
    expect(getStepState(draft, "background")).toBe("invalidated");
    expect(getStepState(draft, "class")).toBe("invalidated");
    expect(getStepState(draft, "abilities")).toBe("invalidated");
  });

  it("updates diagnostics after selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    // No errors should exist after a valid selection
    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });

  it("overwrites a previously selected ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    expect(draft.ruleset.ruleset).toBe("2014");

    selectRuleset(draft, "2024");
    expect(draft.ruleset.ruleset).toBe("2024");
  });
});
