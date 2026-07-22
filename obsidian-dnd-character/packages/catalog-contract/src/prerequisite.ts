import type { EntityId } from "@obsidian-dnd/domain";
import { isAbility, isEntityId } from "@obsidian-dnd/domain";
import type { Ability } from "@obsidian-dnd/domain";

/* ── Prerequisites ──────────────────────────────────────────────
   Normalized prerequisite structures that constrain when an entity
   or choice may be selected. The plugin evaluates these against
   current character state to determine eligibility.              */

export type RulePrerequisite =
  | AbilityScorePrerequisite
  | LevelPrerequisite
  | EntitySelectionPrerequisite;

export interface AbilityScorePrerequisite {
  type: "ability-score";
  ability: Ability;
  minimumValue: number;
}

export interface LevelPrerequisite {
  type: "level";
  minimumLevel: number;
}

export interface EntitySelectionPrerequisite {
  type: "entity-selection";
  entityId: EntityId;
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isRulePrerequisite(value: unknown): value is RulePrerequisite {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "ability-score": {
      if (!isAbility(obj.ability)) return false;
      if (typeof obj.minimumValue !== "number") return false;
      if (!Number.isFinite(obj.minimumValue)) return false;
      if (obj.minimumValue < 1) return false;
      return true;
    }
    case "level": {
      if (typeof obj.minimumLevel !== "number") return false;
      if (!Number.isFinite(obj.minimumLevel)) return false;
      if (obj.minimumLevel < 1) return false;
      return true;
    }
    case "entity-selection": {
      if (!isEntityId(obj.entityId)) return false;
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createAbilityScorePrerequisite(
  ability: Ability,
  minimumValue: number,
): AbilityScorePrerequisite {
  return { type: "ability-score", ability, minimumValue };
}

export function createLevelPrerequisite(minimumLevel: number): LevelPrerequisite {
  return { type: "level", minimumLevel };
}

export function createEntitySelectionPrerequisite(entityId: EntityId): EntitySelectionPrerequisite {
  return { type: "entity-selection", entityId };
}
