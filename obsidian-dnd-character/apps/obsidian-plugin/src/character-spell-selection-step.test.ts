import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createClassInstanceId,
} from "@obsidian-dnd/domain";
import type { CharacterSpellSelection } from "@obsidian-dnd/character-contract";
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
  // Resolve class step
  draft.stepStatuses.set("class", "resolved");
  // Resolve spell-eligibility step
  querySpellEligibility(draft, { isSpellcaster: true, spellcastingAbility: "INT" });
}

/* ── selectSpells: valid input ─────────────────────────────────── */

describe("selectSpells with valid input", () => {
  it("sets spell selections on the draft", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const selections: CharacterSpellSelection[] = [
      {
        spellId: createEntityId("fireball"),
        acquisition: "known",
      },
    ];

    const result = selectSpells(draft, selections);

    expect(result).toBe(true);
    expect(draft.spells.selections).toHaveLength(1);
    expect(draft.spells.selections[0]!.spellId).toBe(createEntityId("fireball"));
    expect(draft.spells.selections[0]!.acquisition).toBe("known");
  });

  it("marks the spells draft step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    selectSpells(draft, [
      { spellId: createEntityId("magic_missile"), acquisition: "known" },
    ]);

    expect(getStepState(draft, "spells")).toBe("resolved");
  });

  it("accepts empty selections array", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = selectSpells(draft, []);

    expect(result).toBe(true);
    expect(draft.spells.selections).toEqual([]);
    expect(getStepState(draft, "spells")).toBe("resolved");
  });

  it("overwrites previously selected spells", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);
    expect(draft.spells.selections).toHaveLength(1);
    expect(draft.spells.selections[0]!.spellId).toBe(createEntityId("fireball"));

    selectSpells(draft, [
      { spellId: createEntityId("ice_storm"), acquisition: "prepared" },
    ]);
    expect(draft.spells.selections).toHaveLength(1);
    expect(draft.spells.selections[0]!.spellId).toBe(createEntityId("ice_storm"));
    expect(draft.spells.selections[0]!.acquisition).toBe("prepared");
  });

  it("works with 2014 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2014");

    const result = selectSpells(draft, [
      { spellId: createEntityId("cure_wounds"), acquisition: "prepared" },
    ]);
    expect(result).toBe(true);
    expect(getStepState(draft, "spells")).toBe("resolved");
  });

  it("works with 2024 ruleset", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const result = selectSpells(draft, [
      { spellId: createEntityId("cure_wounds"), acquisition: "prepared" },
    ]);
    expect(result).toBe(true);
    expect(getStepState(draft, "spells")).toBe("resolved");
  });

  it("creates a shallow copy of selections (does not share array reference)", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const input: CharacterSpellSelection[] = [
      { spellId: createEntityId("shield"), acquisition: "known" },
    ];

    selectSpells(draft, input);

    expect(draft.spells.selections).not.toBe(input);
  });

  it("accepts selections with optional fields", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const selections: CharacterSpellSelection[] = [
      {
        spellId: createEntityId("divine_favor"),
        classInstanceId: createClassInstanceId("cleric_1"),
        originGrantId: createEntityId("cleric_spell_list"),
        acquisition: "prepared",
      },
    ];

    const result = selectSpells(draft, selections);

    expect(result).toBe(true);
    expect(draft.spells.selections).toHaveLength(1);
    expect(draft.spells.selections[0]!.classInstanceId).toBe(
      createClassInstanceId("cleric_1"),
    );
    expect(draft.spells.selections[0]!.originGrantId).toBe(
      createEntityId("cleric_spell_list"),
    );
  });

  it("accepts all acquisition types", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    const selections: CharacterSpellSelection[] = [
      { spellId: createEntityId("cantrip_1"), acquisition: "known" },
      { spellId: createEntityId("spell_1"), acquisition: "prepared" },
      { spellId: createEntityId("spell_2"), acquisition: "always-prepared" },
      { spellId: createEntityId("spell_3"), acquisition: "species" },
      { spellId: createEntityId("spell_4"), acquisition: "background" },
      { spellId: createEntityId("spell_5"), acquisition: "feat" },
      { spellId: createEntityId("spell_6"), acquisition: "item" },
    ];

    const result = selectSpells(draft, selections);

    expect(result).toBe(true);
    expect(draft.spells.selections).toHaveLength(7);
  });

  it("does not invalidate unrelated steps after selection", () => {
    const draft = createEmptyCharacterDraft();
    resolvePrerequisites(draft, "2024");

    // review does not depend on spells, so it should remain unaffected
    draft.stepStatuses.set("review", "resolved");

    selectSpells(draft, [
      { spellId: createEntityId("fireball"), acquisition: "known" },
    ]);

    // review should remain resolved (spells has no downstream dependents)
    expect(getStepState(draft, "review")).toBe("resolved");
  });
});
