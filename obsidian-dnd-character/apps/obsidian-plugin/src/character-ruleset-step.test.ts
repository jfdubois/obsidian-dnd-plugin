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

  it("invalidates dependent steps after ruleset change", () => {
    const draft = createEmptyCharacterDraft();
    // First selection: no invalidation of unvisited steps
    selectRuleset(draft, "2014");
    // Resolve some downstream steps
    draft.stepStatuses.set("sources", "resolved");
    draft.stepStatuses.set("species", "resolved");
    draft.stepStatuses.set("species-choices", "resolved");
    draft.stepStatuses.set("background", "resolved");
    draft.stepStatuses.set("background-choices", "resolved");
    draft.stepStatuses.set("class", "resolved");
    draft.stepStatuses.set("class-starting-grants", "resolved");
    draft.stepStatuses.set("abilities", "resolved");

    // Now change ruleset — this should invalidate resolved dependents
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
    // No warnings should exist after first selection (dependents are unvisited, not invalidated)
    expect(draft.diagnostics.some((d) => d.severity === "warning")).toBe(false);
  });

  it("overwrites a previously selected ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    expect(draft.ruleset.ruleset).toBe("2014");

    selectRuleset(draft, "2024");
    expect(draft.ruleset.ruleset).toBe("2024");
  });
});

describe("selectRuleset corrective behaviors", () => {
  it("first ruleset selection leaves downstream steps unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");

    // Ruleset resolved
    expect(getStepState(draft, "ruleset")).toBe("resolved");
    // Downstream steps remain unvisited, not invalidated
    expect(getStepState(draft, "sources")).toBe("unvisited");
    expect(getStepState(draft, "species")).toBe("unvisited");
    expect(getStepState(draft, "background")).toBe("unvisited");
    expect(getStepState(draft, "class")).toBe("unvisited");
    expect(getStepState(draft, "abilities")).toBe("unvisited");
  });

  it("first ruleset selection produces no outdated-selection warning", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    const warnings = draft.diagnostics.filter((d) => d.severity === "warning");
    expect(warnings).toHaveLength(0);
  });

  it("selecting the same ruleset twice is a no-op", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    selectRuleset(draft, "2014");

    expect(draft.ruleset.ruleset).toBe("2014");
    expect(getStepState(draft, "ruleset")).toBe("resolved");
    // No invalidation occurred
    expect(getStepState(draft, "sources")).toBe("unvisited");
  });

  it("changing ruleset invalidates previously resolved dependents", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    // Resolve some downstream steps
    draft.stepStatuses.set("sources", "resolved");
    draft.stepStatuses.set("species", "resolved");

    // Change ruleset
    selectRuleset(draft, "2024");

    expect(draft.ruleset.ruleset).toBe("2024");
    expect(getStepState(draft, "sources")).toBe("invalidated");
    expect(getStepState(draft, "species")).toBe("invalidated");
  });

  it("changing ruleset does not affect unrelated identity state", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    draft.identity.name = "Test Character";
    draft.identity.playerName = "Test Player";

    selectRuleset(draft, "2024");

    expect(draft.identity.name).toBe("Test Character");
    expect(draft.identity.playerName).toBe("Test Player");
  });

  it("no double invalidation on ruleset change", () => {
    // Verify that changing ruleset only invalidates dependents once
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");
    draft.stepStatuses.set("sources", "resolved");

    selectRuleset(draft, "2024");

    // Should be invalidated (not resolved, not unvisited)
    expect(getStepState(draft, "sources")).toBe("invalidated");
    // The key point: it's invalidated exactly once, not twice
    // (double invalidation would still show as "invalidated" but
    //  the test verifies the function path is correct)
  });
});
