/**
 * Catalog runtime service.
 *
 * Owned by the plugin lifecycle, this service composes:
 * - {@link PersistentCatalogCacheStore} for persistent storage
 * - {@link CatalogCacheManager} for cache management
 * - {@link CatalogClient} for network transport
 * - {@link CatalogRuntimeService} for two-phase activation and cache restoration
 *
 * Provides high-level catalog access methods with caching
 * and offline fallback behavior.
 */

import type { Plugin } from "obsidian";
import type {
  CatalogCacheStore,
  CatalogCacheManager,
  CacheExpirationPolicy,
  CacheStats,
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
  CatalogRestoreResult,
} from "@obsidian-dnd/catalog-contract";
import {
  CatalogCacheManager as CatalogCacheManagerClass,
  CatalogRuntimeService as RuntimeServiceClass,
} from "@obsidian-dnd/catalog-contract";
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
} from "@obsidian-dnd/catalog-contract";
import type {
  CatalogRevision,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import type {
  CatalogClient,
  EntityDetailResult,
} from "./client";
import { PersistentCatalogCacheStore } from "./persistent-cache-store";
import { ObsidianActiveRevisionPersistence } from "./obsidian-active-revision-persistence";
import { createObsidianFetcher } from "./obsidian-fetcher-adapter";

/* ── Configuration ──────────────────────────────────────────────── */

export interface CatalogServiceConfig {
  /** Default cache expiration policy. */
  defaultExpiration?: CacheExpirationPolicy;
  /** Base URL of the catalog server (required for runtime service). */
  baseUrl?: string;
}

const DEFAULT_EXPIRATION: CacheExpirationPolicy = {
  kind: "ttl",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

/* ── Service ────────────────────────────────────────────────────── */

export class CatalogService {
  private plugin: Plugin;
  private store: PersistentCatalogCacheStore;
  private manager: CatalogCacheManager;
  private client: CatalogClient;
  private config: CatalogServiceConfig;
  private runtimeService: RuntimeServiceClass | null;

  constructor(
    plugin: Plugin,
    client: CatalogClient,
    config: CatalogServiceConfig = {},
  ) {
    this.plugin = plugin;
    this.config = config;
    this.client = client;
    this.store = new PersistentCatalogCacheStore(plugin);
    this.manager = new CatalogCacheManagerClass(
      this.store,
      config.defaultExpiration ?? DEFAULT_EXPIRATION,
    );
    this.runtimeService = null;
    if (config.baseUrl) {
      const persistence = new ObsidianActiveRevisionPersistence(plugin);
      const fetcher = createObsidianFetcher();
      this.runtimeService = new RuntimeServiceClass({
        baseUrl: config.baseUrl,
        fetcher,
        cacheManager: this.manager,
        activeRevisionPersistence: persistence,
      });
    }
  }

  /* ── Lifecycle ──────────────────────────────────────────────── */

  /**
   * Initialize the service by loading persisted cache data
   * from disk and attempting cache restoration. Call once
   * during plugin onload.
   *
   * @returns Result of the cache restoration attempt, or a
   *          failure result if no base URL is configured.
   */
  async initialize(): Promise<CatalogRestoreResult> {
    await this.store.initialize();
    if (this.runtimeService === null) {
      return {
        success: false,
        reason: "no-persistence",
      };
    }
    return this.runtimeService.restoreFromCache();
  }

  /**
   * Persist cache data to disk. Call during plugin onunload.
   */
  async dispose(): Promise<void> {
    await this.store.flush();
  }

  /* ── Public API ─────────────────────────────────────────────── */

  /**
   * Fetch the catalog manifest with caching.
   */
  async fetchManifest(
    revision: CatalogRevision,
  ): Promise<CatalogManifest> {
    const key = buildManifestCacheKey(revision);
    const inputHash = `manifest:${revision}`;
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchManifest(revision),
      revision,
      inputHash,
    );
    return envelope.value;
  }

  /**
   * Fetch the source list with caching.
   */
  async fetchSources(
    revision: CatalogRevision,
  ): Promise<CatalogSource[]> {
    const key = buildSourcesCacheKey(revision);
    const inputHash = `sources:${revision}`;
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchSources(revision),
      revision,
      inputHash,
    );
    return envelope.value;
  }

  /**
   * Fetch an entity index with caching.
   */
  async fetchIndex(
    revision: CatalogRevision,
    entityKind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]> {
    const key = buildIndexCacheKey(revision, entityKind);
    const inputHash = `index:${revision}:${entityKind}`;
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchIndex(revision, entityKind),
      revision,
      inputHash,
    );
    return envelope.value;
  }

  /**
   * Fetch a single entity detail with caching.
   *
   * @param revision - The catalog revision to fetch from.
   * @param entityId - Canonical entity ID used as cache key identity.
   * @param detailPath - Catalog retrieval path used for the network fetch.
   */
  async fetchEntity(
    revision: CatalogRevision,
    entityId: string,
    detailPath: string,
  ): Promise<EntityDetailResult> {
    const key = buildEntityCacheKey(revision, entityId);
    const inputHash = `entity:${revision}:${entityId}`;
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchEntity(revision, detailPath),
      revision,
      inputHash,
    );
    return envelope.value;
  }

  /**
   * Test catalog server connectivity.
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /* ── Cache management ───────────────────────────────────────── */

  /**
   * Invalidate a single cache entry.
   */
  async invalidate(key: string): Promise<boolean> {
    return this.manager.invalidate(key);
  }

  /**
   * Invalidate all cache entries for a catalog revision.
   */
  async invalidateByRevision(revision: CatalogRevision): Promise<number> {
    return this.manager.invalidateByRevision(revision);
  }

  /**
   * Clear all catalog cache entries. Does not affect
   * plugin settings or character data.
   */
  async clearCache(): Promise<number> {
    return this.manager.clear();
  }

  /**
   * Get cache performance statistics.
   */
  getStats(): CacheStats {
    return this.manager.stats();
  }

  /**
   * Get the underlying cache store (for diagnostics).
   */
  getStore(): CatalogCacheStore {
    return this.store;
  }

  /**
   * Get the underlying client (for testing).
   */
  getClient(): CatalogClient {
    return this.client;
  }
}
