/* ── Character draft: top-level state ────────────────────────────
   The CharacterDraft holds all per-step data, step status tracking,
   and diagnostic state. It is mutable during creation but not
   persisted until the final save (P10-T018).                     */

import type {
  DraftRulesetData,
  DraftSourceData,
  DraftIdentityData,
  DraftSpeciesData,
  DraftSpeciesChoiceData,
  DraftBackgroundData,
  DraftBackgroundChoiceData,
  DraftClassData,
  DraftClassGrantData,
  DraftAbilityData,
  DraftProficiencyData,
  DraftProficiencyChoiceData,
  DraftLanguageData,
  DraftLanguageChoiceData,
  DraftEquipmentChoiceData,
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
  createEmptyDraftSpeciesChoiceData,
  createEmptyDraftBackgroundData,
  createEmptyDraftBackgroundChoiceData,
  createEmptyDraftClassData,
  createEmptyDraftClassGrantData,
  createEmptyDraftAbilityData,
  createEmptyDraftProficiencyData,
  createEmptyDraftProficiencyChoiceData,
  createEmptyDraftLanguageData,
  createEmptyDraftLanguageChoiceData,
  createEmptyDraftEquipmentChoiceData,
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

/* ── Draft state ───────────────────────────────────────────────── */

export interface CharacterDraft {
  /* Step data sections */
  ruleset: DraftRulesetData;
  sources: DraftSourceData;
  identity: DraftIdentityData;
  species: DraftSpeciesData;
  speciesChoices: DraftSpeciesChoiceData;
  background: DraftBackgroundData;
  backgroundChoices: DraftBackgroundChoiceData;
  class: DraftClassData;
  classGrants: DraftClassGrantData;
  abilities: DraftAbilityData;
  proficiencyChoices: DraftProficiencyChoiceData;
  proficiencies: DraftProficiencyData;
  languageChoices: DraftLanguageChoiceData;
  languages: DraftLanguageData;
  equipmentChoices: DraftEquipmentChoiceData;
  equipment: DraftEquipmentData;
  spellEligibility: DraftSpellEligibilityData;
  spells: DraftSpellData;

  /* Step status tracking */
  stepStatuses: Map<DraftStep, DraftStepState>;

  /* Diagnostics */
  diagnostics: DraftDiagnostic[];
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
    speciesChoices: createEmptyDraftSpeciesChoiceData(),
    background: createEmptyDraftBackgroundData(),
    backgroundChoices: createEmptyDraftBackgroundChoiceData(),
    class: createEmptyDraftClassData(),
    classGrants: createEmptyDraftClassGrantData(),
    abilities: createEmptyDraftAbilityData(),
    proficiencyChoices: createEmptyDraftProficiencyChoiceData(),
    proficiencies: createEmptyDraftProficiencyData(),
    languageChoices: createEmptyDraftLanguageChoiceData(),
    languages: createEmptyDraftLanguageData(),
    equipmentChoices: createEmptyDraftEquipmentChoiceData(),
    equipment: createEmptyDraftEquipmentData(),
    spellEligibility: createEmptyDraftSpellEligibilityData(),
    spells: createEmptyDraftSpellData(),
    stepStatuses,
    diagnostics: [],
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
    "speciesChoices",
    "background",
    "backgroundChoices",
    "class",
    "classGrants",
    "abilities",
    "proficiencyChoices",
    "proficiencies",
    "languageChoices",
    "languages",
    "equipmentChoices",
    "equipment",
    "spellEligibility",
    "spells",
    "stepStatuses",
    "diagnostics",
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }

  // stepStatuses must be a Map
  if (!(obj.stepStatuses instanceof Map)) return false;

  // diagnostics must be an array
  if (!Array.isArray(obj.diagnostics)) return false;

  return true;
}

/* ── Step status operations ────────────────────────────────────── */

export function markStepResolved(draft: CharacterDraft, step: DraftStep): void {
  // Invalidate all transitive dependents before marking this step resolved.
  // This ensures that re-resolving an upstream step (e.g., changing species
  // after species-choices are already resolved) cascades invalidation to
  // all downstream dependent steps.
  const dependents = getTransitiveDependents(step);
  for (const dependent of dependents) {
    draft.stepStatuses.set(dependent, "invalidated");
  }
  draft.stepStatuses.set(step, "resolved");
  refreshDiagnostics(draft);
}

export function invalidateStep(draft: CharacterDraft, step: DraftStep): void {
  draft.stepStatuses.set(step, "invalidated");
  // Also invalidate all transitive dependents
  const dependents = getTransitiveDependents(step);
  for (const dependent of dependents) {
    draft.stepStatuses.set(dependent, "invalidated");
  }
  refreshDiagnostics(draft);
}

export function invalidateDependentSteps(
  draft: CharacterDraft,
  changedStep: DraftStep,
): DraftStep[] {
  const dependents = getTransitiveDependents(changedStep);
  for (const dependent of dependents) {
    draft.stepStatuses.set(dependent, "invalidated");
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
  const diagnostics: DraftDiagnostic[] = [];

  // Check species choices: if species is selected, species-choices must be resolved
  if (draft.species.speciesId !== null) {
    const speciesChoicesState = draft.stepStatuses.get("species-choices");
    if (speciesChoicesState !== "resolved") {
      diagnostics.push({
        step: "species-choices",
        message: "Species choices not yet resolved",
        severity: "error",
      });
    }
  }

  // Check background choices: if background is selected, background-choices must be resolved
  if (draft.background.backgroundId !== null) {
    const backgroundChoicesState = draft.stepStatuses.get("background-choices");
    if (backgroundChoicesState !== "resolved") {
      diagnostics.push({
        step: "background-choices",
        message: "Background choices not yet resolved",
        severity: "error",
      });
    }
  }

  // Check class starting grants: if class is selected, class-starting-grants must be resolved
  if (draft.class.classId !== null) {
    const classGrantsState = draft.stepStatuses.get("class-starting-grants");
    if (classGrantsState !== "resolved") {
      diagnostics.push({
        step: "class-starting-grants",
        message: "Class starting grants not yet resolved",
        severity: "error",
      });
    }
  }

  return diagnostics;
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
    (step) => draft.stepStatuses.get(step) === "resolved",
  );
}

export function hasErrors(draft: CharacterDraft): boolean {
  return draft.diagnostics.some((d) => d.severity === "error");
}
