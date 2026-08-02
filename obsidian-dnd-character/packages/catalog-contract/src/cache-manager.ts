/**
 * High-level cache manager that combines a cache store
 * with expiration policy and fetch-on-miss behavior.
 *
 * The manager tracks hits and misses for diagnostics
 * and automatically creates cache envelopes on fetch misses.
 */

import type { CatalogCacheStore } from "./cache-store";
import type {
  CacheEnvelope,
  CacheExpirationPolicy,
} from "./cache-envelope";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import {
  CACHE_SCHEMA_VERSION,
  createCacheEnvelope,
  isCacheValid,
} from "./cache-envelope";

/* ── Stats ───────────────────────────────────────────────────────── */

/** Cache performance statistics. */
export interface CacheStats {
  /** Total number of cache lookups that returned a valid entry. */
  hits: number;
  /** Total number of cache lookups that resulted in a fetch. */
  misses: number;
  /** Ratio of hits to total lookups (0..1). */
  hitRate: number;
  /** Total number of entries currently in the store. */
  size: number;
}

/* ── Cache manager ───────────────────────────────────────────────── */

/**
 * Combines a cache store with a default expiration policy
 * and provides fetch-on-miss semantics with hit/miss tracking.
 */
export class CatalogCacheManager {
  private store: CatalogCacheStore;
  private defaultExpiration: CacheExpirationPolicy;
  private hits: number;
  private misses: number;

  constructor(
    store: CatalogCacheStore,
    defaultExpiration: CacheExpirationPolicy,
  ) {
    this.store = store;
    this.defaultExpiration = defaultExpiration;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Fetch a value, using the cache if a valid entry exists.
   *
   * On cache hit, returns the stored envelope.
   * On cache miss, calls `fetchFn`, wraps the result in a
   * new envelope, stores it, and returns it.
   */
  async fetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    revision: CatalogRevision,
    inputHash: string,
  ): Promise<CacheEnvelope<T>> {
    const existing = await this.store.get<T>(key);

    if (existing !== null && isCacheValid(existing, revision, inputHash)) {
      this.hits += 1;
      return existing;
    }

    this.misses += 1;
    const value = await fetchFn();
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: revision,
      inputHash,
      createdAt: new Date().toISOString(),
      expiration: this.defaultExpiration,
      value,
    });

    await this.store.set(key, envelope);
    return envelope;
  }

  /** Remove a single cache entry. Returns true if it existed. */
  async invalidate(key: string): Promise<boolean> {
    return this.store.invalidate(key);
  }

  /** Remove all entries for a catalog revision. Returns count. */
  async invalidateByRevision(revision: CatalogRevision): Promise<number> {
    return this.store.invalidateByRevision(revision);
  }

  /** Remove all entries. Returns the number removed. */
  async clear(): Promise<number> {
    return this.store.clear();
  }

  /**
   * Return cache performance statistics.
   *
   * hitRate is 0 when no lookups have occurred.
   */
  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.store.size(),
    };
  }

  /**
   * Return the raw cached envelope for a key, regardless of
   * expiration or revision/hash validity.
   *
   * Returns null if no entry exists. Does not count as a
   * cache hit (no stats tracking). Pure read-through to store.
   */
  async getCached<T>(key: string): Promise<CacheEnvelope<T> | null> {
    return this.store.get<T>(key);
  }

  /**
   * Fetch with offline fallback behavior.
   *
   * First attempts normal fetch(). If the underlying fetchFn
   * throws (e.g. network error), falls back to stale cached
   * data. If no cached data exists, re-throws the original
   * error.
   *
   * @returns envelope with flags indicating source and freshness
   */
  async fetchWithOfflineFallback<T>(
    key: string,
    fetchFn: () => Promise<T>,
    revision: CatalogRevision,
    inputHash: string,
  ): Promise<{
    envelope: CacheEnvelope<T>;
    fromCache: boolean;
    stale: boolean;
  }> {
    const hitsBefore = this.hits;
    try {
      const envelope = await this.fetch<T>(
        key,
        fetchFn,
        revision,
        inputHash,
      );
      const fromCache = this.hits > hitsBefore;
      return { envelope, fromCache, stale: false };
    } catch (error) {
      const cached = await this.getCached<T>(key);
      if (cached !== null) {
        const isStale = !isCacheValid(cached, revision, inputHash);
        return { envelope: cached, fromCache: true, stale: isStale };
      }
      throw error;
    }
  }
}
