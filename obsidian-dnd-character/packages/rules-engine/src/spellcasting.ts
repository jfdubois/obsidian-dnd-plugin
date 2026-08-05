import type { EntityId } from "@obsidian-dnd/domain";
import type { RuleEffect, GrantSpellEffect, SpellGrant } from "@obsidian-dnd/catalog-contract";

/* ── Result types ────────────────────────────────────────────────
   Pure calculation results for spellcasting totals and slot maxima.
   Deterministic and independent of Obsidian UI.                    */

/** Grouped spell IDs by level for a specific grant category. */
export type SpellsByLevel = Record<number, ReadonlyArray<EntityId>>;

/** Complete spellcasting calculation result. */
export interface SpellcastingResult {
  /** Maximum spell slots available per level (0-9). */
  slots: SlotRecord;
  /** Known spells grouped by level. Deduplicated by spell ID. */
  knownSpells: SpellsByLevel;
  /** Prepared spells grouped by level. Deduplicated by spell ID. */
  preparedSpells: SpellsByLevel;
  /** Always-prepared spell IDs (deduplicated). */
  alwaysPreparedSpells: ReadonlyArray<EntityId>;
  /** Cantrip spell IDs (deduplicated). */
  cantrips: ReadonlyArray<EntityId>;
  /** Explanation strings showing contributors. */
  explanations: ReadonlyArray<string>;
}

/** Empty spell slot record (populated by slot progression effects). */
export type SlotRecord = Readonly<Record<number, number>>;

/* ── Effect type guards ─────────────────────────────────────────── */

/** Checks if a rule effect is a grant-spell effect. */
function isGrantSpellEffect(
  effect: RuleEffect,
): effect is RuleEffect & GrantSpellEffect {
  return effect.type === "grant-spell";
}

/* ── Grant type discriminator ───────────────────────────────────── */

/** Extracts the grant kind from a SpellGrant. */
function getGrantKind(grant: SpellGrant): "known" | "prepared" | "always-prepared" | "cantrip" {
  return grant.type;
}

/** Extracts the level from a grant that has one. Returns 0 for cantrips. */
function getGrantLevel(grant: SpellGrant): number {
  switch (grant.type) {
    case "known":
    case "prepared":
    case "always-prepared":
      return grant.level;
    case "cantrip":
      return 0;
  }
}

/* ── Main calculation ────────────────────────────────────────────── */

/**
 * Calculates spellcasting totals and slot maxima from character effects.
 *
 * Process:
 * 1. Filter for grant-spell effects
 * 2. Group spells by grant type (known, prepared, always-prepared, cantrip)
 * 3. Deduplicate spells by ID within each group
 * 4. Compute slot maxima (from effects if available)
 * 5. Return structured, deterministic result
 *
 * @param effects - Array of rule effects to process
 * @returns Structured spellcasting result
 */
export function calculateSpellcasting(
  effects: RuleEffect[],
): SpellcastingResult {
  // Accumulators using Sets for deduplication
  const knownSpells: Map<number, Set<EntityId>> = new Map();
  const preparedSpells: Map<number, Set<EntityId>> = new Map();
  const alwaysPreparedSpells = new Set<EntityId>();
  const cantrips = new Set<EntityId>();
  const explanations: string[] = [];

  // Process each grant-spell effect
  for (const effect of effects) {
    if (!isGrantSpellEffect(effect)) {
      continue;
    }

    const { spellId, grant } = effect;
    const kind = getGrantKind(grant);
    const level = getGrantLevel(grant);

    switch (kind) {
      case "known": {
        if (!knownSpells.has(level)) {
          knownSpells.set(level, new Set());
        }
        knownSpells.get(level)!.add(spellId);
        explanations.push(`Spell known: ${spellId} (level ${level})`);
        break;
      }

      case "prepared": {
        if (!preparedSpells.has(level)) {
          preparedSpells.set(level, new Set());
        }
        preparedSpells.get(level)!.add(spellId);
        explanations.push(`Spell prepared: ${spellId} (level ${level})`);
        break;
      }

      case "always-prepared": {
        alwaysPreparedSpells.add(spellId);
        explanations.push(`Spell always prepared: ${spellId} (level ${level})`);
        break;
      }

      case "cantrip": {
        cantrips.add(spellId);
        explanations.push(`Cantrip: ${spellId}`);
        break;
      }
    }
  }

  // Convert known spells map to sorted, frozen record
  const knownSpellsRecord: SpellsByLevel = {};
  const knownLevels = [...knownSpells.keys()].sort((a, b) => a - b);
  for (const level of knownLevels) {
    const spellSet = knownSpells.get(level)!;
    knownSpellsRecord[level] = Object.freeze([...spellSet].sort());
  }

  // Convert prepared spells map to sorted, frozen record
  const preparedSpellsRecord: SpellsByLevel = {};
  const preparedLevels = [...preparedSpells.keys()].sort((a, b) => a - b);
  for (const level of preparedLevels) {
    const spellSet = preparedSpells.get(level)!;
    preparedSpellsRecord[level] = Object.freeze([...spellSet].sort());
  }

  return {
    slots: Object.freeze({}),
    knownSpells: Object.freeze(knownSpellsRecord),
    preparedSpells: Object.freeze(preparedSpellsRecord),
    alwaysPreparedSpells: Object.freeze([...alwaysPreparedSpells].sort()),
    cantrips: Object.freeze([...cantrips].sort()),
    explanations: Object.freeze(explanations),
  };
}
