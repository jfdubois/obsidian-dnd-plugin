/* ── Weapon Category ─────────────────────────────────────────────
   Finite normalized vocabulary for verified Class source universe.
   Not a raw 5eTools string. Unknown values diagnose.               */

export type WeaponCategory = "simple" | "martial";

export const WEAPON_CATEGORIES: ReadonlyArray<WeaponCategory> = ["simple", "martial"];

export function isWeaponCategory(value: unknown): value is WeaponCategory {
  return WEAPON_CATEGORIES.includes(value as WeaponCategory);
}

/* ── Weapon Property Reference ───────────────────────────────────
   Reuses the normalized ItemRule weapon-property classification.
   H6 requires only "light" and "finesse" (observed in XPHB filters).
   Unknown properties diagnose.                                      */

export type WeaponPropertyRef = "light" | "finesse";

export const WEAPON_PROPERTY_REFS: ReadonlyArray<WeaponPropertyRef> = ["light", "finesse"];

export function isWeaponPropertyRef(value: unknown): value is WeaponPropertyRef {
  return WEAPON_PROPERTY_REFS.includes(value as WeaponPropertyRef);
}

/* ── Proficiency Group ───────────────────────────────────────────
   Catalog-owned classification for tool proficiency queries.
   Semantically separate from EquipmentGroup, even where labels coincide. */

export type ProficiencyGroup = "artisan-tool" | "musical-instrument";

export const PROFICIENCY_GROUPS: ReadonlyArray<ProficiencyGroup> = ["artisan-tool", "musical-instrument"];

export function isProficiencyGroup(value: unknown): value is ProficiencyGroup {
  return PROFICIENCY_GROUPS.includes(value as ProficiencyGroup);
}
