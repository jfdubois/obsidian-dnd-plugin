/* ── Spell selection step ───────────────────────────────────────
   Allows the user to select which spells the character knows or
   prepares from the eligible spell list.
   Pure TypeScript logic — no Obsidian UI.                          */

import { isEntityId, isClassInstanceId } from "@obsidian-dnd/domain";
import type { CharacterSpellSelection, SpellAcquisition } from "@obsidian-dnd/character-contract";
import type { CharacterDraft } from "./character-draft";
import {
  markStepResolved,
  invalidateDependentSteps,
  getStepState,
} from "./character-draft";

/* ── Validation ────────────────────────────────────────────────── */

const SPELL_ACQUISITION_VALUES: ReadonlyArray<SpellAcquisition> = [
  "known",
  "prepared",
  "always-prepared",
  "species",
  "background",
  "feat",
  "item",
];

function isSpellAcquisition(value: unknown): value is SpellAcquisition {
  return SPELL_ACQUISITION_VALUES.includes(value as SpellAcquisition);
}

function isCharacterSpellSelection(value: unknown): value is CharacterSpellSelection {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isEntityId(obj.spellId)) return false;
  if (obj.classInstanceId !== undefined && !isClassInstanceId(obj.classInstanceId)) return false;
  if (obj.originGrantId !== undefined && !isEntityId(obj.originGrantId)) return false;
  if (!isSpellAcquisition(obj.acquisition)) return false;
  return true;
}

/**
 * Validates that the given value is a valid spell selections array.
 * The value must be an array where every element is a valid
 * CharacterSpellSelection record.
 */
function validateSpellSelections(
  value: unknown,
): value is CharacterSpellSelection[] {
  if (!Array.isArray(value)) return false;
  return value.every((s) => isCharacterSpellSelection(s));
}

/* ── Spell selection ───────────────────────────────────────────── */

/**
 * Sets the spell selections on the draft. Validates that:
 * - The spell-eligibility step has been resolved first
 * - The class step has been resolved first
 * - The species step has been resolved first
 * - All spell selections are valid CharacterSpellSelection records
 *
 * Sets the draft.spells.selections with the validated selection,
 * marks the spells draft step as resolved, and invalidates
 * all downstream dependent steps.
 *
 * Returns true if the selections were accepted and applied,
 * false if validation failed.
 */
export function selectSpells(
  draft: CharacterDraft,
  selections: unknown,
): boolean {
  // Spells depend on spell-eligibility being resolved first
  if (getStepState(draft, "spell-eligibility") !== "resolved") {
    return false;
  }

  // Spells depend on class being resolved first
  if (getStepState(draft, "class") !== "resolved") {
    return false;
  }

  // Spells depend on species being resolved first
  if (getStepState(draft, "species") !== "resolved") {
    return false;
  }

  if (!validateSpellSelections(selections)) {
    return false;
  }

  draft.spells.selections = [...selections];
  markStepResolved(draft, "spells");
  invalidateDependentSteps(draft, "spells");
  return true;
}
