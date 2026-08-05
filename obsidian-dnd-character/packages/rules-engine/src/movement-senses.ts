import type { Character } from "@obsidian-dnd/character-contract";
import type {
  AddMovementEffect,
  AddSenseEffect,
  SenseDefinition,
  SetMovementEffect,
  MovementMode,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import { isSpeciesRule } from "@obsidian-dnd/catalog-contract";

/* ── Result types ───────────────────────────────────────────────────
   Pure calculation results for movement speeds and sense ranges.
   Deterministic and independent of Obsidian UI.                     */

/** Standard movement modes tracked in results. */
export type MovementKind = "walk" | "climb" | "fly" | "swim";

export const MOVEMENT_KINDS: ReadonlyArray<MovementKind> = [
  "walk",
  "climb",
  "fly",
  "swim",
];

/** Standard sense types tracked in results. */
export type SenseKind = "darkvision" | "blindsight" | "tremorsense" | "truesight";

export const SENSE_KINDS: ReadonlyArray<SenseKind> = [
  "darkvision",
  "blindsight",
  "tremorsense",
  "truesight",
];

/** Per-movement-type speed entry with breakdown. */
export interface MovementEntry {
  /** The movement kind. */
  kind: MovementKind;
  /** The final speed in feet (0 if no movement of this type). */
  speed: number;
  /** Whether this movement type was granted by any effect or species trait. */
  hasMovement: boolean;
}

/** Per-sense-type range entry with breakdown. */
export interface SenseEntry {
  /** The sense kind. */
  kind: SenseKind;
  /** The final range in feet (0 if no sense of this type). */
  range: number;
  /** Whether this sense was granted by any effect or species trait. */
  hasSense: boolean;
}

/** Complete movement and senses calculation result. */
export interface MovementSensesResult {
  /** Per-movement-type entries in deterministic order. */
  movement: ReadonlyArray<MovementEntry>;
  /** Per-sense-type entries in deterministic order. */
  senses: ReadonlyArray<SenseEntry>;
}

/* ── Effect type guards ────────────────────────────────────────────── */

function isAddMovementEffect(
  effect: unknown,
): effect is AddMovementEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    (effect as Record<string, unknown>).type === "add-movement"
  );
}

function isSetMovementEffect(
  effect: unknown,
): effect is SetMovementEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    (effect as Record<string, unknown>).type === "set-movement"
  );
}

function isAddSenseEffect(
  effect: unknown,
): effect is AddSenseEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    (effect as Record<string, unknown>).type === "add-sense"
  );
}

/* ── Sense kind extraction ─────────────────────────────────────────── */

/**
 * Maps a SenseDefinition's type to a SenseKind if it's a standard sense.
 * Returns undefined for generic or unknown sense types.
 */
function senseKindFromDefinition(sense: SenseDefinition): SenseKind | undefined {
  switch (sense.type) {
    case "darkvision":
      return "darkvision";
    case "blindsense":
      return "blindsight";
    case "tremorsense":
      return "tremorsense";
    case "truesight":
      return "truesight";
    case "generic":
      return undefined;
  }
}

/* ── Movement mode mapping ─────────────────────────────────────────── */

/**
 * Maps a MovementMode to a MovementKind if it's tracked.
 * Returns undefined for untracked modes (e.g. "burrow").
 */
function movementKindFromMode(mode: MovementMode): MovementKind | undefined {
  if (mode === "walk" || mode === "climb" || mode === "fly" || mode === "swim") {
    return mode;
  }
  return undefined;
}

/* ── Main calculation ──────────────────────────────────────────────── */

/**
 * Calculates movement speeds and sense ranges for a character.
 *
 * Process:
 * 1. Extract walk speed from species base speed (if species exists)
 * 2. Extract darkvision range from species (if species has darkvision)
 * 3. Collect all rule effects via collectEffects
 * 4. Apply add-movement effects (add value to existing or create new speed)
 * 5. Apply set-movement effects (set speed to exact value)
 * 6. Apply add-sense effects (accumulate, taking max for same kind)
 * 7. Return structured result with movement and sense breakdowns
 *
 * Movement modifications apply in collection order. Set-movement
 * overrides any prior additions for that movement type.
 *
 * Multiple senses of the same kind take the maximum range.
 *
 * @param character - The character document
 * @param catalog - The catalog lookup for resolving entity effects
 * @returns Structured result with movement and sense breakdowns
 */
export function calculateMovementSenses(
  character: Character,
  catalog: CatalogLookup,
): MovementSensesResult {
  // Movement speeds keyed by kind
  const movementSpeeds: Record<MovementKind, number> = {
    walk: 0,
    climb: 0,
    fly: 0,
    swim: 0,
  };

  // Track which movement types have been granted
  const movementGranted: Record<MovementKind, boolean> = {
    walk: false,
    climb: false,
    fly: false,
    swim: false,
  };

  // Sense ranges keyed by kind
  const senseRanges: Record<SenseKind, number> = {
    darkvision: 0,
    blindsight: 0,
    tremorsense: 0,
    truesight: 0,
  };

  // Track which senses have been granted
  const senseGranted: Record<SenseKind, boolean> = {
    darkvision: false,
    blindsight: false,
    tremorsense: false,
    truesight: false,
  };

  // 1. Extract species base speed and darkvision
  const speciesId = character.origins.speciesId;
  const species = speciesId ? catalog.getSpecies(speciesId) : undefined;

  if (species && isSpeciesRule(species)) {
    movementSpeeds.walk = species.speed;
    movementGranted.walk = true;

    if (species.darkvision && species.darkvisionRange !== undefined) {
      senseRanges.darkvision = species.darkvisionRange;
      senseGranted.darkvision = true;
    }
  }

  // 2. Collect and process all rule effects
  const collected = collectEffects(character, catalog);

  for (const ce of collected) {
    const effect = ce.effect;

    // Process add-movement effects (additive)
    if (isAddMovementEffect(effect)) {
      const kind = movementKindFromMode(effect.mode);
      if (kind !== undefined) {
        movementSpeeds[kind] += effect.value;
        movementGranted[kind] = true;
      }
    }

    // Process set-movement effects (override)
    if (isSetMovementEffect(effect)) {
      const kind = movementKindFromMode(effect.mode);
      if (kind !== undefined) {
        movementSpeeds[kind] = effect.value;
        movementGranted[kind] = true;
      }
    }

    // Process add-sense effects (max accumulation)
    if (isAddSenseEffect(effect)) {
      const kind = senseKindFromDefinition(effect.sense);
      if (kind !== undefined) {
        const range = effect.sense.range;
        if (range > senseRanges[kind]) {
          senseRanges[kind] = range;
        }
        senseGranted[kind] = true;
      }
    }
  }

  // 3. Build result arrays in deterministic order
  const movement: MovementEntry[] = [];
  for (const kind of MOVEMENT_KINDS) {
    movement.push({
      kind,
      speed: movementSpeeds[kind],
      hasMovement: movementGranted[kind],
    });
  }

  const senses: SenseEntry[] = [];
  for (const kind of SENSE_KINDS) {
    senses.push({
      kind,
      range: senseRanges[kind],
      hasSense: senseGranted[kind],
    });
  }

  return {
    movement: Object.freeze(movement),
    senses: Object.freeze(senses),
  };
}
