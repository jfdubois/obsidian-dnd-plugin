import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { querySpellEligibility } from "./character-spell-eligibility-step";
import { selectSpells } from "./character-spell-selection-step";

/**
 * Helper: resolve all prerequisite steps for spell selection.
 */
function resolvePrerequisites(draft: CharacterDraft, ruleset: "2014" | "2024") {
  selectRuleset(draft, ruleset);
  selectSources(draft, []);
  selectSpecies(draft, createEntityId("human"));
  draft.stepStatuses.set("class", "resolved");
  querySpellEligibility(draft, { isSpellcaster: true, spellcastingAbility: "INT" });
}

/* ── selectSpells: rejects when deps not resolved ──────────────── */

describe("selectSpells rejects when deps not resolved", () => {
  it("rejects when spell-eligibility is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    draft.stepStatuses.set("class", "resolved");
    // spell-eligibility is not resolved

    const result = selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(result).toBe(false);
  });

  it("rejects when class is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, createEntityId("human"));
    // class is not resolved
    querySpellEligibility(draft, { isSpellcaster: true, spellcastingAbility: "INT" });

    const result = selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(result).toBe(false);
  });

  it("rejects when species is unvisited", () => {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    // species is not resolved
    draft.stepStatuses.set("class", "resolved");
    querySpellEligibility(draft, { isSpellcaster: true, spellcastingAbility: "INT" });

    const result = selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(result).toBe(false);
  });

  it("rejects when all deps are unvisited", () => {
    const draft = createEmptyCharacterDraft();

    const result = selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(result).toBe(false);
  });
});

/* ── selectSpells: rejects invalid input ───────────────────────── */

describe("selectSpells rejects invalid input", () => {
  it("rejects null selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, null)).toBe(false);
  });

  it("rejects undefined selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, undefined)).toBe(false);
  });

  it("rejects empty string selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, "")).toBe(false);
  });

  it("rejects number selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, 42)).toBe(false);
  });

  it("rejects boolean selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, true)).toBe(false);
  });

  it("rejects object (non-array) selections", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, { spellId: createEntityId("fireball") })).toBe(false);
  });

  it("rejects selection with null spellId", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, [{ spellId: null, acquisition: "known" }])).toBe(false);
  });

  it("rejects selection with invalid acquisition type", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "invalid-type" },
    ])).toBe(false);
  });
});

/* ── selectSpells: no mutation on rejection ────────────────────── */

describe("selectSpells does not mutate draft on rejection", () => {
  it("does not change spell data for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(draft.spells.selections).toEqual([]);

    selectSpells(draft, null);
    expect(draft.spells.selections).toEqual([]);
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    expect(getStepState(draft, "spells")).toBe("invalidated");

    selectSpells(draft, null);
    expect(getStepState(draft, "spells")).toBe("invalidated");
  });

  it("does not resolve step when deps not resolved", () => {
    const draft = createEmptyCharacterDraft();

    selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(getStepState(draft, "spells")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(getStepState(draft, "spells")).toBe("resolved");
    expect(draft.spells.selections).toHaveLength(1);

    selectSpells(draft, null);
    expect(getStepState(draft, "spells")).toBe("resolved");
    expect(draft.spells.selections).toHaveLength(1);
    expect(draft.spells.selections[0]!.spellId).toBe(createEntityId("fireball"));
  });
});
