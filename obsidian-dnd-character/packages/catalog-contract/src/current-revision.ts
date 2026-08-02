/**
 * Current revision pointer type.
 *
 * Represents the `current.json` file served by the catalog server.
 * This file contains only the active revision identifier and allows
 * the plugin to discover which revision to fetch without hardcoding
 * revision names.
 *
 * Structure:
 * ```json
 * {
 *   "currentRevision": "smoke-test-rev-001"
 * }
 * ```
 */

/* ── Current revision pointer ──────────────────────────────────── */

export interface CurrentRevision {
  /** The identifier of the currently active catalog revision. */
  currentRevision: string;
}

export function isCurrentRevision(value: unknown): value is CurrentRevision {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.currentRevision !== "string") return false;
  if (obj.currentRevision.length === 0) return false;

  return true;
}

export function createCurrentRevision(
  currentRevision: string,
): CurrentRevision {
  return { currentRevision };
}
