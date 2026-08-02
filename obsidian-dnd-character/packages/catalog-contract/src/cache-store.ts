/**
 * In-memory cache store for the catalog runtime cache.
 *
 * Provides a key-value store backed by a JavaScript Map,
 * with support for per-key and per-revision invalidation.
 *
 * Cache keys follow the pattern:
 *   {entityKind}:{entityId}  (e.g. "species:human")
 *   {resourceType}:{resourceId} (e.g. "manifest:main")
 */

import type { CacheEnvelope } from "./cache-envelope";
import type { CacheStoreDiagnostic } from "./cache-store-diagnostic";
import type { CatalogRevision } from "@obsidian-dnd/domain";

/* ── Store interface ────────────────────────────────────────────── */

/**
 * Key-value store for catalog cache envelopes.
 *
 * Implementations may be in-memory, persistent, or remote.
 * All methods are async to allow uniform composition.
 */
export interface CatalogCacheStore {
  /** Retrieve a cached envelope by key. Returns null on miss. */
  get<T>(key: string): Promise<CacheEnvelope<T> | null>;

  /** Store an envelope under the given key. */
  set<T>(key: string, envelope: CacheEnvelope<T>): Promise<void>;

  /** Remove a single entry. Returns true if the key existed. */
  invalidate(key: string): Promise<boolean>;

  /** Remove all entries for a catalog revision. Returns count. */
  invalidateByRevision(revision: CatalogRevision): Promise<number>;

  /**
   * Remove all catalog cache entries. Does not affect non-cache
   * plugin data stored in the same backend. Returns the number removed.
   */
  clear(): Promise<number>;

  /** List all cache keys. */
  keys(): string[];

  /** Current number of entries in the store. */
  size(): number;

  /**
   * Return diagnostics for any malformed entries currently
   * in the store. In-memory stores return an empty array;
   * persistent stores scan on load and report issues.
   */
  diagnostics(): CacheStoreDiagnostic[];
}

/* ── In-memory implementation ───────────────────────────────────── */

/**
 * Simple in-memory cache store using a JavaScript Map.
 *
 * Suitable for single-tab Obsidian sessions. Not shared
 * across windows or tabs.
 */
export class InMemoryCatalogCacheStore implements CatalogCacheStore {
  private entries: Map<string, CacheEnvelope<unknown>>;

  constructor() {
    this.entries = new Map();
  }

  async get<T>(key: string): Promise<CacheEnvelope<T> | null> {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return null;
    }
    return entry as CacheEnvelope<T>;
  }

  async set<T>(key: string, envelope: CacheEnvelope<T>): Promise<void> {
    this.entries.set(key, envelope as CacheEnvelope<unknown>);
  }

  async invalidate(key: string): Promise<boolean> {
    return this.entries.delete(key);
  }

  async invalidateByRevision(revision: CatalogRevision): Promise<number> {
    let count = 0;
    for (const [key, envelope] of this.entries) {
      if (envelope.catalogRevision === revision) {
        this.entries.delete(key);
        count += 1;
      }
    }
    return count;
  }

  async clear(): Promise<number> {
    const count = this.entries.size;
    this.entries.clear();
    return count;
  }

  keys(): string[] {
    return Array.from(this.entries.keys());
  }

  size(): number {
    return this.entries.size;
  }

  diagnostics(): CacheStoreDiagnostic[] {
    // In-memory store only holds valid envelopes.
    return [];
  }
}
