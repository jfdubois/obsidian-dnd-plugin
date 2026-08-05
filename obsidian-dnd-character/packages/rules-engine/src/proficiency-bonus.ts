/* ── Proficiency bonus table (D&D 2024) ───────────────────────────
   Deterministic lookup table for proficiency bonus by total level.
   Pure data, no external dependencies.                              */

export const PROFICIENCY_BONUS_TABLE: ReadonlyArray<{ minLevel: number; maxLevel: number; bonus: number }> = Object.freeze([
  Object.freeze({ minLevel: 1, maxLevel: 4, bonus: 2 }),
  Object.freeze({ minLevel: 5, maxLevel: 8, bonus: 3 }),
  Object.freeze({ minLevel: 9, maxLevel: 12, bonus: 4 }),
  Object.freeze({ minLevel: 13, maxLevel: 16, bonus: 5 }),
  Object.freeze({ minLevel: 17, maxLevel: 20, bonus: 6 }),
  Object.freeze({ minLevel: 21, maxLevel: 24, bonus: 7 }),
  Object.freeze({ minLevel: 25, maxLevel: 30, bonus: 8 }),
]);

/**
 * Returns the proficiency bonus for a given total character level
 * using the standard D&D 2024 proficiency bonus table.
 *
 * @param totalLevel - The total character level (0-30)
 * @returns The proficiency bonus, or 0 for level 0
 */
export function proficiencyBonusForLevel(totalLevel: number): number {
  if (totalLevel <= 0) {
    return 0;
  }

  for (const entry of PROFICIENCY_BONUS_TABLE) {
    if (totalLevel >= entry.minLevel && totalLevel <= entry.maxLevel) {
      return entry.bonus;
    }
  }

  // Levels above 30 use the maximum bonus
  return 8;
}
