import type {
  Ability,
  EntityId,
} from "@obsidian-dnd/domain";
import {
  isAbility,
  isEntityId,
} from "@obsidian-dnd/domain";

/* ── Character ability state ───────────────────────────────────── */

export interface CharacterAbilityState {
  scores: Record<Ability, number>;
}

export function isCharacterAbilityState(value: unknown): value is CharacterAbilityState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.scores !== "object" || obj.scores === null || Array.isArray(obj.scores)) {
    return false;
  }
  for (const [key, val] of Object.entries(obj.scores)) {
    if (!isAbility(key)) return false;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 1) return false;
  }

  return true;
}

/* ── Character overrides ───────────────────────────────────────── */

export interface CharacterOverrides {
  abilityScores?: Record<Ability, number>;
}

export function isCharacterOverrides(value: unknown): value is CharacterOverrides {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.abilityScores !== undefined) {
    if (typeof obj.abilityScores !== "object" || obj.abilityScores === null || Array.isArray(obj.abilityScores)) {
      return false;
    }
    for (const [key, val] of Object.entries(obj.abilityScores)) {
      if (!isAbility(key)) return false;
      if (typeof val !== "number" || !Number.isInteger(val) || val < 1) return false;
    }
  }

  return true;
}

/* ── Character resource state ──────────────────────────────────── */

export interface CharacterResourceState {
  currentHp: number;
  temporaryHp: number;
  deathSaves: { successes: number; failures: number };
  hitDiceUsed: Record<string, number>;
  featureUses: Record<string, number>;
  conditions: EntityId[];
}

export function isCharacterResourceState(value: unknown): value is CharacterResourceState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.currentHp !== "number" || !Number.isInteger(obj.currentHp) || obj.currentHp < 0) return false;
  if (typeof obj.temporaryHp !== "number" || !Number.isInteger(obj.temporaryHp) || obj.temporaryHp < 0) return false;

  if (typeof obj.deathSaves !== "object" || obj.deathSaves === null || Array.isArray(obj.deathSaves)) return false;
  const ds = obj.deathSaves as Record<string, unknown>;
  if (typeof ds.successes !== "number" || !Number.isInteger(ds.successes) || ds.successes < 0 || ds.successes > 3) return false;
  if (typeof ds.failures !== "number" || !Number.isInteger(ds.failures) || ds.failures < 0 || ds.failures > 3) return false;

  if (typeof obj.hitDiceUsed !== "object" || obj.hitDiceUsed === null || Array.isArray(obj.hitDiceUsed)) return false;
  for (const [key, val] of Object.entries(obj.hitDiceUsed)) {
    if (typeof key !== "string") return false;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) return false;
  }

  if (typeof obj.featureUses !== "object" || obj.featureUses === null || Array.isArray(obj.featureUses)) return false;
  for (const [key, val] of Object.entries(obj.featureUses)) {
    if (typeof key !== "string") return false;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) return false;
  }

  if (!Array.isArray(obj.conditions)) return false;
  if (!obj.conditions.every((c: unknown) => isEntityId(c))) return false;

  return true;
}

export function createCharacterResourceState(
  props: {
    currentHp: number;
    temporaryHp: number;
    deathSaves: { successes: number; failures: number };
    hitDiceUsed: Record<string, number>;
    featureUses: Record<string, number>;
    conditions: EntityId[];
  },
): CharacterResourceState {
  return {
    currentHp: props.currentHp,
    temporaryHp: props.temporaryHp,
    deathSaves: { ...props.deathSaves },
    hitDiceUsed: { ...props.hitDiceUsed },
    featureUses: { ...props.featureUses },
    conditions: [...props.conditions],
  };
}
