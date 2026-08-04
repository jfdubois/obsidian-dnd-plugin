import type {
  EntityId,
  ClassInstanceId,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isClassInstanceId,
} from "@obsidian-dnd/domain";

/* ── Hit point increase ────────────────────────────────────────── */

export interface HitPointIncrease {
  level: number;
  rollOrMax: number;
  isMaximized: boolean;
}

function isHitPointIncrease(value: unknown): value is HitPointIncrease {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.level === "number" &&
    Number.isInteger(obj.level) &&
    obj.level >= 1 &&
    typeof obj.rollOrMax === "number" &&
    Number.isInteger(obj.rollOrMax) &&
    obj.rollOrMax >= 1 &&
    typeof obj.isMaximized === "boolean"
  );
}

/* ── Character class state ─────────────────────────────────────── */

export interface CharacterClassState {
  instanceId: ClassInstanceId;
  classId: EntityId;
  level: number;
  isStartingClass: boolean;
  subclassId?: EntityId;
  hitPointIncreases: HitPointIncrease[];
}

export function isCharacterClassState(value: unknown): value is CharacterClassState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isClassInstanceId(obj.instanceId)) return false;
  if (!isEntityId(obj.classId)) return false;
  if (typeof obj.level !== "number" || !Number.isInteger(obj.level) || obj.level < 1) return false;
  if (typeof obj.isStartingClass !== "boolean") return false;
  if (obj.subclassId !== undefined && !isEntityId(obj.subclassId)) return false;
  if (!Array.isArray(obj.hitPointIncreases)) return false;
  if (!obj.hitPointIncreases.every((h: unknown) => isHitPointIncrease(h))) return false;

  return true;
}

export function createCharacterClassState(
  props: {
    instanceId: ClassInstanceId;
    classId: EntityId;
    level: number;
    isStartingClass: boolean;
    subclassId?: EntityId;
    hitPointIncreases: HitPointIncrease[];
  },
): CharacterClassState {
  return {
    instanceId: props.instanceId,
    classId: props.classId,
    level: props.level,
    isStartingClass: props.isStartingClass,
    subclassId: props.subclassId,
    hitPointIncreases: [...props.hitPointIncreases],
  };
}
