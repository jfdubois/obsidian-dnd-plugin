/**
 * Character serialization for persistence to JSON strings.
 *
 * Provides serialize and deserialize operations that convert
 * between in-memory Character objects and JSON strings suitable
 * for storage in Obsidian vault files.
 *
 * Serialization preserves all branded IDs as their string values.
 * Deserialization validates the parsed result against the full
 * Character type guard before returning.
 */

import type { Character } from "./character";
import { isCharacter } from "./character";
import { CHARACTER_SCHEMA_VERSION } from "./schema-version";

/* ── Serialization error ───────────────────────────────────────── */

/** Specific failure reasons for character deserialization. */
export type CharacterSerializationErrorReason =
  | 'invalid-json'
  | 'schema-version-mismatch'
  | 'invalid-character-structure';

/**
 * Error thrown when character serialization or deserialization fails.
 *
 * Includes the reason code and the original error cause for
 * actionable diagnostics.
 */
export class CharacterSerializationError extends Error {
  public readonly reason: CharacterSerializationErrorReason;
  public readonly cause: unknown;

  public constructor(options: {
    reason: CharacterSerializationErrorReason;
    message: string;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "CharacterSerializationError";
    this.reason = options.reason;
    this.cause = options.cause;
  }
}

/* ── Serialize ─────────────────────────────────────────────────── */

/**
 * Serialize a Character to a JSON string for persistence.
 *
 * Branded IDs serialize as their underlying string values.
 * All nested structures are preserved through standard JSON
 * serialization.
 *
 * @param character - The character to serialize.
 * @returns A JSON string representation of the character.
 */
export function serializeCharacter(character: Character): string {
  return JSON.stringify(character);
}

/* ── Deserialize ───────────────────────────────────────────────── */

/**
 * Deserialize a JSON string into a validated Character.
 *
 * Parses the JSON string and validates the result against the
 * full Character type guard. Throws CharacterSerializationError
 * if the JSON is malformed or the parsed structure is invalid.
 *
 * @param json - The JSON string to deserialize.
 * @returns A validated Character object.
 * @throws CharacterSerializationError if the JSON is invalid or
 *          the parsed structure does not match the Character schema.
 */
export function deserializeCharacter(json: string): Character {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new CharacterSerializationError({
      reason: "invalid-json",
      message: "Failed to parse character JSON: " + (cause instanceof Error ? cause.message : String(cause)),
      cause,
    });
  }

  /* Validate schema version first for a clear error message. */
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.schemaVersion === "number" && obj.schemaVersion !== CHARACTER_SCHEMA_VERSION) {
      throw new CharacterSerializationError({
        reason: "schema-version-mismatch",
        message: `Unsupported character schema version: ${obj.schemaVersion} (expected ${CHARACTER_SCHEMA_VERSION})`,
      });
    }
  }

  /* Full structural validation. */
  if (!isCharacter(parsed)) {
    throw new CharacterSerializationError({
      reason: "invalid-character-structure",
      message: "Parsed JSON does not match the Character schema",
    });
  }

  return parsed;
}
