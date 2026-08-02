/**
 * Diagnostic information returned when a cache envelope
 * cannot be loaded from persistent storage.
 *
 * Used by the persistent store to report why a cache
 * entry was rejected, without throwing or losing data.
 */

export interface CacheStoreDiagnostic {
  /** The cache key that failed to load. */
  key: string;
  /** Reason the envelope was rejected. */
  reason: CacheStoreDiagnosticReason;
  /** Optional raw (unsafe) data for debugging. */
  rawData?: unknown;
}

export type CacheStoreDiagnosticReason =
  /** The stored value is not a JSON object. */
  | "not-an-object"
  /** The cache schema version is missing or invalid. */
  | "bad-schema-version"
  /** The catalog revision is missing or invalid. */
  | "bad-catalog-revision"
  /** The input hash is missing or invalid. */
  | "bad-input-hash"
  /** The created-at timestamp is missing or invalid. */
  | "bad-created-at"
  /** The expiration policy is missing or invalid. */
  | "bad-expiration"
  /** The value field is missing. */
  | "missing-value"
  /** The stored data could not be parsed as JSON. */
  | "parse-error"
  /** The key exists but the value is null/undefined. */
  | "null-value";
