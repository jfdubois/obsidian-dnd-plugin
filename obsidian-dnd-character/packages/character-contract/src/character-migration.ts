/**
 * Schema migration framework for persisted character state.
 *
 * Provides a deterministic migration pipeline that transforms
 * raw serialized character data from any known schema version
 * to the current version. Each migration step transforms from
 * version N to version N+1.
 *
 * The framework is designed to work alongside the serializer:
 * deserializeCharacter parses JSON, runs the migration pipeline,
 * then validates the migrated result against the current schema.
 */

import { CHARACTER_SCHEMA_VERSION } from "./schema-version";
import { isChoiceDefinitionId, isChoiceInstanceId, isEntityId, isItemInstanceId } from "@obsidian-dnd/domain";

/* ── Migration step type ───────────────────────────────────────── */

/**
 * A single migration step that transforms character data from one
 * schema version to the next consecutive version.
 *
 * Each step must be deterministic and idempotent. The migrate
 * function receives the raw data at fromVersion and must return
 * data conforming to toVersion.
 */
export interface CharacterSchemaMigration {
  /** The schema version this migration reads from. */
  fromVersion: number;
  /** The schema version this migration produces (must be fromVersion + 1). */
  toVersion: number;
  /** Transforms data from fromVersion to toVersion. */
  migrate: (data: unknown) => unknown;
}

/* ── Migration registry ────────────────────────────────────────── */

/**
 * Ordered registry of all known character schema migrations.
 *
 * Migrations must be listed in ascending fromVersion order.
 * Each migration transforms exactly one version step (N -> N+1).
 *
 * The v1 to v2 migration introduces typed choice selections,
 * discriminated inventory, and currency balances.
 */
function migrateLegacyChoice(value: unknown): unknown {
  if (typeof value !== "object" || value === null) throw new Error("legacy choice must be an object");
  const choice = value as Record<string, unknown>;
  if (!isChoiceInstanceId(choice.instanceId) || !isChoiceDefinitionId(choice.definitionId) || !isEntityId(choice.originGrantId)
    || !Array.isArray(choice.selectedOptionIds) || !choice.selectedOptionIds.every(isEntityId)) {
    throw new Error("legacy choice has invalid identity or selectedOptionIds");
  }
  return { instanceId: choice.instanceId, definitionId: choice.definitionId, originGrantId: choice.originGrantId,
    selectedValue: { type: "entity-ids", entityIds: [...choice.selectedOptionIds] } };
}

function migrateLegacyInventoryItem(value: unknown): unknown {
  if (typeof value !== "object" || value === null) throw new Error("legacy inventory item must be an object");
  const item = value as Record<string, unknown>;
  if (!isItemInstanceId(item.instanceId) || !isEntityId(item.itemId) || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 0
    || typeof item.equipped !== "boolean" || typeof item.attuned !== "boolean") throw new Error("legacy inventory item is invalid");
  return { ...item, type: "catalog-item" };
}

export const MIGRATION_REGISTRY: ReadonlyArray<CharacterSchemaMigration> = [{
  fromVersion: 1,
  toVersion: 2,
  migrate: (data: unknown): unknown => {
    if (typeof data !== "object" || data === null) throw new Error("legacy character must be an object");
    const character = data as Record<string, unknown>;
    let selections = character.selections;
    if (selections !== undefined) {
      if (typeof selections !== "object" || selections === null || Array.isArray(selections)) throw new Error("legacy selections must be a record");
      selections = Object.fromEntries(Object.entries(selections).map(([id, choice]) => {
        if (!isChoiceInstanceId(id)) throw new Error("legacy selection key is invalid");
        return [id, migrateLegacyChoice(choice)];
      }));
    }
    let inventory = character.inventory;
    if (inventory !== undefined) {
      if (!Array.isArray(inventory)) throw new Error("legacy inventory must be an array");
      inventory = inventory.map(migrateLegacyInventoryItem);
    }
    return { ...character, schemaVersion: 2, ...(selections === undefined ? {} : { selections }),
      ...(inventory === undefined ? {} : { inventory }), currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } };
  },
}];

/* ── Migration errors ──────────────────────────────────────────── */

