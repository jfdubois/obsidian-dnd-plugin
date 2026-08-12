import { describe, it, expect } from "vitest";
import {
  StepController,
  CREATOR_STEPS,
  getDraftStepsForCreatorStep,
} from "./character-step-controller";
import { createEmptyCharacterDraft } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { createEntityId } from "@obsidian-dnd/domain";

/* ── Step enumeration ─────────────────────────────────────────── */

describe("CREATOR_STEPS enumeration", () => {
  it("contains exactly 11 modal steps", () => {
    expect(CREATOR_STEPS).toHaveLength(11);
  });

  it("follows the FR-004 order", () => {
    expect(CREATOR_STEPS[0]).toBe("ruleset");
    expect(CREATOR_STEPS[1]).toBe("sources");
    expect(CREATOR_STEPS[2]).toBe("identity");
    expect(CREATOR_STEPS[3]).toBe("species");
    expect(CREATOR_STEPS[4]).toBe("background");
    expect(CREATOR_STEPS[5]).toBe("class");
    expect(CREATOR_STEPS[6]).toBe("abilities");
    expect(CREATOR_STEPS[7]).toBe("proficienciesAndLanguages");
    expect(CREATOR_STEPS[8]).toBe("equipment");
    expect(CREATOR_STEPS[9]).toBe("spells");
    expect(CREATOR_STEPS[10]).toBe("review");
  });
});

describe("CREATOR_STEP_DRAFT_STEPS mapping", () => {
  it("maps ruleset to ruleset draft step", () => {
    expect(getDraftStepsForCreatorStep("ruleset")).toEqual(["ruleset"]);
  });

  it("maps species to species and species-choices draft steps", () => {
    expect(getDraftStepsForCreatorStep("species")).toEqual([
      "species",
      "species-choices",
    ]);
  });

  it("maps background to background and background-choices draft steps", () => {
    expect(getDraftStepsForCreatorStep("background")).toEqual([
      "background",
      "background-choices",
    ]);
  });

  it("maps class to class and class-starting-grants draft steps", () => {
    expect(getDraftStepsForCreatorStep("class")).toEqual([
      "class",
      "class-starting-grants",
    ]);
  });

  it("maps proficienciesAndLanguages to proficiency-choices, proficiencies, language-choices, and languages", () => {
    expect(getDraftStepsForCreatorStep("proficienciesAndLanguages")).toEqual([
      "proficiency-choices",
      "proficiencies",
      "language-choices",
      "languages",
    ]);
  });

  it("maps spells to spell-eligibility and spells draft steps", () => {
    expect(getDraftStepsForCreatorStep("spells")).toEqual([
      "spell-eligibility",
      "spells",
    ]);
  });

  it("maps review to review draft step", () => {
    expect(getDraftStepsForCreatorStep("review")).toEqual(["review"]);
  });
});

/* ── Navigation ───────────────────────────────────────────────── */

describe("StepController navigation", () => {
  function makeController() {
    return new StepController(createEmptyCharacterDraft());
  }

  it("starts at the ruleset step", () => {
    const ctrl = makeController();
    expect(ctrl.currentStep).toBe("ruleset");
    expect(ctrl.currentStepIndex).toBe(0);
  });

  it("next() advances through all steps when spells is required", () => {
    const ctrl = makeController();
    ctrl.draft.spellEligibility.isSpellcaster = true;
    expect(ctrl.next()).toBe("sources");
    expect(ctrl.currentStep).toBe("sources");
    expect(ctrl.next()).toBe("identity");
    expect(ctrl.next()).toBe("species");
    expect(ctrl.next()).toBe("background");
    expect(ctrl.next()).toBe("class");
    expect(ctrl.next()).toBe("abilities");
    expect(ctrl.next()).toBe("proficienciesAndLanguages");
    expect(ctrl.next()).toBe("equipment");
    expect(ctrl.next()).toBe("spells");
    expect(ctrl.next()).toBe("review");
  });

  it("next() stays at review when at the end", () => {
    const ctrl = makeController();
    ctrl.jumpTo("review");
    expect(ctrl.next()).toBe("review");
    expect(ctrl.currentStep).toBe("review");
  });

  it("previous() moves back through all steps when spells is required", () => {
    const ctrl = makeController();
    ctrl.draft.spellEligibility.isSpellcaster = true;
    ctrl.jumpTo("review");
    expect(ctrl.previous()).toBe("spells");
    expect(ctrl.previous()).toBe("equipment");
    expect(ctrl.previous()).toBe("proficienciesAndLanguages");
    expect(ctrl.previous()).toBe("abilities");
    expect(ctrl.previous()).toBe("class");
    expect(ctrl.previous()).toBe("background");
    expect(ctrl.previous()).toBe("species");
    expect(ctrl.previous()).toBe("identity");
    expect(ctrl.previous()).toBe("sources");
    expect(ctrl.previous()).toBe("ruleset");
  });

  it("previous() stays at ruleset when at the start", () => {
    const ctrl = makeController();
    expect(ctrl.previous()).toBe("ruleset");
    expect(ctrl.currentStep).toBe("ruleset");
  });

  it("jumpTo() navigates to a valid step", () => {
    const ctrl = makeController();
    expect(ctrl.jumpTo("review")).toBe(true);
    expect(ctrl.currentStep).toBe("review");
    expect(ctrl.currentStepIndex).toBe(10);
  });

  it("jumpTo() navigates to middle steps when prerequisites resolved", () => {
    const ctrl = makeController();
    // Resolve upstream dependencies for abilities: ruleset, sources, identity, species, background, class
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
    expect(ctrl.jumpTo("abilities")).toBe(true);
    expect(ctrl.currentStep).toBe("abilities");
    expect(ctrl.currentStepIndex).toBe(6);
  });

  it("canNavigateTo() returns true for valid steps when prerequisites resolved", () => {
    const ctrl = makeController();
    // Resolve all steps so every step's prerequisites are met
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }
    ctrl.draft.species.speciesId = createEntityId("species:2014:phb:elf");
    ctrl.draft.background.backgroundId = createEntityId("background:2014:phb:acolyte");
    ctrl.draft.class.classId = createEntityId("class:2014:phb:cleric");
    for (const origin of ["species", "background", "class"] as const) ctrl.setOriginConsequenceCompletion(origin, true);
    // equipment-choices is not mapped to a CreatorStep; resolve manually
    ctrl.draft.stepStatuses.set("equipment-choices", "resolved");
    for (const step of CREATOR_STEPS) {
      expect(ctrl.canNavigateTo(step)).toBe(true);
    }
  });

  it("uses origin consequence completion rather than invalidated legacy choice steps for downstream navigation", () => {
    const ctrl = makeController();
    ctrl.draft.species.speciesId = createEntityId("species:2014:phb:elf");
    ctrl.draft.background.backgroundId = createEntityId("background:2014:phb:acolyte");
    ctrl.draft.class.classId = createEntityId("class:2014:phb:cleric");
    for (const origin of ["species", "background", "class"] as const) {
      ctrl.setOriginConsequenceCompletion(origin, true);
    }
    for (const step of ["species", "species-choices", "background", "background-choices", "class", "class-starting-grants"] as const) {
      ctrl.draft.stepStatuses.set(step, "invalidated");
    }
    ctrl.draft.stepStatuses.set("equipment-choices", "resolved");

    expect(ctrl.canNavigateTo("proficienciesAndLanguages")).toBe(true);
    expect(ctrl.canNavigateTo("equipment")).toBe(true);
  });
});

