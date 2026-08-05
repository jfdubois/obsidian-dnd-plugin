import { describe, it, expect } from "vitest";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import {
  RULESET_STEP_OPTIONS,
  validateRulesetSelection,
  selectRuleset,
} from "./character-ruleset-step";

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateRulesetSelection rejects invalid input", () => {
  it("rejects 3e ruleset", () => {
    expect(validateRulesetSelection("3e")).toBe(false);
  });

  it("rejects 5e ruleset", () => {
    expect(validateRulesetSelection("5e")).toBe(false);
  });

  it("rejects 2025 ruleset", () => {
    expect(validateRulesetSelection("2025")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateRulesetSelection("")).toBe(false);
  });

  it("rejects null", () => {
    expect(validateRulesetSelection(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateRulesetSelection(undefined)).toBe(false);
  });

  it("rejects numeric value", () => {
    expect(validateRulesetSelection(2024)).toBe(false);
  });

  it("rejects boolean value", () => {
    expect(validateRulesetSelection(true)).toBe(false);
  });

  it("rejects object value", () => {
    expect(validateRulesetSelection({})).toBe(false);
  });

  it("rejects array value", () => {
    expect(validateRulesetSelection([])).toBe(false);
  });
});

/* ── Selection rejects invalid input ──────────────────────────── */

describe("selectRuleset rejects invalid input", () => {
  it("returns false for 3e ruleset", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, "3e")).toBe(false);
  });

  it("returns false for 5e ruleset", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, "5e")).toBe(false);
  });

  it("returns false for empty string", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, "")).toBe(false);
  });

  it("returns false for null", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, null)).toBe(false);
  });

  it("returns false for undefined", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, undefined)).toBe(false);
  });

  it("returns false for numeric value", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, 2024)).toBe(false);
  });

  it("returns false for boolean value", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectRuleset(draft, true)).toBe(false);
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectRuleset does not mutate draft on rejection", () => {
  it("does not change ruleset data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    expect(draft.ruleset.ruleset).toBe(null);

    selectRuleset(draft, "3e");
    expect(draft.ruleset.ruleset).toBe(null);
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "invalid");
    expect(getStepState(draft, "ruleset")).toBe("unvisited");
  });

  it("does not invalidate dependents for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    draft.stepStatuses.set("sources", "resolved");

    selectRuleset(draft, "invalid");
    expect(getStepState(draft, "sources")).toBe("resolved");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    expect(draft.ruleset.ruleset).toBe("2024");

    selectRuleset(draft, "3e");
    expect(draft.ruleset.ruleset).toBe("2024");
  });
});

/* ── Options do not contain invalid rulesets ──────────────────── */

describe("RULESET_STEP_OPTIONS contains only valid rulesets", () => {
  it("does not include 3e", () => {
    expect(RULESET_STEP_OPTIONS.includes("3e" as never)).toBe(false);
  });

  it("does not include 5e", () => {
    expect(RULESET_STEP_OPTIONS.includes("5e" as never)).toBe(false);
  });

  it("every option passes validation", () => {
    for (const option of RULESET_STEP_OPTIONS) {
      expect(validateRulesetSelection(option)).toBe(true);
    }
  });
});
