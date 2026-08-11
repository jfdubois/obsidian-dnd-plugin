import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddProficiencyEffect,
  AddExpertiseEffect,
  ProficiencyRef,
  ProficiencySkillRef,
  ProficiencyToolRef,
  ProficiencyArmorRef,
  ProficiencySavingThrowRef,
  ProficiencyWeaponRef,
  AddProficiencyTarget,
  RuleEffect,
} from "@obsidian-dnd/catalog-contract";
import type { EntityId } from "@obsidian-dnd/domain";
import type { CatalogLookup, CollectedEffect } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { proficiencyBonusForLevel } from "./proficiency-bonus";
import { calculateTotalLevel } from "./total-level";

/* ── Proficiency entry types ────────────────────────────────────────
   Structured results for each proficiency category.
   Deterministic and independent of Obsidian UI.                       */

/** A single armor proficiency entry. */
export interface ArmorProficiencyEntry {
  category: "light" | "medium" | "heavy" | "shield";
  hasExpertise: boolean;
  effectiveBonus: number;
}

/** A single weapon proficiency entry. */
export interface WeaponProficiencyEntry {
  weaponId: EntityId;
  hasExpertise: boolean;
  effectiveBonus: number;
}

/** A single tool proficiency entry. */
export interface ToolProficiencyEntry {
  toolId: EntityId;
  hasExpertise: boolean;
  effectiveBonus: number;
}

/** A single skill proficiency entry. */
export interface SkillProficiencyEntry {
  skillId: EntityId;
  hasExpertise: boolean;
  effectiveBonus: number;
}

/** A single saving throw proficiency entry. */
export interface SavingThrowProficiencyEntry {
  ability: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
  hasExpertise: boolean;
  effectiveBonus: number;
}

/* ── Result types ─────────────────────────────────────────────────── */

/**
 * Complete proficiency calculation result for a character.
 * Contains categorized proficiency lists with expertise flags.
 */
export interface ProficienciesResult {
  /** Total character level used for proficiency bonus calculation. */
  totalLevel: number;
  /** Base proficiency bonus from level. */
  proficiencyBonus: number;
  /** Armor proficiencies (deduplicated). */
  armors: ReadonlyArray<ArmorProficiencyEntry>;
  /** Weapon proficiencies (deduplicated). */
  weapons: ReadonlyArray<WeaponProficiencyEntry>;
  /** Tool proficiencies (deduplicated). */
  tools: ReadonlyArray<ToolProficiencyEntry>;
  /** Skill proficiencies (deduplicated). */
  skills: ReadonlyArray<SkillProficiencyEntry>;
  /** Saving throw proficiencies (deduplicated). */
  savingThrows: ReadonlyArray<SavingThrowProficiencyEntry>;
}

/* ── Proficiency key for deduplication ──────────────────────────────
   Each proficiency type maps to a unique string key for dedup.      */

type ProficiencyKey = string;

