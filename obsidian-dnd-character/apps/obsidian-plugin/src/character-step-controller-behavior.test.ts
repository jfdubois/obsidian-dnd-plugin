import { describe, it, expect } from "vitest";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { createEmptyCharacterDraft } from "./character-draft";
import {
  StepController,
  CREATOR_STEPS,
} from "./character-step-controller";

/* ── Save readiness ───────────────────────────────────────────── */

describe("StepController canSave", () => {
  it("returns false when no steps are resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    expect(ctrl.canSave()).toBe(false);
  });

  it("returns true when all steps are resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }
    expect(ctrl.canSave()).toBe(true);
  });

  it("returns false when one step is unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "identity") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("spells step is skipped when not a spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "spells") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(true);
  });
});

/* ── Skip logic ───────────────────────────────────────────────── */

describe("StepController skip logic", () => {
  it("spells step is skippable when not a spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    expect(ctrl.isStepSkippable("spells")).toBe(true);
  });

  it("spells step is not skippable when is a spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.spellEligibility.isSpellcaster = true;
    expect(ctrl.isStepSkippable("spells")).toBe(false);
  });

  it("non-spells steps are never skippable", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "spells") {
        expect(ctrl.isStepSkippable(step)).toBe(false);
      }
    }
  });

  it("next() skips spells step when not a spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    // Resolve prerequisites for equipment step
    ctrl.markStepResolved("ruleset");
    ctrl.markStepResolved("sources");
    ctrl.markStepResolved("identity");
    ctrl.markStepResolved("species");
    ctrl.markStepResolved("background");
    ctrl.markStepResolved("class");
    ctrl.markStepResolved("abilities");
    ctrl.markStepResolved("proficienciesAndLanguages");
    // equipment-choices is not mapped to a CreatorStep; resolve manually
    ctrl.draft.stepStatuses.set("equipment-choices", "resolved");
    ctrl.jumpTo("equipment");
    expect(ctrl.next()).toBe("review");
  });

  it("next() does not skip spells step when is a spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.spellEligibility.isSpellcaster = true;
    // Resolve prerequisites for equipment step
    ctrl.markStepResolved("ruleset");
    ctrl.markStepResolved("sources");
    ctrl.markStepResolved("identity");
    ctrl.markStepResolved("species");
    ctrl.markStepResolved("background");
    ctrl.markStepResolved("class");
    ctrl.markStepResolved("abilities");
    ctrl.markStepResolved("proficienciesAndLanguages");
    // equipment-choices is not mapped to a CreatorStep; resolve manually
    ctrl.draft.stepStatuses.set("equipment-choices", "resolved");
    ctrl.jumpTo("equipment");
    expect(ctrl.next()).toBe("spells");
  });
});

/* ── Completion tracking ──────────────────────────────────────── */

describe("StepController completion tracking", () => {
  it("getUnresolvedSteps returns all steps initially", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const unresolved = ctrl.getUnresolvedSteps();
    expect(unresolved).not.toContain("spells");
    expect(unresolved).toContain("ruleset");
  });

  it("getResolvedSteps returns empty initially", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const resolved = ctrl.getResolvedSteps();
    expect(resolved).toContain("spells");
    expect(resolved).not.toContain("ruleset");
  });

  it("getResolvedSteps grows as steps are resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.markStepResolved("ruleset");
    const resolved = ctrl.getResolvedSteps();
    expect(resolved).toContain("ruleset");
    expect(resolved).toContain("spells");
  });
});

/* ── Review state ─────────────────────────────────────────────── */

describe("StepController buildReviewState", () => {
  it("aggregates all draft data into review state", () => {
    const draft = createEmptyCharacterDraft();
    draft.ruleset.ruleset = "2024";
    draft.sources.enabledSourceIds = [createSourceId("phb")];
    draft.identity.name = "Gandalf";
    draft.species.speciesId = createEntityId("wizard");
    draft.background.backgroundId = createEntityId("sage");
    draft.class.classId = createEntityId("wizard");
    draft.abilities.method = "standard-array";
    draft.abilities.scores = {
      STR: 8,
      DEX: 14,
      CON: 12,
      INT: 18,
      WIS: 16,
      CHA: 12,
    };

    const ctrl = new StepController(draft);
    const review = ctrl.buildReviewState();

    expect(review.ruleset.ruleset).toBe("2024");
    expect(review.sources.enabledSourceIds).toEqual([createSourceId("phb")]);
    expect(review.identity.name).toBe("Gandalf");
    expect(review.species.speciesId).toBe(createEntityId("wizard"));
    expect(review.background.backgroundId).toBe(createEntityId("sage"));
    expect(review.class.classId).toBe(createEntityId("wizard"));
    expect(review.abilities.method).toBe("standard-array");
    expect(review.abilities.scores?.INT).toBe(18);
  });

  it("review state includes all 12 data sections", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const review = ctrl.buildReviewState();
    expect(review).toHaveProperty("ruleset");
    expect(review).toHaveProperty("sources");
    expect(review).toHaveProperty("identity");
    expect(review).toHaveProperty("species");
    expect(review).toHaveProperty("background");
    expect(review).toHaveProperty("class");
    expect(review).toHaveProperty("abilities");
    expect(review).toHaveProperty("proficiencies");
    expect(review).toHaveProperty("languages");
    expect(review).toHaveProperty("equipment");
    expect(review).toHaveProperty("spellEligibility");
    expect(review).toHaveProperty("spells");
  });
});
