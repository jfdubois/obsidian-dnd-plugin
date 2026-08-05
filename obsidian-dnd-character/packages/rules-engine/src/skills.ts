import type { Ability, EntityId } from "@obsidian-dnd/domain";
import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddProficiencyEffect,
  AddExpertiseEffect,
  ConditionalRollModeEffect,
  ProficiencyRef,
  ProficiencySkillRef,
  RollPredicate,
  RollMode,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { abilityModifier } from "./ability-scores";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import { calculateTotalLevel } from "./total-level";

/* ── Skill result types ─────────────────────────────────────────────
   Pure calculation results for skill totals, proficiencies, expertise,
   conditional effects, and passive values.
   Deterministic and independent of Obsidian UI.                       */

/** A conditional roll mode applied to a specific skill check. */
export interface SkillConditional {
  /** The roll mode: advantage or disadvantage. */
  mode: RollMode;
  /** The predicate that triggers this conditional. */
  predicate: RollPredicate;
}

/** Per-skill entry with full breakdown. */
export interface SkillEntry {
  /** The catalog entity ID of the skill. */
  skillId: EntityId;
  /** The ability this skill uses. */
  ability: Ability;
  /** The ability modifier for this skill. */
  abilityModifier: number;
  /** Whether the character is proficient in this skill. */
  isProficient: boolean;
  /** Whether the character has expertise in this skill. */
  hasExpertise: boolean;
  /** The proficiency bonus applied (0 if not proficient, doubled if expert). */
  proficiencyBonus: number;
  /** The final skill total (abilityModifier + proficiencyBonus). */
  total: number;
  /** Conditional roll modes (advantage/disadvantage) from effects. */
  conditionals: ReadonlyArray<SkillConditional>;
}

/** Passive perception and investigation values. */
export interface PassiveValues {
  /** Passive Perception: 10 + Perception skill total. */
  passivePerception: number | null;
  /** Passive Investigation: 10 + Investigation skill total. */
  passiveInvestigation: number | null;
}

/** Complete skill calculation result for all proficient skills. */
export interface SkillsResult {
  /** Total character level used for proficiency bonus calculation. */
  totalLevel: number;
  /** Base proficiency bonus from level. */
  proficiencyBonus: number;
  /** Per-skill entries in deterministic skill ID order. */
  skills: ReadonlyArray<SkillEntry>;
  /** Passive perception and investigation values. */
  passive: PassiveValues;
}

/* ── Effect type guards ───────────────────────────────────────────── */

function isAddProficiencyEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddProficiencyEffect {
  return effect.type === "add-proficiency";
}

function isAddExpertiseEffect(
  effect: RuleEffect,
): effect is RuleEffect & AddExpertiseEffect {
  return effect.type === "add-expertise";
}

function isConditionalRollModeEffect(
  effect: RuleEffect,
): effect is RuleEffect & ConditionalRollModeEffect {
  return effect.type === "conditional-roll-mode";
}

function isProficiencySkillRef(
  prof: ProficiencyRef,
): prof is ProficiencySkillRef {
  return prof.kind === "skill";
}

/* ── Predicate matching ───────────────────────────────────────────── */

/**
 * Checks if a roll predicate matches a specific skill ID.
 *
 * Matches:
 * - skill predicate targeting the same skill ID
 * - ability predicate targeting the skill's ability
 * - condition predicate (applies to all skill checks)
 *
 * Does NOT match:
 * - damage-type predicate (skills are not saving throws against damage)
 * - concentration predicate (skills are not concentration checks)
 */
function predicateMatchesSkill(
  predicate: RollPredicate,
  skillId: EntityId,
  skillAbility: Ability,
): boolean {
  switch (predicate.type) {
    case "skill":
      return predicate.skillId === skillId;
    case "ability":
      return predicate.ability === skillAbility;
    case "condition":
      return true;
    case "damage-type":
      return false;
    case "concentration":
      return false;
  }
}

