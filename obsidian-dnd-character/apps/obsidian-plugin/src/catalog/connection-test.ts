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
  validateSchemaVersion,
  validateRequiredEntityKinds,
} from "@obsidian-dnd/catalog-contract";

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
  const schemaError = validateSchemaVersion(m);
  if (schemaError !== null) {
    errors.push(schemaError);
  }

  /* 4. Validate rulesets
     (isCatalogManifest ensures non-empty + valid ruleset values;
      we rely on the guard here) */

  /* 5. Validate required entity indexes */
  const kindsError = validateRequiredEntityKinds(m);
  if (kindsError !== null) {
    errors.push(kindsError);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
