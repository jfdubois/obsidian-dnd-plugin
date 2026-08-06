/* ── Step controller: creation workflow state machine ────────────
   Manages navigation through the 11 modal steps defined in FR-004.
   Maps modal steps to the 16 DraftStep data sections from P10-T001.
   Pure TypeScript logic — no Obsidian UI.                        */

import type { CharacterDraft } from "./character-draft";
import type { DraftStep } from "./character-draft-steps";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";
import type {
  DraftRulesetData,
  DraftSourceData,
  DraftIdentityData,
  DraftSpeciesData,
  DraftBackgroundData,
  DraftClassData,
  DraftAbilityData,
  DraftProficiencyData,
  DraftLanguageData,
  DraftEquipmentData,
  DraftSpellEligibilityData,
  DraftSpellData,
} from "./character-draft-steps";

/* ── Modal step enumeration (FR-004 order) ─────────────────────── */

export type CreatorStep =
  | "ruleset"
  | "sources"
  | "identity"
  | "species"
  | "background"
  | "class"
  | "abilities"
  | "proficienciesAndLanguages"
  | "equipment"
  | "spells"
  | "review";

/** Ordered list of the 11 creation modal steps. */
export const CREATOR_STEPS: ReadonlyArray<CreatorStep> = [
  "ruleset",
  "sources",
  "identity",
  "species",
  "background",
  "class",
  "abilities",
  "proficienciesAndLanguages",
  "equipment",
  "spells",
  "review",
];

/** Maps each modal step to the underlying DraftStep data sections. */
export const CREATOR_STEP_DRAFT_STEPS: ReadonlyMap<CreatorStep, ReadonlyArray<DraftStep>> =
  new Map([
    ["ruleset", ["ruleset"]],
    ["sources", ["sources"]],
    ["identity", ["identity"]],
    ["species", ["species", "species-choices"]],
    ["background", ["background", "background-choices"]],
    ["class", ["class", "class-starting-grants"]],
    ["abilities", ["abilities"]],
    ["proficienciesAndLanguages", ["proficiency-choices", "proficiencies", "language-choices", "languages"]],
    ["equipment", ["equipment"]],
    ["spells", ["spell-eligibility", "spells"]],
    ["review", ["review"]],
  ]);

/** Returns the underlying DraftStep sections for a modal step. */
export function getDraftStepsForCreatorStep(
  step: CreatorStep,
): ReadonlyArray<DraftStep> {
  return CREATOR_STEP_DRAFT_STEPS.get(step) ?? [];
}

/* ── Review state ──────────────────────────────────────────────── */

export interface ReviewState {
  ruleset: DraftRulesetData;
  sources: DraftSourceData;
  identity: DraftIdentityData;
  species: DraftSpeciesData;
  background: DraftBackgroundData;
  class: DraftClassData;
  abilities: DraftAbilityData;
  proficiencies: DraftProficiencyData;
  languages: DraftLanguageData;
  equipment: DraftEquipmentData;
  spellEligibility: DraftSpellEligibilityData;
  spells: DraftSpellData;
}

/* ── Step controller ───────────────────────────────────────────── */

export class StepController {
  private _draft: CharacterDraft;
  private _currentIndex: number;

  constructor(draft: CharacterDraft) {
    this._draft = draft;
    this._currentIndex = 0;
  }

  get draft(): CharacterDraft {
    return this._draft;
  }

  /** Returns the current modal step. */
  get currentStep(): CreatorStep {
    const step = CREATOR_STEPS[this._currentIndex];
    if (step !== undefined) return step;
    return CREATOR_STEPS[0] as CreatorStep;
  }

  /** Returns the zero-based index of the current step. */
  get currentStepIndex(): number {
    return this._currentIndex;
  }

  /** Returns the total number of modal steps. */
  get totalSteps(): number {
    return CREATOR_STEPS.length;
  }

  /* ── Navigation ────────────────────────────────────────────── */

  /** Advances to the next non-skippable step. */
  next(): CreatorStep {
    for (let i = this._currentIndex + 1; i < CREATOR_STEPS.length; i++) {
      const step = CREATOR_STEPS[i];
      if (step !== undefined && !this.isStepSkippable(step)) {
        this._currentIndex = i;
        return step;
      }
    }
    return this.currentStep;
  }

