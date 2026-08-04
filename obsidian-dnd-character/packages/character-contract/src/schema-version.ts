/* ── Character schema version ────────────────────────────────────
   Bump this constant when the character persistence schema changes.
   The runtime validator rejects unsupported versions.              */

export const CHARACTER_SCHEMA_VERSION = 1 as const;

export type CharacterSchemaVersion = typeof CHARACTER_SCHEMA_VERSION;

export function isSupportedCharacterSchemaVersion(value: unknown): value is number {
  return value === CHARACTER_SCHEMA_VERSION;
}
