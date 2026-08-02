/**
 * Revision activation validation.
 *
 * Orchestrates the full revision activation flow:
 * 1. Fetch the current revision pointer (current.json)
 * 2. Fetch the catalog manifest for that revision
 * 3. Validate the manifest against FR-001 requirements
 * 4. Negotiate schema version compatibility
 *
 * Returns a result object with success/failure state and
 * accumulated errors. Never throws — all errors are wrapped
 * into the result.
 *
 * This module is pure and has no Obsidian runtime dependencies
 * beyond the CatalogClient interface.
 */

import type { CatalogClient } from "./client";
import type { CatalogManifest } from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import { validateConnection } from "./connection-test";

/* ── Result type ───────────────────────────────────────────────── */

/**
 * Result of attempting to activate a catalog revision.
 *
 * On success, contains the revision ID and validated manifest.
 * On failure, contains accumulated human-readable errors.
 */
export interface RevisionActivationResult {
  /** Whether activation succeeded. */
  success: boolean;
  /** The revision ID (present on success). */
  revision?: string;
  /** Human-readable errors (empty on success). */
  errors: string[];
  /** The validated manifest (present on success). */
  manifest?: CatalogManifest;
}

/* ── Activation ────────────────────────────────────────────────── */

/**
 * Activate the current catalog revision by fetching, validating,
 * and negotiating schema compatibility.
 *
 * Flow:
 * 1. Fetch current revision ID via client.fetchCurrentRevision()
 * 2. Fetch manifest via client.fetchManifest(revision)
 * 3. Validate manifest via validateConnection(manifest)
 * 4. Negotiate schema via client.negotiateSchema(manifest.schemaVersion)
 *
 * All errors are accumulated and returned in the result.
 * The function never throws.
 *
 * @param client - The catalog client to use for fetching.
 * @returns A result indicating success or accumulated errors.
 */
export async function activateRevision(
  client: CatalogClient,
): Promise<RevisionActivationResult> {
  const errors: string[] = [];

  /* Step 1: Fetch current revision */
  let revisionId: string;
  try {
    revisionId = await client.fetchCurrentRevision();
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unknown error fetching current revision";
    return {
      success: false,
      errors: [`Failed to fetch current revision: ${message}`],
    };
  }

  /* Step 2: Fetch manifest */
  let manifest: unknown;
  try {
    manifest = await client.fetchManifest(revisionId as CatalogRevision);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unknown error fetching manifest";
    return {
      success: false,
      errors: [`Failed to fetch manifest for revision ${revisionId}: ${message}`],
    };
  }

  /* Step 3: Validate manifest */
  const validation = validateConnection(manifest);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  /* Step 4: Negotiate schema (only if manifest shape is valid) */
  if (validation.valid && typeof manifest === "object" && manifest !== null) {
    // Safe cast: validateConnection already confirmed the shape
    const typedManifest = manifest as CatalogManifest;
    const negotiation = client.negotiateSchema(typedManifest.schemaVersion);
    if (!negotiation.compatible) {
      const reason = negotiation.reason
        ? `: ${negotiation.reason}`
        : "";
      errors.push(
        `Schema negotiation failed: server version ${negotiation.serverSchemaVersion}, plugin version ${negotiation.pluginSchemaVersion}${reason}`,
      );
    }
  }

  /* Return result */
  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  // Manifest is validated at this point
  const validatedManifest = manifest as CatalogManifest;
  return {
    success: true,
    revision: revisionId,
    errors: [],
    manifest: validatedManifest,
  };
}
