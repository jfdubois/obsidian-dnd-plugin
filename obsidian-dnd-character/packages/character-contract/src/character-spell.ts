import type {
  EntityId,
  ClassInstanceId,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isClassInstanceId,
} from "@obsidian-dnd/domain";

/* ── Character spell selection ─────────────────────────────────── */

export type SpellAcquisition =
  | "known"
  | "prepared"
  | "always-prepared"
  | "species"
  | "background"
  | "feat"
  | "item";

export interface CharacterSpellSelection {
  spellId: EntityId;
  classInstanceId?: ClassInstanceId;
  originGrantId?: EntityId;
  acquisition: SpellAcquisition;
}

function isSpellAcquisition(value: unknown): value is SpellAcquisition {
  return (
    typeof value === "string" &&
    (value === "known" ||
      value === "prepared" ||
      value === "always-prepared" ||
      value === "species" ||
      value === "background" ||
      value === "feat" ||
      value === "item")
  );
}

function isCharacterSpellSelection(value: unknown): value is CharacterSpellSelection {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.spellId)) return false;
  if (obj.classInstanceId !== undefined && !isClassInstanceId(obj.classInstanceId)) return false;
  if (obj.originGrantId !== undefined && !isEntityId(obj.originGrantId)) return false;
  if (!isSpellAcquisition(obj.acquisition)) return false;

  return true;
}

/* ── Character spell state ─────────────────────────────────────── */

export interface CharacterSpellState {
  selections: CharacterSpellSelection[];
  spellSlotsUsed: Record<number, number>;
  pactSlotsUsed?: number;
}

export function isCharacterSpellState(value: unknown): value is CharacterSpellState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.selections)) return false;
  if (!obj.selections.every((s: unknown) => isCharacterSpellSelection(s))) return false;

  if (typeof obj.spellSlotsUsed !== "object" || obj.spellSlotsUsed === null || Array.isArray(obj.spellSlotsUsed)) {
    return false;
  }
  for (const [key, val] of Object.entries(obj.spellSlotsUsed)) {
    if (typeof key !== "string") return false;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) return false;
  }

  if (obj.pactSlotsUsed !== undefined && (typeof obj.pactSlotsUsed !== "number" || !Number.isInteger(obj.pactSlotsUsed) || obj.pactSlotsUsed < 0)) {
    return false;
  }

  return true;
}

export function createCharacterSpellState(
  props: {
    selections: CharacterSpellSelection[];
    spellSlotsUsed: Record<number, number>;
    pactSlotsUsed?: number;
  },
): CharacterSpellState {
  return {
    selections: [...props.selections],
    spellSlotsUsed: { ...props.spellSlotsUsed },
    pactSlotsUsed: props.pactSlotsUsed,
  };
}
