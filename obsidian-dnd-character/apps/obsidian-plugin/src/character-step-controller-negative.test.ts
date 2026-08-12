import { describe, it, expect } from "vitest";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import { createEntityId } from "@obsidian-dnd/domain";
import {
  StepController,
  CREATOR_STEPS,
  getDraftStepsForCreatorStep,
} from "./character-step-controller";

/* ── Invalid navigation ───────────────────────────────────────── */

describe("StepController invalid navigation", () => {
  it("jumpTo with invalid step returns false", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    // @ts-expect-error — testing runtime rejection of invalid step
    expect(ctrl.jumpTo("invalid-step")).toBe(false);
  });

  it("canNavigateTo returns false for invalid step", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    // @ts-expect-error — testing runtime rejection of invalid step
    expect(ctrl.canNavigateTo("invalid-step")).toBe(false);
  });

  it("next() does not advance past review step", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.jumpTo("review");
    const result = ctrl.next();
    expect(result).toBe("review");
    expect(ctrl.currentStepIndex).toBe(10);
  });

  it("previous() does not go before ruleset step", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const result = ctrl.previous();
    expect(result).toBe("ruleset");
    expect(ctrl.currentStepIndex).toBe(0);
  });
});

/* ── Blocked save ─────────────────────────────────────────────── */

describe("StepController blocked save", () => {
  it("save is blocked when ruleset is unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    // Resolve everything except ruleset
    for (const step of CREATOR_STEPS) {
      if (step !== "ruleset") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("save is blocked when identity is unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "identity") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("save is blocked when species is unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "species") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("save is blocked when class is unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "class") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("save is blocked when abilities are unresolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      if (step !== "abilities") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });

  it("save is blocked when spells step is unresolved for spellcaster", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.spellEligibility.isSpellcaster = true;
    for (const step of CREATOR_STEPS) {
      if (step !== "spells") {
        ctrl.markStepResolved(step);
      }
    }
    expect(ctrl.canSave()).toBe(false);
  });
});

/* ── Invalid step resolution ──────────────────────────────────── */

describe("StepController invalid resolution state", () => {
  it("isStepResolved remains false for an invalidated origin when its projection is incomplete", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.species.speciesId = createEntityId("species:2014:phb:elf");
    ctrl.draft.stepStatuses.set("species", "invalidated");
    ctrl.draft.stepStatuses.set("species-choices", "invalidated");
    ctrl.setOriginConsequenceCompletion("species", false);
    expect(ctrl.isStepResolved("species")).toBe(false);
  });

  it("species step is unresolved when only one draft step is resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.stepStatuses.set("species", "resolved");
    // species-choices is still unvisited
    expect(ctrl.isStepResolved("species")).toBe(false);
  });

  it("class step is unresolved when only class is resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.stepStatuses.set("class", "resolved");
    // class-starting-grants is still unvisited
    expect(ctrl.isStepResolved("class")).toBe(false);
  });

  it("proficienciesAndLanguages is resolved as a derived global summary", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.draft.stepStatuses.set("proficiency-choices", "resolved");
    ctrl.draft.stepStatuses.set("proficiencies", "resolved");
    expect(ctrl.isStepResolved("proficienciesAndLanguages")).toBe(true);
  });
});

/* ── Skip logic edge cases ────────────────────────────────────── */

describe("StepController skip logic edge cases", () => {
  it("next() skips spells and lands on review when spells is skippable", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    // Resolve prerequisites for equipment step
    ctrl.markStepResolved("ruleset");
    ctrl.markStepResolved("sources");
    ctrl.markStepResolved("identity");
    ctrl.markStepResolved("species");
    ctrl.markStepResolved("background");
    ctrl.markStepResolved("class");
    ctrl.draft.species.speciesId = createEntityId("species:2014:phb:elf");
    ctrl.draft.background.backgroundId = createEntityId("background:2014:phb:acolyte");
    ctrl.draft.class.classId = createEntityId("class:2014:phb:cleric");
    for (const origin of ["species", "background", "class"] as const) ctrl.setOriginConsequenceCompletion(origin, true);
    ctrl.markStepResolved("abilities");
    ctrl.markStepResolved("proficienciesAndLanguages");
    // equipment-choices is not mapped to a CreatorStep; resolve manually
    ctrl.draft.stepStatuses.set("equipment-choices", "resolved");
    ctrl.jumpTo("equipment");
    const nextStep = ctrl.next();
    expect(nextStep).toBe("review");
    expect(ctrl.currentStep).toBe("review");
  });

  it("previous() skips spells and lands on equipment when spells is skippable", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.jumpTo("review");
    const prevStep = ctrl.previous();
    expect(prevStep).toBe("equipment");
    expect(ctrl.currentStep).toBe("equipment");
  });

  it("unresolved steps are correctly reported even when spells is skippable", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const unresolved = ctrl.getUnresolvedSteps();
    expect(unresolved).not.toContain("spells");
    expect(unresolved).toContain("ruleset");
    expect(unresolved).toContain("sources");
  });

  it("resolved steps include skippable spells step", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const resolved = ctrl.getResolvedSteps();
    expect(resolved).toContain("spells");
  });
});

/* ── Dependency invalidation edge cases ───────────────────────── */

describe("StepController invalidation edge cases", () => {
  it("invalidating step with no dependents returns empty array", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const invalidated = ctrl.invalidateDependents("identity");
    expect(invalidated).toHaveLength(0);
  });

  it("invalidating step with no dependents does not change other steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.markStepResolved("identity");
    ctrl.markStepResolved("species");
    ctrl.invalidateDependents("identity");
    expect(getStepState(ctrl.draft, "species")).toBe("resolved");
  });

  it("invalidating review has no effect on other steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }
    const invalidated = ctrl.invalidateDependents("review");
    expect(invalidated).toHaveLength(0);
  });
});

/* ── Draft steps mapping validation ───────────────────────────── */

describe("getDraftStepsForCreatorStep", () => {
  it("returns empty array for unknown step", () => {
    // @ts-expect-error — testing runtime rejection
    const result = getDraftStepsForCreatorStep("nonexistent");
    expect(result).toEqual([]);
  });

  it("only input-owning creator steps have draft completion buckets", () => {
    for (const step of CREATOR_STEPS) {
      const draftSteps = getDraftStepsForCreatorStep(step);
      expect(draftSteps.length > 0 || step === "proficienciesAndLanguages" || step === "equipment").toBe(true);
    }
  });

  it("total draft steps across input-owning creator steps equals 13", () => {
    let total = 0;
    for (const step of CREATOR_STEPS) {
      total += getDraftStepsForCreatorStep(step).length;
    }
    expect(total).toBe(13);
  });
});
