/**
 * Connection test validation logic.
 *
 * Validates that a catalog manifest meets all FR-001 requirements:
 * - manifest shape (isCatalogManifest guard)
 * - API version (CATALOG_API_VERSION)
 * - catalog schema version (CATALOG_SCHEMA_VERSION)
 * - rulesets (non-empty, valid ruleset values)
 * - required entity indexes (core entity kinds present)
 *
 * This module is pure and has no Obsidian dependencies.
 */

import type { CatalogManifest } from "@obsidian-dnd/catalog-contract";
import {
  isCatalogManifest,
  CATALOG_API_VERSION,
  CATALOG_SCHEMA_VERSION,
} from "@obsidian-dnd/catalog-contract";
import type { RuleEntityKind } from "@obsidian-dnd/domain";

/* ── Required entity kinds ───────────────────────────────────────
   The minimum set of entity kinds a catalog must expose for the
   plugin to function (character creation requires species,
   background, class, feat, spell, item).                       */

const REQUIRED_ENTITY_KINDS: ReadonlySet<RuleEntityKind> = new Set([
  "species",
  "background",
  "class",
  "feat",
  "spell",
  "item",
]);

/* ── Result type ───────────────────────────────────────────────── */

/**
 * Result of validating a catalog manifest against FR-001
 * connection test requirements.
 */
export interface ConnectionTestResult {
  /** Whether the manifest passes all validation checks. */
  valid: boolean;
  /** Human-readable validation errors (empty if valid). */
  errors: string[];
}

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Validate a catalog manifest against FR-001 connection test
 * requirements.
 *
 * Checks performed:
 * 1. Manifest shape — must pass isCatalogManifest guard
 * 2. API version — must equal CATALOG_API_VERSION
 * 3. Schema version — must equal CATALOG_SCHEMA_VERSION
 * 4. Rulesets — must be non-empty (enforced by guard)
 * 5. Required entity indexes — must include all REQUIRED_ENTITY_KINDS
 *
 * @param manifest - The raw manifest data to validate.
 * @returns A result indicating validity and any errors.
 */
export function validateConnection(
  manifest: unknown,
): ConnectionTestResult {
  const errors: string[] = [];

  /* 1. Validate manifest shape */
  if (!isCatalogManifest(manifest)) {
    return {
      valid: false,
      errors: [
        "Invalid manifest: response does not match CatalogManifest schema",
      ],
    };
  }

  const m = manifest as CatalogManifest;

  /* 2. Validate API version
     (isCatalogManifest already checks this, but FR-001 requires
      explicit validation so we re-check for clarity) */
  if (m.apiVersion !== CATALOG_API_VERSION) {
    errors.push(
      `Unsupported API version: ${m.apiVersion} (expected ${CATALOG_API_VERSION})`,
    );
  }

  /* 3. Validate catalog schema version */
  if (m.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schema version: ${m.schemaVersion} (expected ${CATALOG_SCHEMA_VERSION})`,
    );
  }

  /* 4. Validate rulesets
     (isCatalogManifest ensures non-empty + valid ruleset values;
      we rely on the guard here) */

  /* 5. Validate required entity indexes */
  const manifestKinds = new Set(m.entityKinds);
  const missingKinds: RuleEntityKind[] = [];
  for (const required of REQUIRED_ENTITY_KINDS) {
    if (!manifestKinds.has(required)) {
      missingKinds.push(required);
    }
  }
  if (missingKinds.length > 0) {
    errors.push(
      `Missing required entity kinds: ${missingKinds.join(", ")}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
