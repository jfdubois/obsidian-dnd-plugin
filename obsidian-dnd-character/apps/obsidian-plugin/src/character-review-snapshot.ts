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
  DraftBackgroundData,
  DraftClassData,
  DraftAbilityData,
  DraftProficiencyData,
  DraftLanguageData,
  DraftEquipmentData,
  DraftSpellEligibilityData,
  DraftSpellData,
} from "./character-draft-steps";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import type { ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";

/* ── Snapshot type ─────────────────────────────────────────────── */

/**
 * Read-only aggregation of resolved draft data. Catalog-owned choice state is
 * exposed exactly once via `selections`; legacy step buckets are excluded.
 * The snapshot is derived from the draft, never persisted.
 */
export interface ReviewSnapshot {
  ruleset: Readonly<DraftRulesetData>;
  sources: Readonly<DraftSourceData>;
  identity: Readonly<DraftIdentityData>;
  species: Readonly<DraftSpeciesData>;
  background: Readonly<DraftBackgroundData>;
  class: Readonly<DraftClassData>;
  abilities: Readonly<DraftAbilityData>;
  proficiencies: Readonly<DraftProficiencyData>;
  languages: Readonly<DraftLanguageData>;
  equipment: Readonly<DraftEquipmentData>;
  spellEligibility: Readonly<DraftSpellEligibilityData>;
  spells: Readonly<DraftSpellData>;
  selections: Readonly<Record<ChoiceInstanceId, CharacterChoice>>;
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
    background: draft.background,
    class: draft.class,
    abilities: draft.abilities,
    proficiencies: draft.proficiencies,
    languages: draft.languages,
    equipment: draft.equipment,
    spellEligibility: draft.spellEligibility,
    spells: draft.spells,
    selections: draft.selections,
  };
}
