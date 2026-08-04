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
  EntityDetailResponse,
  CacheEnvelopeCompatibilityReason,
} from "@obsidian-dnd/catalog-contract";
import {
  CatalogCacheManager as CatalogCacheManagerClass,
  CatalogRuntimeService as RuntimeServiceClass,
  isCatalogManifest,
  isCatalogSource,
  isCatalogEntitySummary,
  isEntityDetailResponse,
  CatalogRuntimeError,
  validateCacheEnvelopeCompatibility,
} from "@obsidian-dnd/catalog-contract";
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
  buildManifestInputHash,
  buildSourcesInputHash,
  buildIndexInputHash,
  buildEntityInputHash,
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
  /** Permit expired compatible entries as offline fallback. */
  allowStaleOfflineFallback?: boolean;
  /** Production-compatible cache store injection for tests. */
  cacheStore?: PersistentCatalogCacheStore;
  /** Production-compatible cache manager injection for tests. */
  cacheManager?: CatalogCacheManager;
  /** Runtime service injection for restart tests. */
  runtimeService?: RuntimeServiceClass;
}

const DEFAULT_EXPIRATION: CacheExpirationPolicy = {
  kind: "ttl",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

/* ── Runtime validators for cached values ───────────────────────── */

type SourceCacheValue = CatalogSource[] | Record<string, CatalogSource>;

function isCatalogSourceCacheValue(value: unknown): value is SourceCacheValue {
  if (Array.isArray(value)) {
    return value.every((item) => isCatalogSource(item));
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Object.values(value).every((item) => isCatalogSource(item));
}

function isCatalogEntitySummaryArray(value: unknown): value is CatalogEntitySummary[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isCatalogEntitySummary(item))
  );
}

type EntityCacheValue = EntityDetailResult | EntityDetailResponse;

function isEntityCacheValue(value: unknown): value is EntityCacheValue {
  if (isEntityDetailResponse(value)) {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "catalogRevision" in value &&
    isEntityDetailResponse((value as EntityDetailResult).data)
  );
}

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
    this.store = config.cacheStore ?? new PersistentCatalogCacheStore(plugin);
    this.manager = config.cacheManager ?? new CatalogCacheManagerClass(
      this.store,
      config.defaultExpiration ?? DEFAULT_EXPIRATION,
    );
    this.runtimeService = config.runtimeService ?? null;
    if (this.runtimeService === null && config.baseUrl) {
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
   *
   * @param revision - The catalog revision to fetch from.
   */
  async fetchManifest(
    revision: CatalogRevision,
  ): Promise<CatalogManifest> {
    const sourceRevision = this.requireActiveSourceRevision(revision);
    const key = buildManifestCacheKey(revision);
    const inputHash = buildManifestInputHash(sourceRevision);
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchManifest(revision),
      revision,
      inputHash,
      isCatalogManifest,
    );
    return envelope.value;
  }

  /**
   * Fetch the source list with caching.
   *
   * @param revision - The catalog revision to fetch from.
   */
  async fetchSources(
    revision: CatalogRevision,
  ): Promise<CatalogSource[]> {
    const sourceRevision = this.requireActiveSourceRevision(revision);
    const key = buildSourcesCacheKey(revision);
    const inputHash = buildSourcesInputHash(sourceRevision);
    const envelope = await this.manager.fetch<SourceCacheValue>(
      key,
      () => this.client.fetchSources(revision),
      revision,
      inputHash,
      isCatalogSourceCacheValue,
    );
    return Array.isArray(envelope.value)
      ? envelope.value
      : Object.values(envelope.value);
  }

  /**
   * Fetch an entity index with caching.
   *
   * @param revision - The catalog revision to fetch from.
   * @param entityKind - The entity kind to fetch the index for.
   */
  async fetchIndex(
    revision: CatalogRevision,
    entityKind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]> {
    const sourceRevision = this.requireActiveSourceRevision(revision);
    const key = buildIndexCacheKey(revision, entityKind);
    const inputHash = buildIndexInputHash(sourceRevision, entityKind);
    const envelope = await this.manager.fetch(
      key,
      () => this.client.fetchIndex(revision, entityKind),
      revision,
      inputHash,
      isCatalogEntitySummaryArray,
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
    const sourceRevision = this.requireActiveSourceRevision(revision);
    const key = buildEntityCacheKey(revision, entityId);
    const inputHash = buildEntityInputHash(sourceRevision, entityId);
    try {
      const result = await this.manager.fetchWithOfflineFallback(
        key,
        () => this.client.fetchEntity(revision, detailPath),
        revision,
        inputHash,
        isEntityCacheValue,
        { allowStale: this.config.allowStaleOfflineFallback === true },
      );
      const value = result.envelope.value;
      if ("data" in value) {
        return {
          ...value,
          cacheStatus: result.stale ? "stale-offline" : "fresh",
        };
      }
      return {
        catalogRevision: revision,
        data: value,
        cacheStatus: result.stale ? "stale-offline" : "fresh",
      };
    } catch (cause) {
      throw new CatalogRuntimeError({
        code: "ENTITY_UNRESOLVED",
        endpoint: detailPath,
        revision,
        message: `Entity ${entityId} could not be resolved from cache or network`,
        cause,
        operation: "entity-resolution",
        failedEntityId: entityId,
        failedEntityKind: entityId.split(":", 1)[0],
        resultingActivationState: this.runtimeService?.activationState === "active"
          ? "active"
          : "inactive",
        cacheOperation: "cache-read",
        cacheKey: key,
        cacheFailureReason: await this.entityCacheFailureReason(key, revision, inputHash),
        networkOperation: "entity-fetch",
        networkEndpoint: detailPath,
        offlineOrUnavailable: true,
      });
    }
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

  private requireActiveSourceRevision(revision: CatalogRevision): string {
    const runtime = this.runtimeService;
    if (
      runtime === null ||
      runtime.activationState !== "active" ||
      runtime.revision === undefined ||
      runtime.manifest === undefined
    ) {
      throw new Error("catalog unavailable: no active manifest");
    }
    if (runtime.revision !== revision || runtime.manifest.catalogRevision !== revision) {
      throw new Error("catalog unavailable: requested revision is not active");
    }
    return runtime.manifest.sourceRevision;
  }

  private async entityCacheFailureReason(
    key: string,
    revision: CatalogRevision,
    inputHash: string,
  ): Promise<string> {
    const cached = await this.manager.getCached<unknown>(key);
    if (cached === null) {
      const loadDiagnostic = this.store.diagnostics().find((diagnostic) => diagnostic.key === key);
      return loadDiagnostic === undefined ? "missing" : "schema-incompatible";
    }
    const compatibility = validateCacheEnvelopeCompatibility(
      cached,
      revision,
      inputHash,
      "entity",
    );
    return compatibility === null
      ? "malformed"
      : this.normalizedCacheFailureReason(compatibility);
  }

  private normalizedCacheFailureReason(
    reason: CacheEnvelopeCompatibilityReason,
  ): string {
    if (reason.includes("version")) return "schema-incompatible";
    if (reason.includes("revision")) return "revision-mismatch";
    if (reason.includes("hash")) return "input-hash-mismatch";
    return "expired";
  }
}
