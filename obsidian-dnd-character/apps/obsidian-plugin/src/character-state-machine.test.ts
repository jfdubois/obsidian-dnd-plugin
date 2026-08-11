/* ── Creator state-machine acceptance tests (CRE-011) ────────────
   Core state-machine behavior: resolution, invalidation, diagnostics.
   Exercises real module exports without mocking internal state.     */

import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createSourceId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
} from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";

import {
  createEmptyCharacterDraft,
  markStepResolved,
  isDraftComplete,
  hasErrors,
  getStepState,
} from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { getTransitiveDependents } from "./character-draft-dependency";

/* ── Helpers ───────────────────────────────────────────────────── */

function buildCompleteDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2024";
  draft.sources.enabledSourceIds = [createSourceId("xphb")];
  draft.identity.name = "Aragorn";
  draft.identity.playerName = "Alice";
  draft.species.speciesId = createEntityId("species:2024:xphb:human");
  draft.speciesChoices.choices = {
    [createChoiceInstanceId("feat-1")]: {
      instanceId: createChoiceInstanceId("feat-1"),
      definitionId: createChoiceDefinitionId("feat-choice-1"),
      originGrantId: createEntityId("species:2024:xphb:human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("feat:2024:xphb:tough")] },
    } as CharacterChoice,
  };
  draft.background.backgroundId = createEntityId("background:2024:xphb:soldier");
  draft.backgroundChoices.choices = {
    [createChoiceInstanceId("bg-skill")]: {
      instanceId: createChoiceInstanceId("bg-skill"),
      definitionId: createChoiceDefinitionId("skill-choices"),
      originGrantId: createEntityId("background:2024:xphb:soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill:2024:xphb:athletics")] },
    } as CharacterChoice,
  };
  draft.class.classId = createEntityId("class:2024:xphb:fighter");
  draft.classGrants.choices = {
    [createChoiceInstanceId("class-equip")]: {
      instanceId: createChoiceInstanceId("class-equip"),
      definitionId: createChoiceDefinitionId("starting-equipment"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("item:2024:xphb:longsword")] },
    } as CharacterChoice,
  };
  draft.abilities.method = "standard-array";
  draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 16 };
  draft.proficiencyChoices.choices = {};
  draft.proficiencies.skillProficiencies = [createEntityId("skill:2024:xphb:athletics")];
  draft.proficiencies.toolProficiencies = [];
  draft.languageChoices.choices = {};
  draft.languages.languageIds = [createEntityId("language:2024:xphb:common")];
  draft.equipmentChoices.choices = {};
  draft.equipment.items = [];
  draft.spellEligibility.isSpellcaster = false;
  draft.spells.selections = [];
  for (const step of ALL_DRAFT_STEPS) {
    markStepResolved(draft, step);
  }
  return draft;
}

/* ── CRE-011 Acceptance Criteria ───────────────────────────────── */

describe("Creator state-machine (CRE-011)", () => {
  /* ── 1. Sequential step resolution ──────────────────────────── */

  describe("Sequential step resolution", () => {
    it("resolving all 19 steps in dependency order produces a complete draft with no diagnostics", () => {
      const draft = createEmptyCharacterDraft();
      for (const step of ALL_DRAFT_STEPS) {
        markStepResolved(draft, step);
      }
      expect(isDraftComplete(draft)).toBe(true);
      expect(draft.diagnostics).toHaveLength(0);
      expect(hasErrors(draft)).toBe(false);
    });
  });

  /* ── 2. Dependency invalidation on upstream changes ─────────── */

  describe("Dependency invalidation on upstream changes", () => {
    it("re-resolving ruleset invalidates all transitive downstream steps", () => {
      const draft = buildCompleteDraft();
      markStepResolved(draft, "ruleset");
      const dependents = getTransitiveDependents("ruleset");
      for (const dep of dependents) {
        expect(getStepState(draft, dep)).toBe("invalidated");
      }
      expect(getStepState(draft, "ruleset")).toBe("resolved");
      expect(getStepState(draft, "identity")).toBe("resolved");
    });

    it("re-resolving species invalidates all transitive downstream steps", () => {
      const draft = buildCompleteDraft();
      markStepResolved(draft, "species");
      const dependents = getTransitiveDependents("species");
      for (const dep of dependents) {
        expect(getStepState(draft, dep)).toBe("invalidated");
      }
      expect(getStepState(draft, "species")).toBe("resolved");
    });

    it("re-resolving background invalidates all transitive downstream steps", () => {
      const draft = buildCompleteDraft();
      markStepResolved(draft, "background");
      const dependents = getTransitiveDependents("background");
      for (const dep of dependents) {
        expect(getStepState(draft, dep)).toBe("invalidated");
      }
      expect(getStepState(draft, "background")).toBe("resolved");
    });

    it("re-resolving class invalidates all transitive downstream steps", () => {
      const draft = buildCompleteDraft();
      markStepResolved(draft, "class");
      const dependents = getTransitiveDependents("class");
      for (const dep of dependents) {
        expect(getStepState(draft, dep)).toBe("invalidated");
      }
      expect(getStepState(draft, "class")).toBe("resolved");
    });
  });

  /* ── 3. Unresolved-choice diagnostics ───────────────────────── */

  describe("Unresolved-choice diagnostics", () => {
    it("species selected but species-choices unresolved produces error diagnostic", () => {
      const draft = createEmptyCharacterDraft();
      draft.species.speciesId = createEntityId("human");
      markStepResolved(draft, "species");
      const hasError = draft.diagnostics.some(
        (d) => d.severity === "error" && d.step === "species-choices",
      );
      expect(hasError).toBe(true);
    });

    it("species selected and species-choices resolved produces no unresolved-choice error", () => {
      const draft = createEmptyCharacterDraft();
      draft.species.speciesId = createEntityId("human");
      markStepResolved(draft, "species");
      markStepResolved(draft, "species-choices");
      const hasUnresolvedChoiceError = draft.diagnostics.some(
        (d) =>
          d.severity === "error" &&
          (d.step === "species-choices" ||
            d.step === "background-choices" ||
            d.step === "class-starting-grants"),
      );
      expect(hasUnresolvedChoiceError).toBe(false);
    });
  });
});
