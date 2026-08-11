/* ── Compatibility validation (FR-001) ───────────────────────────
   Shared validation logic for catalog manifest compatibility.
   Used by both the runtime service (activation) and the
   connection-test module.                                         */

import type { CatalogManifest } from "./catalog-manifest";
import type { RuleEntityKind } from "@obsidian-dnd/domain";
import { CATALOG_SCHEMA_VERSION, isSupportedSchemaVersion } from "./schema-version";

/* ── Required entity kinds ───────────────────────────────────────
   The minimum set of entity kinds a catalog must expose for the
   plugin to function (character creation requires species,
   background, class, feat, spell, item).                         */

export const REQUIRED_ENTITY_KINDS: ReadonlyArray<RuleEntityKind> = [
  "species",
  "background",
  "class",
  "feat",
  "spell",
  "item",
];

/* ── Schema version check ──────────────────────────────────────── */

/**
 * Validate that the manifest schema version matches the expected
 * catalog schema version.
 *
 * @param manifest - The validated catalog manifest.
 * @returns An error message if incompatible, or `null` if valid.
 */
export function validateSchemaVersion(
  manifest: CatalogManifest,
): string | null {
  if (!isSupportedSchemaVersion(manifest.schemaVersion)) {
    return `Unsupported schema version: ${manifest.schemaVersion} (expected ${CATALOG_SCHEMA_VERSION})`;
  }
  return null;
}

/* ── Required entity kinds check ───────────────────────────────── */

/**
 * Validate that the manifest includes all required entity kinds.
 *
 * @param manifest - The validated catalog manifest.
 * @returns An error message listing missing kinds, or `null` if all present.
 */
export function validateRequiredEntityKinds(
  manifest: CatalogManifest,
): string | null {
  const manifestKinds = new Set(manifest.entityKinds);
  const missing: RuleEntityKind[] = [];
  for (const required of REQUIRED_ENTITY_KINDS) {
    if (!manifestKinds.has(required)) {
      missing.push(required);
    }
  }
  if (missing.length > 0) {
    return `Missing required entity kinds: ${missing.join(", ")}`;
  }
  return null;
}
