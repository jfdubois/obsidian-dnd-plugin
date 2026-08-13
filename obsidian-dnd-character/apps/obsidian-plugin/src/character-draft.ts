/* ── Character draft: top-level state ────────────────────────────
   The CharacterDraft holds all per-step data, step status tracking,
   and diagnostic state. It is mutable during creation but not
   persisted until the final save (P10-T018).                     */

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
  DraftStep,
} from "./character-draft-steps";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import {
  createEmptyDraftRulesetData,
  createEmptyDraftSourceData,
  createEmptyDraftIdentityData,
  createEmptyDraftSpeciesData,
  createEmptyDraftBackgroundData,
  createEmptyDraftClassData,
  createEmptyDraftAbilityData,
  createEmptyDraftProficiencyData,
  createEmptyDraftLanguageData,
  createEmptyDraftEquipmentData,
  createEmptyDraftSpellEligibilityData,
  createEmptyDraftSpellData,
} from "./character-draft-steps";
import type {
  DraftStepState,
  DraftStepStatus,
  DraftDiagnostic,
} from "./character-draft-dependency";
import {
  buildDraftDiagnostics,
  getTransitiveDependents,
} from "./character-draft-dependency";
import type { RuleGrantId } from "@obsidian-dnd/domain";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { isSpellSelectionCapabilityRequired } from "./creator-spell-capability";

/* ── Draft state ───────────────────────────────────────────────── */

export interface CharacterDraft {
  /* Step data sections */
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

  /* Step status tracking */
  stepStatuses: Map<DraftStep, DraftStepState>;

  /* Diagnostics */
  diagnostics: DraftDiagnostic[];

  /** Sole authoritative storage for catalog-owned creator choice resolutions. */
  selections: Record<ChoiceInstanceId, CharacterChoice>;

