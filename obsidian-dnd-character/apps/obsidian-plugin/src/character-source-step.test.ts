import { describe, it, expect } from "vitest";
import { createSourceId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import {
  validateSourceSelection,
  selectSources,
} from "./character-source-step";

/* ── Validation accepts valid input ───────────────────────────── */

describe("validateSourceSelection accepts valid input", () => {
  it("accepts empty array (no optional sources)", () => {
    expect(validateSourceSelection([])).toBe(true);
  });

  it("accepts single valid source ID", () => {
    expect(validateSourceSelection([createSourceId("PHB")])).toBe(true);
  });

  it("accepts multiple valid source IDs", () => {
    expect(
      validateSourceSelection([
        createSourceId("PHB"),
        createSourceId("XGtE"),
        createSourceId("DMG"),
      ]),
    ).toBe(true);
  });

  it("type-narrows to SourceId[] on success", () => {
    const ids = [createSourceId("PHB"), createSourceId("XGtE")];
    if (validateSourceSelection(ids)) {
      // Narrows to SourceId[]
      expect(ids.every((id) => typeof id === "string")).toBe(true);
    }
  });
});

/* ── Selection with valid input ────────────────────────────────── */

describe("selectSources with valid input", () => {
  it("sets enabledSourceIds on the draft", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    const sourceIds = [createSourceId("XGtE"), createSourceId("TCE")];
    const result = selectSources(draft, sourceIds);

    expect(result).toBe(true);
    expect(draft.sources.enabledSourceIds).toEqual(sourceIds);
  });

  it("accepts empty source array (core-only character)", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");

    const result = selectSources(draft, []);

    expect(result).toBe(true);
    expect(draft.sources.enabledSourceIds).toEqual([]);
  });

  it("marks the sources step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    selectSources(draft, [createSourceId("PHB")]);

    expect(getStepState(draft, "sources")).toBe("resolved");
  });

  it("invalidates dependent steps after selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    // Pre-resolve downstream steps to observe invalidation
    draft.stepStatuses.set("species", "resolved");
    draft.stepStatuses.set("background", "resolved");
    draft.stepStatuses.set("class", "resolved");

    selectSources(draft, [createSourceId("XGtE")]);

    // All downstream dependents of sources should be invalidated
    expect(getStepState(draft, "species")).toBe("invalidated");
    expect(getStepState(draft, "background")).toBe("invalidated");
    expect(getStepState(draft, "class")).toBe("invalidated");
  });

  it("overwrites previously selected sources", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    selectSources(draft, [createSourceId("XGtE")]);
    expect(draft.sources.enabledSourceIds).toEqual([createSourceId("XGtE")]);

    selectSources(draft, [createSourceId("TCE"), createSourceId("FToD")]);
    expect(draft.sources.enabledSourceIds).toEqual([
      createSourceId("TCE"),
      createSourceId("FToD"),
    ]);
  });

  it("does not mutate the input array", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    const input = [createSourceId("PHB")];
    selectSources(draft, input);

    // Draft should have a copy, not the original reference
    expect(draft.sources.enabledSourceIds).toEqual(input);
    expect(draft.sources.enabledSourceIds).not.toBe(input);
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2014");

    const result = selectSources(draft, [createSourceId("PHB")]);
    expect(result).toBe(true);
    expect(draft.sources.enabledSourceIds).toEqual([createSourceId("PHB")]);
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");

    const result = selectSources(draft, [createSourceId("PHB2024")]);
    expect(result).toBe(true);
    expect(draft.sources.enabledSourceIds).toEqual([createSourceId("PHB2024")]);
  });
});

/* ── Updates diagnostics after selection ──────────────────────── */

describe("selectSources updates diagnostics", () => {
  it("has no errors after valid selection", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, [createSourceId("XGtE")]);

    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });
});
