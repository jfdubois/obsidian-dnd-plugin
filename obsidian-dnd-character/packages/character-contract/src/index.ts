/* ── Character runtime schema ─────────────────────────────────────
   Public API for the character contract package.                   */

/* Schema version */
export {
  CHARACTER_SCHEMA_VERSION,
  type CharacterSchemaVersion,
  isSupportedCharacterSchemaVersion,
} from "./schema-version";

/* Identity */
export {
  type CharacterIdentity,
  isCharacterIdentity,
  createCharacterIdentity,
} from "./character-identity";

/* Catalog reference */
export {
  type CharacterCatalogReference,
  isCharacterCatalogReference,
  createCharacterCatalogReference,
} from "./character-catalog";

/* Class state */
export {
  type HitPointIncrease,
  type CharacterClassState,
  isCharacterClassState,
  createCharacterClassState,
} from "./character-class-state";

/* Choice state */
export {
  type CharacterChoice,
  type CharacterChoiceSelectedValue,
  type AbilityAllocationSelection,
  isCharacterChoice,
  isCharacterChoiceSelectedValue,
  createCharacterChoice,
} from "./character-choice";

/* Spell state */
export {
  type SpellAcquisition,
  type CharacterSpellSelection,
  type CharacterSpellState,
  isCharacterSpellState,
  createCharacterSpellState,
} from "./character-spell";

/* Inventory state */
export {
  type ItemInstanceOverrides,
  type InventoryItemInstance,
  type CatalogInventoryItemInstance,
  type NamedInventoryItemInstance,
  isInventoryItemInstance,
} from "./character-inventory";

export {
  type CharacterCurrencyState,
  EMPTY_CHARACTER_CURRENCY,
  isCharacterCurrencyState,
} from "./character-currency";

/* Resource, ability, and override state */
export {
  type CharacterAbilityState,
  isCharacterAbilityState,
  type CharacterOverrides,
  isCharacterOverrides,
  type CharacterResourceState,
  isCharacterResourceState,
  createCharacterResourceState,
} from "./character-resource";

/* Top-level character */
export {
  type Character,
  isCharacter,
  createCharacter,
} from "./character";

/* Serialization */
export {
  serializeCharacter,
  deserializeCharacter,
  CharacterSerializationError,
  type CharacterSerializationErrorReason,
} from "./character-serializer";

/* Schema migrations */
export {
  type CharacterSchemaMigration,
  MIGRATION_REGISTRY,
  CharacterMigrationError,
  type CharacterMigrationErrorReason,
  migrateCharacter,
} from "./character-migration";