  /** Explicit dice-currency resolutions. Catalog formulas never enter draft state. */
  randomGrantResolutions: Record<RuleGrantId, number>;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createEmptyCharacterDraft(): CharacterDraft {
  const stepStatuses = new Map<DraftStep, DraftStepState>();
  for (const step of ALL_DRAFT_STEPS) {
    stepStatuses.set(step, "unvisited");
  }

  return {
    ruleset: createEmptyDraftRulesetData(),
    sources: createEmptyDraftSourceData(),
    identity: createEmptyDraftIdentityData(),
    species: createEmptyDraftSpeciesData(),
    background: createEmptyDraftBackgroundData(),
    class: createEmptyDraftClassData(),
    abilities: createEmptyDraftAbilityData(),
    proficiencies: createEmptyDraftProficiencyData(),
    languages: createEmptyDraftLanguageData(),
    equipment: createEmptyDraftEquipmentData(),
    spellEligibility: createEmptyDraftSpellEligibilityData(),
    spells: createEmptyDraftSpellData(),
    stepStatuses,
    diagnostics: [],
    selections: {},
    randomGrantResolutions: {},
  };
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isCharacterDraft(value: unknown): value is CharacterDraft {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check all required step data fields exist
  const requiredFields: ReadonlyArray<keyof CharacterDraft> = [
    "ruleset",
    "sources",
    "identity",
    "species",
    "background",
    "class",
    "abilities",
    "proficiencies",
    "languages",
    "equipment",
    "spellEligibility",
    "spells",
    "stepStatuses",
    "diagnostics",
    "selections",
    "randomGrantResolutions",
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }

  // stepStatuses must be a Map
  if (!(obj.stepStatuses instanceof Map)) return false;

  // diagnostics must be an array
  if (!Array.isArray(obj.diagnostics)) return false;
  if (typeof obj.selections !== "object" || obj.selections === null || Array.isArray(obj.selections)) return false;
  if (typeof obj.randomGrantResolutions !== "object" || obj.randomGrantResolutions === null
    || !Object.values(obj.randomGrantResolutions as Record<string, unknown>).every((value) => typeof value === "number" && Number.isInteger(value) && value > 0)) return false;

  return true;
}

/* ── Step status operations ────────────────────────────────────── */

export function markStepResolved(
  draft: CharacterDraft,
  step: DraftStep,
  invalidateDependents: boolean = true,
): void {
  // Invalidate all transitive dependents before marking this step resolved.
  // This ensures that re-resolving an upstream step (e.g., changing species
  // after species-choices are already resolved) cascades invalidation to
  // all downstream dependent steps.
  // When invalidateDependents is false, dependents are left untouched
  // (e.g., first ruleset selection should not invalidate unvisited steps).
  // Only invalidate dependents that are currently "resolved" or already
  // "invalidated" — do NOT mark "unvisited" steps as invalidated.
  if (invalidateDependents) {
    const dependents = getTransitiveDependents(step);
    for (const dependent of dependents) {
      const currentState = draft.stepStatuses.get(dependent);
      if (currentState !== "unvisited") {
        draft.stepStatuses.set(dependent, "invalidated");
      }
    }
  }
  draft.stepStatuses.set(step, "resolved");
  refreshDiagnostics(draft);
}

export function invalidateStep(draft: CharacterDraft, step: DraftStep): void {
  draft.stepStatuses.set(step, "invalidated");
  // Also invalidate all transitive dependents, but only those that are
  // currently "resolved" or already "invalidated" — skip "unvisited" steps.
  const dependents = getTransitiveDependents(step);
  for (const dependent of dependents) {
    const currentState = draft.stepStatuses.get(dependent);
    if (currentState !== "unvisited") {
      draft.stepStatuses.set(dependent, "invalidated");
    }
  }
  refreshDiagnostics(draft);
}

export function invalidateDependentSteps(
  draft: CharacterDraft,
  changedStep: DraftStep,
): DraftStep[] {
  const dependents = getTransitiveDependents(changedStep);
  for (const dependent of dependents) {
    const currentState = draft.stepStatuses.get(dependent);
    if (currentState !== "unvisited") {
      draft.stepStatuses.set(dependent, "invalidated");
    }
  }
  refreshDiagnostics(draft);
  return dependents;
}

export function getStepState(
  draft: CharacterDraft,
  step: DraftStep,
): DraftStepState {
  return draft.stepStatuses.get(step) ?? "unvisited";
}

export function getStepStatuses(draft: CharacterDraft): ReadonlyArray<DraftStepStatus> {
  return ALL_DRAFT_STEPS.map((step) => ({
    step,
    state: draft.stepStatuses.get(step) ?? "unvisited",
  }));
}

/* ── Unresolved-choice diagnostics ───────────────────────────────
   Detects when an entity (species/background/class) has been
   selected but the corresponding choice step remains incomplete.
   These diagnostics are data-driven (check actual entity selections)
   rather than state-driven (check step resolution flags), so they
   catch cases where the user has data but hasn't resolved the step. */

export function buildUnresolvedChoiceDiagnostics(
  draft: CharacterDraft,
): DraftDiagnostic[] {
  void draft;
  // Catalog-owned choices are diagnosed only after their active consequence
  // model is loaded. A selected origin alone does not establish a choice.
  return [];
}

function refreshDiagnostics(draft: CharacterDraft): void {
  const statuses = getStepStatuses(draft);
  const stepDiagnostics = buildDraftDiagnostics(statuses);
  const choiceDiagnostics = buildUnresolvedChoiceDiagnostics(draft);
  draft.diagnostics = [...stepDiagnostics, ...choiceDiagnostics];
}

/* ── Convenience: check if draft is complete ───────────────────── */

export function isDraftComplete(draft: CharacterDraft): boolean {
  return ALL_DRAFT_STEPS.every(
    (step) => (step === "spell-eligibility" || step === "spells") && !isSpellSelectionCapabilityRequired(draft)
      || draft.stepStatuses.get(step) === "resolved",
  );
}

/** Legacy-free base completion used with an authoritative consequence model. */
export function isDraftCompleteWithoutCatalogOriginChoices(draft: CharacterDraft): boolean {
  const nonAuthoritativeCreatorSteps = new Set<DraftStep>([
    "species-choices", "background-choices", "class-starting-grants",
    "proficiency-choices", "proficiencies", "language-choices", "languages",
    "equipment-choices", "equipment",
    "review",
  ]);
  return ALL_DRAFT_STEPS.every(
    (step) => nonAuthoritativeCreatorSteps.has(step)
      || ((step === "spell-eligibility" || step === "spells") && !isSpellSelectionCapabilityRequired(draft))
      || draft.stepStatuses.get(step) === "resolved",
  );
}

export function hasErrors(draft: CharacterDraft): boolean {
  return draft.diagnostics.some((d) => d.severity === "error");
}