  /** Moves back to the previous non-skippable step. */
  previous(): CreatorStep {
    for (let i = this._currentIndex - 1; i >= 0; i--) {
      const step = CREATOR_STEPS[i];
      if (step !== undefined && !this.isStepSkippable(step)) {
        this._currentIndex = i;
        return step;
      }
    }
    return this.currentStep;
  }

  /** Jumps to a specific step. Returns true on success. */
  jumpTo(step: CreatorStep): boolean {
    const index = CREATOR_STEPS.indexOf(step);
    if (index === -1) return false;
    this._currentIndex = index;
    return true;
  }

  /** Returns true if the given step is a valid navigation target. */
  canNavigateTo(step: CreatorStep): boolean {
    return CREATOR_STEPS.includes(step);
  }

  /* ── Step resolution ───────────────────────────────────────── */

  /** Returns true if all underlying draft steps are resolved. */
  isStepResolved(step: CreatorStep): boolean {
    const draftSteps = getDraftStepsForCreatorStep(step);
    return draftSteps.every(
      (ds) => getStepState(this.draft, ds) === "resolved",
    );
  }

  /** Marks all underlying draft steps for this modal step as resolved. */
  markStepResolved(step: CreatorStep): void {
    const draftSteps = getDraftStepsForCreatorStep(step);
    for (const ds of draftSteps) {
      markStepResolved(this.draft, ds);
    }
  }

  /** Marks the current step as resolved. */
  markCurrentStepResolved(): void {
    this.markStepResolved(this.currentStep);
  }

  /** Invalidates all downstream dependents of the given modal step. */
  invalidateDependents(step: CreatorStep): DraftStep[] {
    const draftSteps = getDraftStepsForCreatorStep(step);
    const allInvalidated = new Set<DraftStep>();
    for (const ds of draftSteps) {
      const invalidated = invalidateDependentSteps(this.draft, ds);
      for (const invalidatedStep of invalidated) {
        allInvalidated.add(invalidatedStep);
      }
    }
    return [...allInvalidated];
  }

  /** Invalidates all downstream dependents of the current step. */
  invalidateCurrentDependents(): DraftStep[] {
    return this.invalidateDependents(this.currentStep);
  }

  /* ── Skip logic ────────────────────────────────────────────── */

  /** Returns true if the step can be automatically skipped. */
  isStepSkippable(step: CreatorStep): boolean {
    if (step === "spells" && this.draft.spellEligibility.isSpellcaster === false) {
      return true;
    }
    return false;
  }

  /* ── Completion tracking ───────────────────────────────────── */

  /** Returns all modal steps that are resolved (or skippable). */
  getResolvedSteps(): CreatorStep[] {
    return CREATOR_STEPS.filter((step) => {
      if (this.isStepSkippable(step)) return true;
      return this.isStepResolved(step);
    });
  }

  /** Returns all modal steps that are not yet resolved and not skippable. */
  getUnresolvedSteps(): CreatorStep[] {
    return CREATOR_STEPS.filter((step) => {
      if (this.isStepSkippable(step)) return false;
      return !this.isStepResolved(step);
    });
  }

  /** Returns true when all required (non-skippable) steps are resolved. */
  canSave(): boolean {
    return CREATOR_STEPS.every((step) => {
      if (this.isStepSkippable(step)) return true;
      return this.isStepResolved(step);
    });
  }

  /* ── Review state ──────────────────────────────────────────── */

  /** Aggregates the current draft data into a review-ready snapshot. */
  buildReviewState(): ReviewState {
    return {
      ruleset: this.draft.ruleset,
      sources: this.draft.sources,
      identity: this.draft.identity,
      species: this.draft.species,
      background: this.draft.background,
      class: this.draft.class,
      abilities: this.draft.abilities,
      proficiencies: this.draft.proficiencies,
      languages: this.draft.languages,
      equipment: this.draft.equipment,
      spellEligibility: this.draft.spellEligibility,
      spells: this.draft.spells,
    };
  }
}