/* ── Step resolution ──────────────────────────────────────────── */

describe("StepController step resolution", () => {
  it("marks a step as resolved", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.markStepResolved("ruleset");
    expect(ctrl.isStepResolved("ruleset")).toBe(true);
  });

  it("isStepResolved returns false for unvisited steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    expect(ctrl.isStepResolved("species")).toBe(false);
  });

  it("species step remains unresolved without a selected species", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    const draft = ctrl.draft;
    draft.stepStatuses.set("species", "resolved");
    expect(ctrl.isStepResolved("species")).toBe(false);

    draft.stepStatuses.set("species-choices", "resolved");
    expect(ctrl.isStepResolved("species")).toBe(false);
  });

  it("uses the active consequence projection for a selected zero-choice species", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    selectRuleset(ctrl.draft, "2014");
    selectSources(ctrl.draft, []);
    selectSpecies(ctrl.draft, createEntityId("species:2014:phb:elf"));

    expect(ctrl.draft.selections).toEqual({});
    expect(ctrl.draft.stepStatuses.get("species-choices")).not.toBe("resolved");
    expect(ctrl.isStepResolved("species")).toBe(false);

    ctrl.setOriginConsequenceCompletion("species", true);
    expect(ctrl.isStepResolved("species")).toBe(true);
  });

  it("markStepResolved resolves all underlying draft steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.markStepResolved("species");
    expect(ctrl.draft.stepStatuses.get("species")).toBe("resolved");
    expect(ctrl.draft.stepStatuses.get("species-choices")).toBe("resolved");
  });

  it("markCurrentStepResolved resolves the current step", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    ctrl.markCurrentStepResolved();
    expect(ctrl.isStepResolved("ruleset")).toBe(true);
  });
});

/* ── Dependency invalidation ──────────────────────────────────── */

describe("StepController dependency invalidation", () => {
  it("invalidating ruleset cascades through dependent steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }

    const invalidated = ctrl.invalidateDependents("ruleset");
    expect(invalidated).toContain("sources");
    expect(invalidated).toContain("species");
    expect(invalidated).toContain("abilities");
  });

  it("invalidating species invalidates species-choices and abilities", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }

    const invalidated = ctrl.invalidateDependents("species");
    expect(invalidated).toContain("species-choices");
    expect(invalidated).toContain("abilities");
  });

  it("invalidating identity does not affect other steps", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }

    const invalidated = ctrl.invalidateDependents("identity");
    expect(invalidated).toHaveLength(0);
  });

  it("invalidating class invalidates class-starting-grants and downstream", () => {
    const ctrl = new StepController(createEmptyCharacterDraft());
    for (const step of CREATOR_STEPS) {
      ctrl.markStepResolved(step);
    }

    const invalidated = ctrl.invalidateDependents("class");
    expect(invalidated).toContain("class-starting-grants");
    expect(invalidated).toContain("proficiencies");
    expect(invalidated).toContain("languages");
    expect(invalidated).toContain("equipment");
    expect(invalidated).toContain("spell-eligibility");
  });
});
