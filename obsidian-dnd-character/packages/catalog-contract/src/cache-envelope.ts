/**
 * Cache envelope types for the catalog runtime cache.
 *
 * A cache envelope wraps cached data with metadata required for
 * safe cache invalidation and offline fallback. The envelope
 * includes catalog revision, schema version, download timestamp,
 * and expiration policy.
 *
 * A cache envelope is invalid when the schema version, catalog
 * revision, or input hash does not match the expected values.
 */

import type { CatalogRevision } from "@obsidian-dnd/domain";
import { isCatalogRevision } from "@obsidian-dnd/domain";

/* ── Cache schema version ────────────────────────────────────────
   Bump this value when the cache envelope structure changes.    */

export const CACHE_SCHEMA_VERSION = 1 as const;

export type CacheSchemaVersion = typeof CACHE_SCHEMA_VERSION;

/* ── Expiration policy ──────────────────────────────────────────
   Discriminated union describing how a cache entry expires.     */

/** A cache entry that never expires. */
export interface CacheExpirationNoExpiry {
  kind: "no-expiry";
}

/** A cache entry that expires after a fixed TTL from creation. */
export interface CacheExpirationTtl {
  kind: "ttl";
  /** Time-to-live in milliseconds. */
  ttlMs: number;
}

/** A cache entry that expires at an absolute point in time. */
export interface CacheExpirationAbsolute {
  kind: "absolute";
  /** ISO 8601 timestamp after which the entry is expired. */
  expiresAt: string;
}

export type CacheExpirationPolicy =
  | CacheExpirationNoExpiry
  | CacheExpirationTtl
  | CacheExpirationAbsolute;

export function isCacheExpirationPolicy(
  value: unknown,
): value is CacheExpirationPolicy {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.kind === "no-expiry") {
    return isCacheExpirationNoExpiry(obj);
  }
  if (obj.kind === "ttl") {
    return isCacheExpirationTtl(obj);
  }
  if (obj.kind === "absolute") {
    return isCacheExpirationAbsolute(obj);
  }

  return false;
}

function isCacheExpirationNoExpiry(
  value: unknown,
): value is CacheExpirationNoExpiry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return obj.kind === "no-expiry";
}

function isCacheExpirationTtl(
  value: unknown,
): value is CacheExpirationTtl {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "ttl") return false;
  if (typeof obj.ttlMs !== "number") return false;
  if (!Number.isFinite(obj.ttlMs)) return false;
  if (obj.ttlMs < 0) return false;
  return true;
}

function isCacheExpirationAbsolute(
  value: unknown,
): value is CacheExpirationAbsolute {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "absolute") return false;
  if (typeof obj.expiresAt !== "string") return false;
  if (obj.expiresAt.length === 0) return false;
  return true;
}

/* ── Cache envelope ────────────────────────────────────────────── */

/**
 * Wraps cached data with metadata for safe invalidation.
 *
 * @typeParam T - The cached payload type.
 */
export interface CacheEnvelope<T> {
  /** Version of the cache envelope schema. */
  cacheSchemaVersion: number;
  /** The catalog revision this cache entry belongs to. */
  catalogRevision: CatalogRevision;
  /** Hash of the inputs that produced this cache entry. */
  inputHash: string;
  /** ISO 8601 timestamp when the cache entry was created. */
  createdAt: string;
  /** Expiration policy for this cache entry. */
  expiration: CacheExpirationPolicy;
  /** The cached payload. */
  value: T;
}

/**
 * Type guard for cache envelopes.
 *
 * Validates the structural integrity of the envelope metadata.
 * Does not validate the inner value type.
 */
export function isCacheEnvelope<T>(
  value: unknown,
): value is CacheEnvelope<T> {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.cacheSchemaVersion !== "number") return false;
  if (!Number.isInteger(obj.cacheSchemaVersion)) return false;
  if (obj.cacheSchemaVersion < 1) return false;

  if (!isCatalogRevision(obj.catalogRevision)) return false;

  if (typeof obj.inputHash !== "string") return false;
  if (obj.inputHash.length === 0) return false;

  if (typeof obj.createdAt !== "string") return false;
  if (obj.createdAt.length === 0) return false;

  if (!isCacheExpirationPolicy(obj.expiration)) return false;

  // value field must exist (any type is acceptable)
  if (!("value" in obj)) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

/**
 * Create a cache envelope wrapping the provided value.
 */
export function createCacheEnvelope<T>(props: {
  cacheSchemaVersion: number;
  catalogRevision: CatalogRevision;
  inputHash: string;
  createdAt: string;
  expiration: CacheExpirationPolicy;
  value: T;
}): CacheEnvelope<T> {
  return {
    cacheSchemaVersion: props.cacheSchemaVersion,
    catalogRevision: props.catalogRevision,
    inputHash: props.inputHash,
    createdAt: props.createdAt,
    expiration: props.expiration,
    value: props.value,
  };
}

/* ── Expiration helpers ────────────────────────────────────────── */

/**
 * Check whether a cache envelope has expired.
 *
 * Uses the current date for absolute and TTL checks.
 * A no-expiry policy always returns false (not expired).
 */
export function isCacheExpired(
  envelope: CacheEnvelope<unknown>,
  now: Date = new Date(),
): boolean {
  switch (envelope.expiration.kind) {
    case "no-expiry":
      return false;
    case "ttl": {
      const created = new Date(envelope.createdAt).getTime();
      const expiry = created + envelope.expiration.ttlMs;
      return now.getTime() > expiry;
    }
    case "absolute": {
      return now.getTime() > new Date(envelope.expiration.expiresAt).getTime();
    }
  }
}

/**
 * Check whether a cache envelope matches the expected
 * catalog revision and input hash.
 *
 * Returns true if the envelope is still valid for the
 * given inputs.
 */
export function isCacheValid(
  envelope: CacheEnvelope<unknown>,
  expectedCatalogRevision: CatalogRevision,
  expectedInputHash: string,
  now: Date = new Date(),
): boolean {
  if (envelope.catalogRevision !== expectedCatalogRevision) return false;
  if (envelope.inputHash !== expectedInputHash) return false;
  if (isCacheExpired(envelope, now)) return false;
  return true;
}

/* ── Expiration policy factories ───────────────────────────────── */

export function createNoExpiryExpiration(): CacheExpirationNoExpiry {
  return { kind: "no-expiry" };
}

export function createTtlExpiration(ttlMs: number): CacheExpirationTtl {
  return { kind: "ttl", ttlMs };
}

export function createAbsoluteExpiration(
  expiresAt: string,
): CacheExpirationAbsolute {
  return { kind: "absolute", expiresAt };
}
