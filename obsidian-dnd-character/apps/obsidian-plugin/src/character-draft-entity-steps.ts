/* ── Character draft: entity-selection step data ─────────────────
   Covers: ruleset, sources, identity, species, species-choices,
   background, background-choices, class, class-starting-grants.  */

import type {
  EntityId,
  SourceId,
  ChoiceInstanceId,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isSourceId,
} from "@obsidian-dnd/domain";
import type { Ruleset } from "@obsidian-dnd/domain";
import { isRuleset } from "@obsidian-dnd/domain";
import type { SourceProfileOrigin } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { isCharacterChoice } from "@obsidian-dnd/character-contract";

/* ── Step identifiers ──────────────────────────────────────────── */

export type DraftStep =
  | "ruleset"
  | "sources"
  | "identity"
  | "species"
  | "species-choices"
  | "background"
  | "background-choices"
  | "class"
  | "class-starting-grants"
  | "abilities"
  | "proficiencies"
  | "languages"
  | "equipment"
  | "spell-eligibility"
  | "spells"
  | "review";

export const ALL_DRAFT_STEPS: ReadonlyArray<DraftStep> = [
  "ruleset",
  "sources",
  "identity",
  "species",
  "species-choices",
  "background",
  "background-choices",
  "class",
  "class-starting-grants",
  "abilities",
  "proficiencies",
  "languages",
  "equipment",
  "spell-eligibility",
  "spells",
  "review",
];

export function isDraftStep(value: unknown): value is DraftStep {
  return ALL_DRAFT_STEPS.includes(value as DraftStep);
}

/* ── Ruleset step ──────────────────────────────────────────────── */

export interface DraftRulesetData {
  ruleset: Ruleset | null;
}

export function isDraftRulesetData(value: unknown): value is DraftRulesetData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.ruleset === null || isRuleset(obj.ruleset);
}

export function createEmptyDraftRulesetData(): DraftRulesetData {
  return { ruleset: null };
}

/* ── Source step ───────────────────────────────────────────────── */

export interface DraftSourceData {
  enabledSourceIds: SourceId[];
  sourceProfileOrigin?: SourceProfileOrigin;
}

function isSourceProfileOrigin(value: unknown): value is SourceProfileOrigin {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.profileId === "string" &&
    typeof obj.profileRevision === "number" &&
    Number.isFinite(obj.profileRevision) &&
    obj.profileRevision >= 0
  );
}

export function isDraftSourceData(value: unknown): value is DraftSourceData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.enabledSourceIds)) return false;
  if (!obj.enabledSourceIds.every((id) => isSourceId(id))) return false;
  if (obj.sourceProfileOrigin !== undefined && !isSourceProfileOrigin(obj.sourceProfileOrigin)) {
    return false;
  }
  return true;
}

export function createEmptyDraftSourceData(): DraftSourceData {
  return { enabledSourceIds: [] };
}

/* ── Identity step ─────────────────────────────────────────────── */

export interface DraftIdentityData {
  name: string;
  playerName?: string;
  pronouns?: string;
  alignment?: string;
}

export function isDraftIdentityData(value: unknown): value is DraftIdentityData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (obj.playerName !== undefined && typeof obj.playerName !== "string") return false;
  if (obj.pronouns !== undefined && typeof obj.pronouns !== "string") return false;
  if (obj.alignment !== undefined && typeof obj.alignment !== "string") return false;
  return true;
}

export function createEmptyDraftIdentityData(): DraftIdentityData {
  return { name: "" };
}

/* ── Species step ──────────────────────────────────────────────── */

export interface DraftSpeciesData {
  speciesId: EntityId | null;
}

export function isDraftSpeciesData(value: unknown): value is DraftSpeciesData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.speciesId === null || isEntityId(obj.speciesId);
}

export function createEmptyDraftSpeciesData(): DraftSpeciesData {
  return { speciesId: null };
}

/* ── Species choices step ──────────────────────────────────────── */

export interface DraftSpeciesChoiceData {
  choices: Record<ChoiceInstanceId, CharacterChoice>;
}

export function isDraftSpeciesChoiceData(value: unknown): value is DraftSpeciesChoiceData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.choices !== "object" || obj.choices === null || Array.isArray(obj.choices)) {
    return false;
  }
  for (const [, val] of Object.entries(obj.choices)) {
    if (!isCharacterChoice(val)) return false;
  }
  return true;
}

export function createEmptyDraftSpeciesChoiceData(): DraftSpeciesChoiceData {
  return { choices: {} };
}

/* ── Background step ───────────────────────────────────────────── */

export interface DraftBackgroundData {
  backgroundId: EntityId | null;
}

export function isDraftBackgroundData(value: unknown): value is DraftBackgroundData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.backgroundId === null || isEntityId(obj.backgroundId);
}

export function createEmptyDraftBackgroundData(): DraftBackgroundData {
  return { backgroundId: null };
}

/* ── Background choices step ───────────────────────────────────── */

export interface DraftBackgroundChoiceData {
  choices: Record<ChoiceInstanceId, CharacterChoice>;
}

export function isDraftBackgroundChoiceData(value: unknown): value is DraftBackgroundChoiceData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.choices !== "object" || obj.choices === null || Array.isArray(obj.choices)) {
    return false;
  }
  for (const [, val] of Object.entries(obj.choices)) {
    if (!isCharacterChoice(val)) return false;
  }
  return true;
}

export function createEmptyDraftBackgroundChoiceData(): DraftBackgroundChoiceData {
  return { choices: {} };
}

/* ── Class step ────────────────────────────────────────────────── */

export interface DraftClassData {
  classId: EntityId | null;
  subclassId?: EntityId | null;
}

export function isDraftClassData(value: unknown): value is DraftClassData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.classId !== null && !isEntityId(obj.classId)) return false;
  if (obj.subclassId !== undefined && obj.subclassId !== null && !isEntityId(obj.subclassId)) {
    return false;
  }
  return true;
}

export function createEmptyDraftClassData(): DraftClassData {
  return { classId: null };
}

/* ── Class starting grants step ────────────────────────────────── */

export interface DraftClassGrantData {
  choices: Record<ChoiceInstanceId, CharacterChoice>;
}

export function isDraftClassGrantData(value: unknown): value is DraftClassGrantData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.choices !== "object" || obj.choices === null || Array.isArray(obj.choices)) {
    return false;
  }
  for (const [, val] of Object.entries(obj.choices)) {
    if (!isCharacterChoice(val)) return false;
  }
  return true;
}

export function createEmptyDraftClassGrantData(): DraftClassGrantData {
  return { choices: {} };
}