function proficiencyKeyForProf(ref: AddProficiencyTarget): ProficiencyKey {
  // Handle WeaponProficiencyScope (has "type" instead of "kind")
  if ("type" in ref) {
    if (ref.type === "weapon-category") {
      return `weapon-category:${ref.category}`;
    }
    if (ref.type === "weapon-filter") {
      const props = ref.requiredProperties.sort().join(",");
      return `weapon-filter:${ref.category}:${props}`;
    }
  }

  switch (ref.kind) {
    case "armor":
      return `armor:${ref.category}`;
    case "weapon":
      return `weapon:${ref.weaponId}`;
    case "tool":
      return `tool:${ref.toolId}`;
    case "skill":
      return `skill:${ref.entityId}`;
    case "saving-throw":
      return `saving-throw:${ref.ability}`;
    case "initiative":
      return "initiative";
  }
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

/* ── Proficiency ref type guards ──────────────────────────────────── */

function isProficiencyArmorRef(ref: ProficiencyRef): ref is ProficiencyArmorRef {
  return ref.kind === "armor";
}

function isProficiencyWeaponRef(ref: ProficiencyRef): ref is ProficiencyWeaponRef {
  return ref.kind === "weapon";
}

function isProficiencyToolRef(ref: ProficiencyRef): ref is ProficiencyToolRef {
  return ref.kind === "tool";
}

function isProficiencySkillRef(ref: ProficiencyRef): ref is ProficiencySkillRef {
  return ref.kind === "skill";
}

function isProficiencySavingThrowRef(ref: ProficiencyRef): ref is ProficiencySavingThrowRef {
  return ref.kind === "saving-throw";
}

/* ── Deterministic sort helpers ───────────────────────────────────── */

const ARMOR_CATEGORY_ORDER: ReadonlyArray<"light" | "medium" | "heavy" | "shield"> = [
  "light",
  "medium",
  "heavy",
  "shield",
];

function armorCategoryIndex(cat: "light" | "medium" | "heavy" | "shield"): number {
  return ARMOR_CATEGORY_ORDER.indexOf(cat);
}

/* ── Main calculation ─────────────────────────────────────────────── */

/**
 * Calculates all proficiencies and expertise for a character.
 *
 * Process:
 * 1. Calculate total level and proficiency bonus
 * 2. Collect all rule effects via collectEffects
 * 3. Filter and deduplicate add-proficiency effects by category
 * 4. Filter add-expertise effects for skills
 * 5. Build structured result with per-proficiency breakdowns
 *
 * Results are returned in deterministic order within each category.
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with proficiency entries and expertise flags
 */
export function calculateProficiencies(
  character: Character,
  catalog: CatalogLookup,
  collectedEffects?: ReadonlyArray<CollectedEffect>,
): ProficienciesResult {
  const totalLevel = calculateTotalLevel(character);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  const collected = collectedEffects ?? collectEffects(character, catalog);

  // Collect expertise skill IDs
  const expertiseSkillIds = new Set<EntityId>();
  for (const ce of collected) {
    if (isAddExpertiseEffect(ce.effect)) {
      expertiseSkillIds.add(ce.effect.skillId);
    }
  }

  // Deduplicate proficiency refs by key
  const seenKeys = new Set<ProficiencyKey>();
  const profRefs: AddProficiencyTarget[] = [];

  for (const ce of collected) {
    if (!isAddProficiencyEffect(ce.effect)) {
      continue;
    }
    const key = proficiencyKeyForProf(ce.effect.proficiency);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      profRefs.push(ce.effect.proficiency);
    }
  }

  // Categorize proficiencies
  const armors: ArmorProficiencyEntry[] = [];
  const weapons: WeaponProficiencyEntry[] = [];
  const tools: ToolProficiencyEntry[] = [];
  const skills: SkillProficiencyEntry[] = [];
  const savingThrows: SavingThrowProficiencyEntry[] = [];

  for (const ref of profRefs) {
    // Skip WeaponProficiencyScope entries—they require catalog-aware resolution
    // that the rules-engine does not perform. They are display-only at this layer.
    if ("type" in ref) continue;

    if (isProficiencyArmorRef(ref)) {
      armors.push({
        category: ref.category,
        hasExpertise: false,
        effectiveBonus: proficiencyBonus,
      });
    } else if (isProficiencyWeaponRef(ref)) {
      weapons.push({
        weaponId: ref.weaponId,
        hasExpertise: false,
        effectiveBonus: proficiencyBonus,
      });
    } else if (isProficiencyToolRef(ref)) {
      tools.push({
        toolId: ref.toolId,
        hasExpertise: false,
        effectiveBonus: proficiencyBonus,
      });
    } else if (isProficiencySkillRef(ref)) {
      const hasExpertise = expertiseSkillIds.has(ref.entityId);
      skills.push({
        skillId: ref.entityId,
        hasExpertise,
        effectiveBonus: hasExpertise ? proficiencyBonus * 2 : proficiencyBonus,
      });
    } else if (isProficiencySavingThrowRef(ref)) {
      savingThrows.push({
        ability: ref.ability,
        hasExpertise: false,
        effectiveBonus: proficiencyBonus,
      });
    }
  }

  // Sort armor by deterministic category order
  armors.sort((a, b) => armorCategoryIndex(a.category) - armorCategoryIndex(b.category));

  // Sort entity-based proficiencies by their ID string for determinism
  weapons.sort((a, b) => a.weaponId.localeCompare(b.weaponId));
  tools.sort((a, b) => a.toolId.localeCompare(b.toolId));
  skills.sort((a, b) => a.skillId.localeCompare(b.skillId));
  savingThrows.sort((a, b) => a.ability.localeCompare(b.ability));

  return {
    totalLevel,
    proficiencyBonus,
    armors: Object.freeze(armors),
    weapons: Object.freeze(weapons),
    tools: Object.freeze(tools),
    skills: Object.freeze(skills),
    savingThrows: Object.freeze(savingThrows),
  };
}
