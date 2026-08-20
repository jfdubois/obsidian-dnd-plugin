/* ── Schema version constants ────────────────────────────────────
   Centralised constants for catalog API and schema versions.
   Bump these values when the catalog contract changes.           */

export const CATALOG_API_VERSION = 1 as const;
export const CATALOG_SCHEMA_VERSION = 4 as const;

export type CatalogApiVersion = typeof CATALOG_API_VERSION;

export function isSupportedApiVersion(value: unknown): value is number {
  return value === CATALOG_API_VERSION;
}

export function isSupportedSchemaVersion(value: unknown): value is number {
  return value === 2 || value === 3 || value === CATALOG_SCHEMA_VERSION;
}
