/**
 * Canonical cache-key builders for the catalog runtime cache.
 *
 * Callers must use these builders instead of constructing
 * arbitrary cache keys. Each builder produces a deterministic
 * key in the required namespace format.
 *
 * Namespaces:
 *   catalog-manifest/<revision>
 *   catalog-sources/<revision>
 *   catalog-index/<revision>/<kind>
 *   entity/<revision>/<entity-id>
 */

import type { CatalogRevision, RuleEntityKind } from "@obsidian-dnd/domain";
import { catalogRevisionStr } from "@obsidian-dnd/domain";

/* ── Namespace prefixes ────────────────────────────────────────── */

const NS_MANIFEST = "catalog-manifest";
const NS_SOURCES = "catalog-sources";
const NS_INDEX = "catalog-index";
const NS_ENTITY = "entity";

/* ── Canonical key builders ────────────────────────────────────── */

/**
 * Build a cache key for a catalog manifest entry.
 *
 * Produces: `catalog-manifest/<revision>`
 */
export function buildManifestCacheKey(
  catalogRevision: CatalogRevision,
): string {
  return `${NS_MANIFEST}/${catalogRevisionStr(catalogRevision)}`;
}

/**
 * Build a cache key for a catalog sources entry.
 *
 * Produces: `catalog-sources/<revision>`
 */
export function buildSourcesCacheKey(
  catalogRevision: CatalogRevision,
): string {
  return `${NS_SOURCES}/${catalogRevisionStr(catalogRevision)}`;
}

/**
 * Build a cache key for an entity index entry.
 *
 * Produces: `catalog-index/<revision>/<kind>`
 */
export function buildIndexCacheKey(
  catalogRevision: CatalogRevision,
  entityKind: RuleEntityKind,
): string {
  return `${NS_INDEX}/${catalogRevisionStr(catalogRevision)}/${entityKind}`;
}

/**
 * Build a cache key for an individual entity detail entry.
 *
 * Produces: `entity/<revision>/<entity-id>`
 *
 * The cache key identity is the canonical entity ID, not the
 * catalog detail path. The detail path is retrieval metadata
 * and must not appear in the cache key.
 */
export function buildEntityCacheKey(
  catalogRevision: CatalogRevision,
  entityId: string,
): string {
  return `${NS_ENTITY}/${catalogRevisionStr(catalogRevision)}/${entityId}`;
}

/* ── Key parsing (for invalidation and diagnostics) ────────────── */

/**
 * Parse a cache key into its namespace and components.
 * Returns null if the key does not match any known namespace.
 */
export function parseCacheKey(
  key: string,
): { namespace: string; revision?: string; kind?: string; entityId?: string } | null {
  const parts = key.split("/");
  if (parts.length < 2) return null;

  const namespace = parts[0];
  const revision = parts[1] ?? undefined;

  switch (namespace) {
    case NS_MANIFEST:
    case NS_SOURCES:
      return { namespace, revision };

    case NS_INDEX:
      if (parts.length < 3) return null;
      return { namespace, revision, kind: parts[2] };

    case NS_ENTITY:
      if (parts.length < 3) return null;
      // Join all remaining parts to support entity IDs that may contain slashes
      return { namespace, revision, entityId: parts.slice(2).join("/") };

    default:
      return null;
  }
}

/**
 * Check whether a cache key belongs to the catalog cache
 * namespace (as opposed to other plugin data stored in
 * the same persistent store).
 */
export function isCatalogCacheKey(key: string): boolean {
  const parsed = parseCacheKey(key);
  if (parsed === null) return false;
  return [NS_MANIFEST, NS_SOURCES, NS_INDEX, NS_ENTITY].includes(parsed.namespace);
}
