/* ── Creator state-machine lifecycle tests (CRE-011) ─────────────
   Snapshot, finalize, and full-lifecycle acceptance tests.
   Exercises real module exports without mocking internal state.    */

import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createSourceId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
  createItemInstanceId,
} from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { isCharacter } from "@obsidian-dnd/character-contract";

import {
  createEmptyCharacterDraft,
  markStepResolved,
  isDraftComplete,
} from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { finalizeCharacter } from "./character-finalize";

/* ── Helpers ───────────────────────────────────────────────────── */

function buildCompleteDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2024";
  draft.sources.enabledSourceIds = [createSourceId("xphb")];
  draft.identity.name = "Aragorn";
  draft.identity.playerName = "Alice";
  draft.species.speciesId = createEntityId("species:2024:xphb:human");
  draft.selections = {
    [createChoiceInstanceId("feat-1")]: {
      instanceId: createChoiceInstanceId("feat-1"),
      definitionId: createChoiceDefinitionId("feat-choice-1"),
      originGrantId: createEntityId("species:2024:xphb:human"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("feat:2024:xphb:tough")] },
    } as CharacterChoice,
  };
  draft.background.backgroundId = createEntityId("background:2024:xphb:soldier");
  Object.assign(draft.selections, {
    [createChoiceInstanceId("bg-skill")]: {
      instanceId: createChoiceInstanceId("bg-skill"),
      definitionId: createChoiceDefinitionId("skill-choices"),
      originGrantId: createEntityId("background:2024:xphb:soldier"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("skill:2024:xphb:athletics")] },
    } as CharacterChoice,
  });
  draft.class.classId = createEntityId("class:2024:xphb:fighter");
  Object.assign(draft.selections, {
    [createChoiceInstanceId("class-equip")]: {
      instanceId: createChoiceInstanceId("class-equip"),
      definitionId: createChoiceDefinitionId("starting-equipment"),
      originGrantId: createEntityId("class:2024:xphb:fighter"),
      selectedValue: { type: "entity-ids", entityIds: [createEntityId("item:2024:xphb:longsword")] },
    } as CharacterChoice,
  });
  draft.abilities.method = "standard-array";
  draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 16 };
  draft.proficiencies.skillProficiencies = [createEntityId("skill:2024:xphb:athletics")];
  draft.proficiencies.toolProficiencies = [];
  draft.languages.languageIds = [createEntityId("language:2024:xphb:common")];
  draft.equipment.items = [
    {
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: false,
      attuned: false,
    },
  ];
  draft.spellEligibility.isSpellcaster = false;
  draft.spells.selections = [];
  for (const step of ALL_DRAFT_STEPS) {
    markStepResolved(draft, step);
  }
  return draft;
}

/* ── CRE-011 Acceptance Criteria ───────────────────────────────── */

describe("Creator state-machine lifecycle (CRE-011)", () => {
  /* ── 4. Review snapshot generation ──────────────────────────── */

  describe("Review snapshot generation", () => {
    it("buildReviewSnapshot returns a non-null snapshot with canonical selections", () => {
      const draft = buildCompleteDraft();
      const snapshot = buildReviewSnapshot(draft);
      expect(snapshot).not.toBeNull();

      // Legacy choice buckets are intentionally absent from the read model.
      expect(snapshot!.ruleset).toBeDefined();
      expect(snapshot!.sources).toBeDefined();
      expect(snapshot!.identity).toBeDefined();
      expect(snapshot!.species).toBeDefined();
      expect(snapshot!.background).toBeDefined();
      expect(snapshot!.class).toBeDefined();
      expect(snapshot!.abilities).toBeDefined();
      expect(snapshot!.proficiencies).toBeDefined();
      expect(snapshot!.languages).toBeDefined();
      expect(snapshot!.equipment).toBeDefined();
      expect(snapshot!.spellEligibility).toBeDefined();
      expect(snapshot!.spells).toBeDefined();

      expect(snapshot!.selections).toBeDefined();
      expect(Object.keys(snapshot!)).toHaveLength(13);
    });

    it("buildReviewSnapshot returns null when one data step is unresolved", () => {
      const draft = buildCompleteDraft();
      draft.stepStatuses.set("spells", "unvisited");
      const snapshot = buildReviewSnapshot(draft);
      expect(snapshot).toBeNull();
    });
  });

  /* ── 5. Atomic final save ───────────────────────────────────── */

  describe("Atomic final save", () => {
    it("finalizeCharacter returns a valid Character object from a complete draft", () => {
      const draft = buildCompleteDraft();
      const character = finalizeCharacter(draft);
      expect(character).not.toBeNull();
      expect(isCharacter(character!)).toBe(true);
    });

    it("finalizeCharacter returns null for an incomplete draft", () => {
      const draft = createEmptyCharacterDraft();
      const character = finalizeCharacter(draft);
      expect(character).toBeNull();
    });
  });

  /* ── 6. End-to-end lifecycle ────────────────────────────────── */

  describe("End-to-end draft lifecycle", () => {
    it("full lifecycle: create → resolve → snapshot → finalize", () => {
      // 1. Create fresh draft
      const draft = createEmptyCharacterDraft();
      expect(isDraftComplete(draft)).toBe(false);

      // 2. Resolve all steps with data
      const complete = buildCompleteDraft();
      expect(isDraftComplete(complete)).toBe(true);
      expect(complete.diagnostics).toHaveLength(0);

      // 3. Build review snapshot
      const snapshot = buildReviewSnapshot(complete);
      expect(snapshot).not.toBeNull();
      expect(Object.keys(snapshot!)).toHaveLength(13);

      // 4. Finalize to Character
      const character = finalizeCharacter(complete);
      expect(character).not.toBeNull();
      expect(isCharacter(character!)).toBe(true);
      expect(character!.identity.name).toBe("Aragorn");
    });
  });
});
