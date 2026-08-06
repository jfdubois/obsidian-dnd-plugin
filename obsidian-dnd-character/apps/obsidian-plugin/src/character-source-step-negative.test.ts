import { describe, it, expect } from "vitest";
import { createSourceId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import {
  validateSourceSelection,
  selectSources,
} from "./character-source-step";

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateSourceSelection rejects invalid input", () => {
  it("rejects null", () => {
    expect(validateSourceSelection(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateSourceSelection(undefined)).toBe(false);
  });

  it("rejects non-array string", () => {
    expect(validateSourceSelection("PHB")).toBe(false);
  });

  it("rejects number", () => {
    expect(validateSourceSelection(42)).toBe(false);
  });

  it("rejects boolean", () => {
    expect(validateSourceSelection(true)).toBe(false);
  });

  it("rejects object", () => {
    expect(validateSourceSelection({})).toBe(false);
  });

  it("rejects array with empty string", () => {
    expect(validateSourceSelection([""])).toBe(false);
  });

  it("rejects array with null element", () => {
    expect(validateSourceSelection([null])).toBe(false);
  });

  it("rejects array with undefined element", () => {
    expect(validateSourceSelection([undefined])).toBe(false);
  });

  it("rejects array with number element", () => {
    expect(validateSourceSelection([42])).toBe(false);
  });

  it("rejects array with mixed valid and invalid elements", () => {
    expect(
      validateSourceSelection([createSourceId("PHB"), ""]),
    ).toBe(false);
  });
});

/* ── Selection rejects when ruleset not resolved ──────────────── */

describe("selectSources rejects when ruleset not resolved", () => {
  it("rejects when ruleset is unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const result = selectSources(draft, [createSourceId("PHB")]);
    expect(result).toBe(false);
  });

  it("rejects when ruleset is invalidated", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    // Manually invalidate the ruleset step
    draft.stepStatuses.set("ruleset", "invalidated");

    const result = selectSources(draft, [createSourceId("PHB")]);
    expect(result).toBe(false);
  });
});

/* ── Selection rejects invalid source IDs ─────────────────────── */

describe("selectSources rejects invalid source IDs", () => {
  it("rejects empty string in array", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(selectSources(draft, [""])).toBe(false);
  });

  it("rejects null in array", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(selectSources(draft, [null])).toBe(false);
  });

  it("rejects non-array value", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(selectSources(draft, "PHB")).toBe(false);
  });

  it("rejects null value", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(selectSources(draft, null)).toBe(false);
  });

  it("rejects undefined value", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(selectSources(draft, undefined)).toBe(false);
  });

  it("rejects duplicate source IDs", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(
      selectSources(draft, [
        createSourceId("PHB"),
        createSourceId("PHB"),
      ]),
    ).toBe(false);
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectSources does not mutate draft on rejection", () => {
  it("does not change sources data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    expect(draft.sources.enabledSourceIds).toEqual([]);

    selectSources(draft, [""]);
    expect(draft.sources.enabledSourceIds).toEqual([]);
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    // sources remains "unvisited" on first ruleset selection
    expect(getStepState(draft, "sources")).toBe("unvisited");

    selectSources(draft, [null]);
    // Must remain unvisited, not become resolved
    expect(getStepState(draft, "sources")).toBe("unvisited");
  });

  it("does not invalidate dependents for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    draft.stepStatuses.set("species", "resolved");

    selectSources(draft, []); // This is valid, so dependents get invalidated
    // Reset for the actual test
    draft.stepStatuses.set("sources", "unvisited");
    draft.stepStatuses.set("species", "resolved");

    selectSources(draft, [""]);
    expect(getStepState(draft, "species")).toBe("resolved");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    selectSources(draft, [createSourceId("PHB")]);
    expect(draft.sources.enabledSourceIds).toEqual([createSourceId("PHB")]);

    selectSources(draft, [""]);
    expect(draft.sources.enabledSourceIds).toEqual([createSourceId("PHB")]);
  });

  it("does not set sources when ruleset not resolved", () => {
    const draft = createEmptyCharacterDraft();

    selectSources(draft, [createSourceId("PHB")]);
    expect(draft.sources.enabledSourceIds).toEqual([]);
    expect(getStepState(draft, "sources")).toBe("unvisited");
  });
});
