/* ── Review snapshot: read-only aggregation of resolved draft ────
   Builds a read-only view of all resolved step data for the review
   UI. The snapshot is derived (computed on demand), not persisted
   in the draft. Implements CRE-009.                              */

import type { CharacterDraft } from "./character-draft";
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
  DraftProficiencyChoiceData,
  DraftProficiencyData,
  DraftLanguageChoiceData,
  DraftLanguageData,
  DraftEquipmentChoiceData,
  DraftEquipmentData,
  DraftSpellEligibilityData,
  DraftSpellData,
} from "./character-draft-steps";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

/* ── Snapshot type ─────────────────────────────────────────────── */

/**
 * Read-only aggregation of all 18 resolved draft data sections.
 * The snapshot is derived from the draft, never persisted.
 */
export interface ReviewSnapshot {
  ruleset: Readonly<DraftRulesetData>;
  sources: Readonly<DraftSourceData>;
  identity: Readonly<DraftIdentityData>;
  species: Readonly<DraftSpeciesData>;
  speciesChoices: Readonly<DraftSpeciesChoiceData>;
  background: Readonly<DraftBackgroundData>;
  backgroundChoices: Readonly<DraftBackgroundChoiceData>;
  class: Readonly<DraftClassData>;
  classGrants: Readonly<DraftClassGrantData>;
  abilities: Readonly<DraftAbilityData>;
  proficiencyChoices: Readonly<DraftProficiencyChoiceData>;
  proficiencies: Readonly<DraftProficiencyData>;
  languageChoices: Readonly<DraftLanguageChoiceData>;
  languages: Readonly<DraftLanguageData>;
  equipmentChoices: Readonly<DraftEquipmentChoiceData>;
  equipment: Readonly<DraftEquipmentData>;
  spellEligibility: Readonly<DraftSpellEligibilityData>;
  spells: Readonly<DraftSpellData>;
}

/* ── Builder ───────────────────────────────────────────────────── */

/** Data steps (all draft steps except the review step itself). */
const DATA_STEPS: ReadonlyArray<string> = ALL_DRAFT_STEPS.filter(
  (step) => step !== "review",
);

/**
 * Builds a read-only review snapshot from a fully resolved character draft.
 *
 * Returns `null` when any data step has not been resolved, ensuring the
 * snapshot is only produced for a complete draft. The snapshot references
 * the draft's live data objects but enforces read-only access through the
 * type system.
 */
export function buildReviewSnapshot(
  draft: CharacterDraft,
): ReviewSnapshot | null {
  const allResolved = DATA_STEPS.every((step) => {
    const state = draft.stepStatuses.get(step as typeof ALL_DRAFT_STEPS[number]);
    return state === "resolved";
  });

  if (!allResolved) {
    return null;
  }

  return {
    ruleset: draft.ruleset,
    sources: draft.sources,
    identity: draft.identity,
    species: draft.species,
    speciesChoices: draft.speciesChoices,
    background: draft.background,
    backgroundChoices: draft.backgroundChoices,
    class: draft.class,
    classGrants: draft.classGrants,
    abilities: draft.abilities,
    proficiencyChoices: draft.proficiencyChoices,
    proficiencies: draft.proficiencies,
    languageChoices: draft.languageChoices,
    languages: draft.languages,
    equipmentChoices: draft.equipmentChoices,
    equipment: draft.equipment,
    spellEligibility: draft.spellEligibility,
    spells: draft.spells,
  };
}
