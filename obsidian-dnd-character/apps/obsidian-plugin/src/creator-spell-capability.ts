/* ── Creator spell capability ────────────────────────────────────
   A Spells page is required only for active normalized class spell
   choices. Spellcasting alone is not a creator-time selection.     */

import type { CharacterDraft } from "./character-draft";
import type { SelectionConsequenceModel } from "./creator-consequence-service";

/**
 * Determines whether the active normalized class consequences own at least
 * one required spell selection. This deliberately uses choice definitions,
 * rather than class identity or the presence of a fixed wizard tab.
 */
export interface SpellSelectionCapability {
  required: boolean;
  complete: boolean;
}

export function deriveSpellSelectionCapability(
  model: SelectionConsequenceModel,
): SpellSelectionCapability {
  const choices = model.origins
    .filter((origin) => origin.origin.kind === "class")
    .flatMap((origin) => origin.choices)
    .filter((choice) => choice.definition.type === "spell" && choice.definition.minimum > 0);
  return { required: choices.length > 0, complete: choices.every((choice) => choice.status === "resolved") };
}

/**
 * The draft projection of the normalized capability. All global creator
 * gates use this rather than treating the legacy Spells DraftStep as global.
 */
export function isSpellSelectionCapabilityRequired(draft: CharacterDraft): boolean {
  return draft.spellEligibility.isSpellcaster;
}
