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
import { isDraftCompleteWithoutCatalogOriginChoices } from "./character-draft";
import type { CatalogRevision, ChoiceInstanceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import type { EntityDetailResponse, RuleEffect } from "@obsidian-dnd/catalog-contract";
import type { EffectProvenance } from "@obsidian-dnd/rules-engine";
import { buildCreatorPreview } from "./creator-preview";

/* ── Snapshot type ─────────────────────────────────────────────── */

/**
 * Read-only aggregation of resolved draft data and a deterministic rules
 * projection. Catalog-owned choice state is exposed exactly once via
 * `selections`; legacy step buckets are excluded. The snapshot is never
 * persisted.
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
  derived: {
    abilities: ReadonlyArray<{
      ability: string;
      baseScore: number;
      originContribution: number;
      finalScore: number;
      modifier: number;
    }>;
    abilityContributions: ReadonlyArray<{
      ability: string;
      value: number;
      provenance: EffectProvenance;
    }>;
    hitPoints: {
      maximum: number;
      initialCurrent: number;
    };
  };
}

/* ── Builder ───────────────────────────────────────────────────── */

/** Data steps (all draft steps except the review step itself). */
/**
 * Builds a read-only review snapshot from a fully resolved character draft
 * and the normalized details required by the production rules engine.
 *
 * Returns `null` when any data step has not been resolved, ensuring the
 * snapshot is only produced for a complete, derivable draft.
 */
export function buildReviewSnapshot(
  draft: CharacterDraft,
  entities: readonly EntityDetailResponse[],
  catalogRevision: CatalogRevision | undefined,
): ReviewSnapshot | null {
  if (!isDraftCompleteWithoutCatalogOriginChoices(draft)) {
    return null;
  }
  const preview = buildCreatorPreview(draft, entities, catalogRevision);
  if (preview === null) return null;
  const abilityContributions = preview.projection.effects.flatMap((entry) => {
    const effect: RuleEffect = entry.effect;
    return effect.type === "add-ability" ? [{
      ability: effect.ability,
      value: effect.value,
      provenance: entry.provenance,
    }] : [];
  });

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
    derived: {
      abilities: preview.projection.abilities.abilities.map((entry) => ({
        ability: entry.ability,
        baseScore: entry.baseScore,
        originContribution: entry.effectTotal,
        finalScore: entry.finalScore,
        modifier: entry.modifier,
      })),
      abilityContributions,
      hitPoints: {
        maximum: preview.projection.maxHp.totalHp,
        initialCurrent: preview.character.resources.currentHp,
      },
    },
  };
}
