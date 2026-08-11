/* ── Species choice prerequisite evaluation ──────────────────────
   Evaluates RulePrerequisites against CharacterDraft state.
   Pure TypeScript logic — no Obsidian UI.                         */

import type { CharacterDraft } from "./character-draft";
import type { RulePrerequisite } from "@obsidian-dnd/catalog-contract";
import type { Ability } from "@obsidian-dnd/domain";

/**
 * Evaluates a single prerequisite against the current draft state.
 * Returns true if the prerequisite is satisfied.
 */
export function evaluatePrerequisite(
  draft: CharacterDraft,
  prerequisite: RulePrerequisite,
): boolean {
  switch (prerequisite.type) {
    case "ability-score":
      return evaluateAbilityScorePrerequisite(draft, prerequisite);
    case "level":
      return evaluateLevelPrerequisite(draft, prerequisite);
    case "entity-selection":
      return evaluateEntitySelectionPrerequisite(draft, prerequisite);
    default:
      return false;
  }
}

/**
 * Evaluates all prerequisites for a choice definition.
 * Returns true if all prerequisites are satisfied.
 */
export function evaluatePrerequisites(
  draft: CharacterDraft,
  prerequisites: RulePrerequisite[],
): boolean {
  if (prerequisites.length === 0) return true;
  return prerequisites.every((prereq) => evaluatePrerequisite(draft, prereq));
}

/* ── Ability score prerequisite ────────────────────────────────── */

function evaluateAbilityScorePrerequisite(
  draft: CharacterDraft,
  prerequisite: Extract<RulePrerequisite, { type: "ability-score" }>,
): boolean {
  const scores = draft.abilities.scores;
  if (scores === undefined) return false;

  const currentScore = scores[prerequisite.ability as Ability];
  if (currentScore === undefined) return false;

  return currentScore >= prerequisite.minimumValue;
}

/* ── Level prerequisite ────────────────────────────────────────── */

function evaluateLevelPrerequisite(
  draft: CharacterDraft,
  prerequisite: Extract<RulePrerequisite, { type: "level" }>,
): boolean {
  // Character level is derived from class level during creation.
  // For level 1 characters, the class step must be resolved.
  // TODO: Implement proper level tracking when class levels are supported.
  // For now, assume level 1 if class is selected.
  if (draft.class.classId === null) return false;
  return 1 >= prerequisite.minimumLevel;
}

/* ── Entity selection prerequisite ─────────────────────────────── */

function evaluateEntitySelectionPrerequisite(
  draft: CharacterDraft,
  prerequisite: Extract<RulePrerequisite, { type: "entity-selection" }>,
): boolean {
  const entityId = prerequisite.entityId;

  // Check if the entity is the selected species
  if (draft.species.speciesId === entityId) return true;

  // Check if the entity is the selected background
  if (draft.background.backgroundId === entityId) return true;

  // Check if the entity is the selected class
  if (draft.class.classId === entityId) return true;

  // Check if the entity is a selected species choice option
  for (const choice of Object.values(draft.speciesChoices.choices)) {
    if (choice.selectedValue.type === "entity-ids" && choice.selectedValue.entityIds.includes(entityId as never)) return true;
  }

  // Check if the entity is a selected background choice option
  for (const choice of Object.values(draft.backgroundChoices.choices)) {
    if (choice.selectedValue.type === "entity-ids" && choice.selectedValue.entityIds.includes(entityId as never)) return true;
  }

  return false;
}