/* ── Main calculation ─────────────────────────────────────────────── */

/**
 * Calculates skill totals for all skills the character is proficient in.
 *
 * Process:
 * 1. Calculate total level and proficiency bonus
 * 2. Collect all rule effects via collectEffects
 * 3. Gather skill proficiencies and expertise from effects
 * 4. For each proficient skill:
 *    a. Look up the skill in the catalog to determine its ability
 *    b. Get the ability modifier from the character's scores
 *    c. Calculate proficiency bonus (doubled if expert)
 *    d. Collect conditional roll mode effects (advantage/disadvantage)
 *    e. Calculate total = abilityModifier + proficiencyBonus
 * 5. Calculate passive perception and investigation (10 + skill total)
 *
 * Results are returned in deterministic skill ID order.
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with per-skill breakdowns and passive values
 */
export function calculateSkills(
  character: Character,
  catalog: CatalogLookup,
): SkillsResult {
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  const collected = collectEffects(character, catalog);

  // Collect proficient skill IDs
  const proficientSkillIds = new Set<EntityId>();
  for (const ce of collected) {
    if (isAddProficiencyEffect(ce.effect)) {
      const prof = ce.effect.proficiency;
      if (isProficiencySkillRef(prof)) {
        proficientSkillIds.add(prof.entityId);
      }
    }
  }

  // Collect expertise skill IDs
  const expertiseSkillIds = new Set<EntityId>();
  for (const ce of collected) {
    if (isAddExpertiseEffect(ce.effect)) {
      expertiseSkillIds.add(ce.effect.skillId);
    }
  }

  // Build per-skill entries
  const skills: SkillEntry[] = [];

  for (const skillId of proficientSkillIds) {
    const skillRule = catalog.getSkill(skillId);
    if (skillRule === undefined) {
      continue;
    }

    const ability = skillRule.abilityScore;
    const abilityMod = abilityModifier(character.abilities.scores[ability]);
    const hasExpertise = expertiseSkillIds.has(skillId);
    const profBonus = proficientSkillIds.has(skillId)
      ? (hasExpertise ? proficiencyBonus * 2 : proficiencyBonus)
      : 0;
    const total = abilityMod + profBonus;

    // Collect conditional roll modes for this skill
    const conditionals: SkillConditional[] = [];
    for (const ce of collected) {
      if (isConditionalRollModeEffect(ce.effect)) {
        const { rollType, mode, predicate } = ce.effect;
        if (rollType === "ability-check" && predicateMatchesSkill(predicate, skillId, ability)) {
          conditionals.push({
            mode,
            predicate,
          });
        }
      }
    }

    skills.push({
      skillId,
      ability,
      abilityModifier: abilityMod,
      isProficient: true,
      hasExpertise,
      proficiencyBonus: profBonus,
      total,
      conditionals: Object.freeze(conditionals),
    });
  }

  // Sort by skill ID for deterministic ordering
  skills.sort((a, b) => a.skillId.localeCompare(b.skillId));

  // Calculate passive values
  const passivePerception = findSkillTotal(skills, "passive-perception");
  const passiveInvestigation = findSkillTotal(skills, "passive-investigation");

  return {
    totalLevel,
    proficiencyBonus,
    skills: Object.freeze(skills),
    passive: {
      passivePerception,
      passiveInvestigation,
    },
  };
}

/**
 * Finds the passive value for a skill by its known entity ID suffix.
 * Returns 10 + skill total if the skill exists, or null if not proficient.
 */
function findSkillTotal(
  skills: ReadonlyArray<SkillEntry>,
  passiveKey: "passive-perception" | "passive-investigation",
): number | null {
  const targetSuffix = passiveKey === "passive-perception"
    ? "perception"
    : "investigation";

  for (const entry of skills) {
    if (entry.skillId.endsWith(targetSuffix)) {
      return 10 + entry.total;
    }
  }
  return null;
}
