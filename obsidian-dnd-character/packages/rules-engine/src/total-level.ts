import type { Character } from "@obsidian-dnd/character-contract";

/* ── Total character level ────────────────────────────────────────
   Pure calculation: sum of all class instance levels.
   Independent of Obsidian UI and catalog state.                    */

/**
 * Calculates the total character level by summing the levels of all
 * class instances in the character's progression.
 *
 * @param character - The character document
 * @returns The total level (0 if no classes)
 */
export function calculateTotalLevel(character: Character): number {
  return character.progression.classes.reduce(
    (sum, cls) => sum + cls.level,
    0,
  );
}
