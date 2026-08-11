import type {
  CharacterId,
  EntityId,
  ChoiceInstanceId,
} from "@obsidian-dnd/domain";
import type { CharacterContentPolicy } from "@obsidian-dnd/domain";
import {
  isCharacterId,
  isEntityId,
  isChoiceInstanceId,
} from "@obsidian-dnd/domain";
import { isCharacterContentPolicy } from "@obsidian-dnd/domain";

import { CHARACTER_SCHEMA_VERSION } from "./schema-version";
import type { CharacterSchemaVersion } from "./schema-version";
import { isSupportedCharacterSchemaVersion } from "./schema-version";

import type { CharacterIdentity } from "./character-identity";
import { isCharacterIdentity } from "./character-identity";

import type { CharacterCatalogReference } from "./character-catalog";
import { isCharacterCatalogReference } from "./character-catalog";

import type { CharacterClassState } from "./character-class-state";
import { isCharacterClassState } from "./character-class-state";

import type { CharacterChoice } from "./character-choice";
import { isCharacterChoice } from "./character-choice";

import type { CharacterAbilityState } from "./character-resource";
import { isCharacterAbilityState } from "./character-resource";

import type { CharacterSpellState } from "./character-spell";
import { isCharacterSpellState } from "./character-spell";

import type { InventoryItemInstance } from "./character-inventory";
import { isInventoryItemInstance } from "./character-inventory";

import type { CharacterCurrencyState } from "./character-currency";
import { EMPTY_CHARACTER_CURRENCY, isCharacterCurrencyState } from "./character-currency";

import type { CharacterResourceState } from "./character-resource";
import { isCharacterResourceState } from "./character-resource";

import type { CharacterOverrides } from "./character-resource";
import { isCharacterOverrides } from "./character-resource";

/* ── Character document ──────────────────────────────────────────
   Top-level persisted character state. Matches the CharacterDocument
   interface defined in the data contracts.                        */

export interface Character {
  schemaVersion: CharacterSchemaVersion;
  id: CharacterId;
  catalog: CharacterCatalogReference;
  contentPolicy: CharacterContentPolicy;
  identity: CharacterIdentity;
  progression: {
    classes: CharacterClassState[];
    experiencePoints?: number;
  };
  origins: {
    speciesId: EntityId;
    backgroundId: EntityId;
  };
  selections: Record<ChoiceInstanceId, CharacterChoice>;
  abilities: CharacterAbilityState;
  spells: CharacterSpellState;
  inventory: InventoryItemInstance[];
  currency: CharacterCurrencyState;
  resources: CharacterResourceState;
  overrides: CharacterOverrides;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isCharacter(value: unknown): value is Character {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isSupportedCharacterSchemaVersion(obj.schemaVersion)) return false;
  if (!isCharacterId(obj.id)) return false;
  if (!isCharacterCatalogReference(obj.catalog)) return false;
  if (!isCharacterContentPolicy(obj.contentPolicy)) return false;
  if (!isCharacterIdentity(obj.identity)) return false;

  /* progression */
  if (typeof obj.progression !== "object" || obj.progression === null) return false;
  const prog = obj.progression as Record<string, unknown>;
  if (!Array.isArray(prog.classes)) return false;
  if (!prog.classes.every((c: unknown) => isCharacterClassState(c))) return false;
  if (prog.experiencePoints !== undefined && (typeof prog.experiencePoints !== "number" || !Number.isInteger(prog.experiencePoints) || prog.experiencePoints < 0)) {
    return false;
  }

  /* origins */
  if (typeof obj.origins !== "object" || obj.origins === null) return false;
  const orig = obj.origins as Record<string, unknown>;
  if (!isEntityId(orig.speciesId)) return false;
  if (!isEntityId(orig.backgroundId)) return false;

  /* selections */
  if (typeof obj.selections !== "object" || obj.selections === null || Array.isArray(obj.selections)) return false;
  for (const [key, val] of Object.entries(obj.selections)) {
    if (!isChoiceInstanceId(key)) return false;
    if (!isCharacterChoice(val)) return false;
  }

  if (!isCharacterAbilityState(obj.abilities)) return false;
  if (!isCharacterSpellState(obj.spells)) return false;
  if (!Array.isArray(obj.inventory)) return false;
  if (!obj.inventory.every((i: unknown) => isInventoryItemInstance(i))) return false;
  if (!isCharacterCurrencyState(obj.currency)) return false;
  if (!isCharacterResourceState(obj.resources)) return false;
  if (!isCharacterOverrides(obj.overrides)) return false;

  /* metadata */
  if (typeof obj.metadata !== "object" || obj.metadata === null) return false;
  const meta = obj.metadata as Record<string, unknown>;
  if (typeof meta.createdAt !== "string" || meta.createdAt.length === 0) return false;
  if (typeof meta.updatedAt !== "string" || meta.updatedAt.length === 0) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createCharacter(
  props: {
    id: CharacterId;
    catalog: CharacterCatalogReference;
    contentPolicy: CharacterContentPolicy;
    identity: CharacterIdentity;
    progression: {
      classes: CharacterClassState[];
      experiencePoints?: number;
    };
    origins: {
      speciesId: EntityId;
      backgroundId: EntityId;
    };
    selections: Record<ChoiceInstanceId, CharacterChoice>;
    abilities: CharacterAbilityState;
    spells: CharacterSpellState;
    inventory: InventoryItemInstance[];
    currency?: CharacterCurrencyState;
    resources: CharacterResourceState;
    overrides: CharacterOverrides;
    metadata: {
      createdAt: string;
      updatedAt: string;
    };
  },
): Character {
  return {
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    id: props.id,
    catalog: props.catalog,
    contentPolicy: props.contentPolicy,
    identity: props.identity,
    progression: {
      classes: [...props.progression.classes],
      experiencePoints: props.progression.experiencePoints,
    },
    origins: { ...props.origins },
    selections: { ...props.selections },
    abilities: props.abilities,
    spells: props.spells,
    inventory: [...props.inventory],
    currency: props.currency ? { ...props.currency } : { ...EMPTY_CHARACTER_CURRENCY },
    resources: props.resources,
    overrides: props.overrides,
    metadata: { ...props.metadata },
  };
}