/** Specific failure reasons for character schema migration. */
export type CharacterMigrationErrorReason =
  /** The input has no schemaVersion field or it is not a number. */
  | "missing-schema-version"
  /** The schema version is older than any known migration can handle. */
  | "unsupported-old-version"
  /** The schema version is newer than the current schema version. */
  | "unsupported-future-version"
  /** A migration step threw or produced invalid output. */
  | "migration-failed";

/**
 * Error thrown when character schema migration fails.
 *
 * Includes the reason code, version context (from/to),
 * and the original error cause for actionable diagnostics.
 */
export class CharacterMigrationError extends Error {
  public readonly reason: CharacterMigrationErrorReason;
  public readonly fromVersion: number | null;
  public readonly toVersion: number | null;
  public readonly cause: unknown;

  public constructor(options: {
    reason: CharacterMigrationErrorReason;
    message: string;
    fromVersion?: number | null;
    toVersion?: number | null;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "CharacterMigrationError";
    this.reason = options.reason;
    this.fromVersion = options.fromVersion ?? null;
    this.toVersion = options.toVersion ?? null;
    this.cause = options.cause;
  }
}

/* ── Internal helpers ──────────────────────────────────────────── */

/**
 * Extract the schema version from raw data, or null if not present.
 */
function extractSchemaVersion(data: unknown): number | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") {
    return null;
  }
  return obj.schemaVersion;
}

/**
 * Find the migration that transforms from the given version.
 * Returns undefined if no migration exists for that version.
 */
function findMigration(fromVersion: number): CharacterSchemaMigration | undefined {
  return MIGRATION_REGISTRY.find(
    (m) => m.fromVersion === fromVersion,
  );
}

/* ── Migration pipeline ────────────────────────────────────────── */

/**
 * Migrate raw character data to the current schema version.
 *
 * Applies migration steps sequentially from the input version
 * up to the target version. If the input is already at the
 * target version, returns the data unchanged.
 *
 * @param raw - The raw parsed character data (from JSON.parse).
 * @param targetVersion - The desired output schema version
 *        (defaults to CHARACTER_SCHEMA_VERSION).
 * @returns The migrated character data as unknown.
 * @throws CharacterMigrationError if migration cannot proceed.
 */
export function migrateCharacter(
  raw: unknown,
  targetVersion: number = CHARACTER_SCHEMA_VERSION,
): unknown {
  /* Extract and validate the input version. */
  const inputVersion = extractSchemaVersion(raw);
  if (inputVersion === null) {
    throw new CharacterMigrationError({
      reason: "missing-schema-version",
      message: "Character data is missing a valid schemaVersion field",
    });
  }

  /* No-op if already at target version. */
  if (inputVersion === targetVersion) {
    return raw;
  }

  /* Reject future versions. */
  if (inputVersion > targetVersion) {
    throw new CharacterMigrationError({
      reason: "unsupported-future-version",
      message: `Character schema version ${inputVersion} is newer than the supported version ${targetVersion}`,
      fromVersion: inputVersion,
      toVersion: targetVersion,
    });
  }

  /* Check that we have a migration path from the input version. */
  if (inputVersion < targetVersion) {
    const firstMigration = findMigration(inputVersion);
    if (firstMigration === undefined) {
      throw new CharacterMigrationError({
        reason: "unsupported-old-version",
        message: `No migration exists from schema version ${inputVersion} to ${targetVersion}`,
        fromVersion: inputVersion,
        toVersion: targetVersion,
      });
    }
  }

  /* Apply migrations sequentially. */
  let current: unknown = raw;
  let currentVersion = inputVersion;

  while (currentVersion < targetVersion) {
    const migration = findMigration(currentVersion);
    if (migration === undefined) {
      throw new CharacterMigrationError({
        reason: "unsupported-old-version",
        message: `Migration chain broken: no migration from version ${currentVersion} to ${targetVersion}`,
        fromVersion: currentVersion,
        toVersion: targetVersion,
      });
    }

    try {
      current = migration.migrate(current);
    } catch (cause) {
      throw new CharacterMigrationError({
        reason: "migration-failed",
        message: `Migration from version ${currentVersion} to ${migration.toVersion} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        fromVersion: currentVersion,
        toVersion: migration.toVersion,
        cause,
      });
    }

    currentVersion = migration.toVersion;
  }

  return current;
}
