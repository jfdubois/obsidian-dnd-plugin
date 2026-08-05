import type { Character } from "@obsidian-dnd/character-contract";
import type { CatalogLookup } from "./effect-provenance";
import type { CollectedEffect } from "./effect-provenance";
import {
  collectSpeciesEffects,
  collectBackgroundEffects,
  collectClassEffects,
  collectClassFeatureEffects,
  collectSubclassEffects,
  collectSubclassFeatureEffects,
  collectFeatEffects,
  collectSpellEffects,
  collectItemEffects,
  collectOptionalFeatureEffects,
} from "./effect-collection-phases";

/* ── Effect collection options ──────────────────────────────────── */

export interface CollectEffectsOptions {
  /** When true, skip effects from entities not found in the catalog. Default: true. */
  skipMissingEntities?: boolean;
}

const DEFAULT_OPTIONS: Required<CollectEffectsOptions> = {
  skipMissingEntities: true,
};

function applyOptions(options?: CollectEffectsOptions): Required<CollectEffectsOptions> {
  return { ...DEFAULT_OPTIONS, ...options };
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Collects all rule effects from a character in deterministic order.
 *
 * Collection order:
 * 1. Species effects
 * 2. Background effects
 * 3. Class effects (starting classes first)
 * 4. Class feature effects (by class instance, then level)
 * 5. Subclass effects
 * 6. Subclass feature effects
 * 7. Feat effects
 * 8. Spell effects
 * 9. Equipped item effects
 * 10. Attuned item effects
 * 11. Optional feature effects
 *
 * Each collected effect includes provenance metadata tracking its
 * origin entity, source kind, and class level (if applicable).
 */
export function collectEffects(
  character: Character,
  catalog: CatalogLookup,
  options?: CollectEffectsOptions,
): ReadonlyArray<CollectedEffect> {
  const _opts = applyOptions(options);
  const collected: CollectedEffect[] = [];

  // Execute phases in deterministic order
  collectSpeciesEffects(character, catalog, collected);
  collectBackgroundEffects(character, catalog, collected);
  collectClassEffects(character, catalog, collected);
  collectClassFeatureEffects(character, catalog, collected);
  collectSubclassEffects(character, catalog, collected);
  collectSubclassFeatureEffects(character, catalog, collected);
  collectFeatEffects(character, catalog, collected);
  collectSpellEffects(character, catalog, collected);
  collectItemEffects(character, catalog, collected);
  collectOptionalFeatureEffects(character, catalog, collected);

  return Object.freeze(collected.map((ce) => ({
    effect: ce.effect,
    provenance: Object.freeze(ce.provenance),
  })));
}
