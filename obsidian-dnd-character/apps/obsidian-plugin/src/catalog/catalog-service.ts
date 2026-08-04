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
  ActivateOptions,
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
import {
  deriveCatalogRuntimeStatus,
  type CatalogRuntimeStatusInput,
  type CatalogRuntimeStatusSnapshot,
} from "./catalog-runtime-status";
import {
  statusDiagnosticFromRestore,
  statusDiagnosticFromRuntimeError,
} from "./catalog-status-diagnostics";
import {
  activateCatalogRuntime,
  connectivityFromDiscoveryFailure,
  discoverAdvertisedCatalog,
  type CatalogRefreshResult,
  type CatalogUpdateCheckResult,
} from "./catalog-refresh";

export type { CatalogRefreshResult, CatalogUpdateCheckResult } from "./catalog-refresh";

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
  /** Injectable clock for deterministic refresh completion timestamps. */
  now?: () => Date;
}

const DEFAULT_EXPIRATION: CacheExpirationPolicy = {
  kind: "ttl",
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
};

function normalizedBaseUrl(baseUrl: string | undefined): string | undefined {
  const normalized = baseUrl?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

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
  private statusFacts: CatalogRuntimeStatusInput;
  private runtimeStatus: CatalogRuntimeStatusSnapshot;
  private readonly statusListeners = new Set<(status: CatalogRuntimeStatusSnapshot) => void>();
  private readonly unresolvedEntityIds = new Set<string>();
  private refreshInFlight: Promise<CatalogRefreshResult> | undefined;
  private updateCheckInFlight: Promise<CatalogUpdateCheckResult> | undefined;

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
    const baseUrl = normalizedBaseUrl(config.baseUrl);
    if (this.runtimeService === null && baseUrl !== undefined) {
      const persistence = new ObsidianActiveRevisionPersistence(plugin);
      const fetcher = createObsidianFetcher();
      this.runtimeService = new RuntimeServiceClass({
        baseUrl,
        fetcher,
        cacheManager: this.manager,
        activeRevisionPersistence: persistence,
      });
    }
    this.statusFacts = {
      ...(baseUrl === undefined ? {} : { configuredUrl: baseUrl }),
      activationState: "inactive",
      schemaCompatibility: "unknown",
      connectivity: "unknown",
      cacheFreshness: "none",
      restoreOutcome: "idle",
      refreshOutcome: "idle",
      unresolvedEntityCount: 0,
    };
    this.runtimeStatus = deriveCatalogRuntimeStatus(this.statusFacts);
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
      const result: CatalogRestoreResult = {
        success: false,
        reason: "no-persistence",
      };
      this.applyRestoreResult(result);
      return result;
    }
    this.updateStatus({ restoreOutcome: "pending" });
    const result = await this.runtimeService.restoreFromCache();
    this.applyRestoreResult(result);
    return result;
  }

  /**
   * Persist cache data to disk. Call during plugin onunload.
   */
  async dispose(): Promise<void> {
    try {
      await this.store.flush();
    } finally {
      this.statusListeners.clear();
    }
  }

  /* ── Public API ─────────────────────────────────────────────── */

  getRuntimeStatus(): CatalogRuntimeStatusSnapshot {
    return this.runtimeStatus;
  }

  subscribeRuntimeStatus(
    listener: (status: CatalogRuntimeStatusSnapshot) => void,
  ): () => void {
    this.statusListeners.add(listener);
    this.notifyStatusListener(listener);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.statusListeners.delete(listener);
    };
  }

  /** Discover the advertised catalog revision without changing the active runtime. */
  checkForCatalogUpdate(): Promise<CatalogUpdateCheckResult> {
    if (this.refreshInFlight !== undefined) {
      return this.refreshInFlight.then(() => this.updateCheckFromStatus());
    }
    if (this.updateCheckInFlight !== undefined) return this.updateCheckInFlight;
    const operation = this.performUpdateCheck();
    this.updateCheckInFlight = operation;
    void operation.finally(() => {
      if (this.updateCheckInFlight === operation) this.updateCheckInFlight = undefined;
    });
    return operation;
  }

  /** Discover and, when necessary, activate the advertised catalog transactionally. */
  refreshCatalog(options?: ActivateOptions): Promise<CatalogRefreshResult> {
    if (this.refreshInFlight !== undefined) return this.refreshInFlight;
    const operation = this.performRefresh(options);
    this.refreshInFlight = operation;
    void operation.finally(() => {
      if (this.refreshInFlight === operation) this.refreshInFlight = undefined;
    });
    return operation;
  }

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
        const response: EntityDetailResult = {
          ...value,
          cacheStatus: result.stale ? "stale-offline" : "fresh",
        };
        this.clearResolvedEntity(entityId);
        return response;
      }
      const response: EntityDetailResult = {
        catalogRevision: revision,
        data: value,
        cacheStatus: result.stale ? "stale-offline" : "fresh",
      };
      this.clearResolvedEntity(entityId);
      return response;
    } catch (cause) {
      const error = new CatalogRuntimeError({
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
      this.unresolvedEntityIds.add(entityId);
      this.updateStatus({
        unresolvedEntityCount: this.unresolvedEntityIds.size,
        lastDiagnostic: statusDiagnosticFromRuntimeError(error),
      });
      throw error;
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

  private async performUpdateCheck(keepRefreshPending = false): Promise<CatalogUpdateCheckResult> {
    if (this.runtimeService === null || this.statusFacts.configuredUrl === undefined) {
      this.completeOperationStatus({ refreshOutcome: keepRefreshPending ? "failed" : "idle", lastDiagnostic: this.safeDiagnostic("Catalog URL is not configured.", "not-configured") });
      return { success: false, reason: "not-configured", diagnostic: this.runtimeStatus.lastDiagnostic };
    }
    if (!keepRefreshPending) this.updateStatus({ onlineCheckPending: true, lastDiagnostic: undefined });
    const discovery = await discoverAdvertisedCatalog(this.client);
    if (discovery.kind === "manifest-revision-mismatch") {
        const diagnostic = this.safeDiagnostic("The advertised catalog manifest revision does not match.", "manifest-revision-mismatch", discovery.advertisedRevision);
        this.finishDiscovery(keepRefreshPending, { ...this.runtimeSnapshotFacts(), advertisedRevision: discovery.advertisedRevision, connectivity: "online", schemaCompatibility: "unknown", refreshOutcome: keepRefreshPending ? "failed" : "idle", lastDiagnostic: diagnostic });
        return { success: false, reason: "invalid-response", diagnostic: this.runtimeStatus.lastDiagnostic };
    }
    if (discovery.kind === "incompatible") {
        const diagnostic = this.safeDiagnostic(discovery.reason ?? "The catalog schema is incompatible.", "schema-incompatible", discovery.advertisedRevision);
        const runtime = this.runtimeService;
        const active = runtime.activationState === "active" ? runtime.revision : undefined;
        this.finishDiscovery(keepRefreshPending, { activationState: active === undefined ? "inactive" : "active", ...(active === undefined ? { activeRevision: undefined, sourceRevision: undefined } : { activeRevision: active, sourceRevision: runtime.manifest?.sourceRevision }), advertisedRevision: discovery.advertisedRevision, connectivity: "online", schemaCompatibility: "incompatible", refreshOutcome: keepRefreshPending ? "failed" : "idle", lastDiagnostic: diagnostic });
        return { success: false, reason: "incompatible", diagnostic: this.runtimeStatus.lastDiagnostic };
    }
    if (discovery.kind === "compatible") {
      const runtime = this.runtimeService;
      const active = runtime.activationState === "active" ? runtime.revision : undefined;
      this.finishDiscovery(keepRefreshPending, {
        activationState: active === undefined ? "inactive" : "active",
        ...(active === undefined ? { activeRevision: undefined, sourceRevision: undefined } : { activeRevision: active, sourceRevision: runtime.manifest?.sourceRevision }),
        advertisedRevision: discovery.advertisedRevision, connectivity: "online", schemaCompatibility: "compatible",
        cacheFreshness: active === undefined ? this.statusFacts.cacheFreshness : "current",
        ...(keepRefreshPending ? {} : { refreshOutcome: "idle" }), lastDiagnostic: undefined,
      });
      return { success: true, advertisedRevision: discovery.advertisedRevision, compatible: true, updateAvailable: active !== discovery.advertisedRevision };
    }
    {
      const connectivity = connectivityFromDiscoveryFailure(discovery.cause);
      const diagnostic = this.safeDiagnostic("Catalog update discovery did not complete.", "discovery-failed", discovery.advertisedRevision);
      this.finishDiscovery(keepRefreshPending, {
        ...this.runtimeSnapshotFacts(),
        ...(discovery.advertisedRevision === undefined ? {} : { advertisedRevision: discovery.advertisedRevision }), connectivity,
        refreshOutcome: keepRefreshPending ? "failed" : "idle", lastDiagnostic: diagnostic,
      });
      return { success: false, reason: connectivity === "offline" ? "unavailable" : "invalid-response", diagnostic: this.runtimeStatus.lastDiagnostic };
    }
  }

  private async performRefresh(options?: ActivateOptions): Promise<CatalogRefreshResult> {
    this.updateStatus({ ...this.runtimeSnapshotFacts(), activationState: "fetching", refreshOutcome: "pending", onlineCheckPending: false, lastDiagnostic: undefined });
    const discovered = await this.performUpdateCheck(true);
    if (!discovered.success) {
      return { success: false, reason: discovered.reason === "not-configured" ? "not-configured" : discovered.reason === "incompatible" ? "incompatible" : "activation-failed", status: this.runtimeStatus };
    }
    const runtime = this.runtimeService;
    if (runtime === null) return { success: false, reason: "not-configured", status: this.runtimeStatus };
    if (runtime.activationState === "active" && runtime.revision === discovered.advertisedRevision) {
      this.completeOperationStatus({ activationState: "active", activeRevision: runtime.revision, sourceRevision: runtime.manifest?.sourceRevision, advertisedRevision: runtime.revision, connectivity: "online", schemaCompatibility: "compatible", cacheFreshness: "current", restoreOutcome: "idle", refreshOutcome: "succeeded", lastDiagnostic: undefined });
      return { success: true, activeRevision: runtime.revision, changed: false };
    }
    const activation = await activateCatalogRuntime(runtime, options);
    if (!activation.success && activation.kind === "activation-failed") {
      this.synchronizeFailedRuntime(discovered.advertisedRevision, activation.cause);
      return { success: false, reason: "activation-failed", status: this.runtimeStatus };
    }
    if (!activation.success) {
      this.synchronizeInconsistentRuntime(discovered.advertisedRevision);
      return { success: false, reason: "runtime-inconsistent", status: this.runtimeStatus };
    }
    this.synchronizeSuccessfulRuntime();
    return { success: true, activeRevision: activation.revision, changed: true };
  }

  private synchronizeSuccessfulRuntime(): boolean {
    const runtime = this.runtimeService;
    if (runtime === null || runtime.activationState !== "active" || runtime.revision === undefined || runtime.manifest === undefined || runtime.manifest.catalogRevision !== runtime.revision) return false;
    this.completeOperationStatus({ activationState: "active", activeRevision: runtime.revision, advertisedRevision: runtime.revision, sourceRevision: runtime.manifest.sourceRevision, schemaCompatibility: "compatible", connectivity: "online", cacheFreshness: "current", restoreOutcome: "idle", refreshOutcome: "succeeded", lastDiagnostic: undefined });
    return true;
  }

  private synchronizeFailedRuntime(candidateRevision: CatalogRevision, error: unknown): void {
    const runtime = this.runtimeService;
    const active = runtime?.activationState === "active" && runtime.revision !== undefined && runtime.manifest?.catalogRevision === runtime.revision;
    const diagnostic = error instanceof CatalogRuntimeError
      ? statusDiagnosticFromRuntimeError(error)
      : this.safeDiagnostic("Catalog activation failed.", "activation-failed", candidateRevision);
    this.completeOperationStatus({
      activationState: active ? "active" : "inactive",
      activeRevision: active ? runtime!.revision : undefined,
      sourceRevision: active ? runtime!.manifest!.sourceRevision : undefined,
      advertisedRevision: candidateRevision, refreshOutcome: "failed", lastDiagnostic: diagnostic,
    });
  }

  private updateCheckFromStatus(): CatalogUpdateCheckResult {
    const status = this.runtimeStatus;
    if (status.schemaCompatibility === "incompatible") return { success: false, reason: "incompatible", diagnostic: status.lastDiagnostic };
    if (status.advertisedRevision !== undefined && status.schemaCompatibility === "compatible") return { success: true, advertisedRevision: status.advertisedRevision, compatible: true, updateAvailable: status.activeRevision !== status.advertisedRevision };
    return { success: false, reason: status.configuredUrl === undefined ? "not-configured" : "unavailable", diagnostic: status.lastDiagnostic };
  }

  private finishDiscovery(fromRefresh: boolean, update: Partial<CatalogRuntimeStatusInput>): void {
    if (fromRefresh && update.refreshOutcome !== "failed") {
      // Discovery is internal to the refresh transaction.  Publishing its
      // facts here would emit a second pending snapshot; the committed
      // runtime supplies the authoritative final facts after activate().
      return;
    }
    this.completeOperationStatus(update);
  }

  private completeOperationStatus(update: Partial<CatalogRuntimeStatusInput>): void {
    this.updateStatus({ ...update, onlineCheckPending: false, lastRefreshAt: (this.config.now ?? (() => new Date()))().toISOString() });
  }

  private synchronizeInconsistentRuntime(candidateRevision: CatalogRevision): void {
    const runtime = this.runtimeService;
    const active = runtime?.activationState === "active" && runtime.revision !== undefined && runtime.manifest?.catalogRevision === runtime.revision;
    this.completeOperationStatus({
      activationState: active ? "active" : "inactive",
      activeRevision: active ? runtime!.revision : undefined,
      sourceRevision: active ? runtime!.manifest!.sourceRevision : undefined,
      advertisedRevision: candidateRevision,
      refreshOutcome: "failed",
      lastDiagnostic: this.safeDiagnostic("Catalog activation completed without a consistent runtime.", "runtime-inconsistent", candidateRevision),
    });
  }

  /** Read the committed runtime only; this never activates or mutates it. */
  private runtimeSnapshotFacts(): Pick<CatalogRuntimeStatusInput, "activationState" | "activeRevision" | "sourceRevision"> {
    const runtime = this.runtimeService;
    const active = runtime?.activationState === "active" && runtime.revision !== undefined && runtime.manifest?.catalogRevision === runtime.revision;
    return active
      ? { activationState: "active", activeRevision: runtime!.revision, sourceRevision: runtime!.manifest!.sourceRevision }
      : { activationState: "inactive", activeRevision: undefined, sourceRevision: undefined };
  }

  private safeDiagnostic(message: string, reason: string, candidateRevision?: CatalogRevision): CatalogRuntimeStatusInput["lastDiagnostic"] {
    return { message, reason, ...(candidateRevision === undefined ? {} : { candidateRevision }), recoverable: true };
  }

  private applyRestoreResult(result: CatalogRestoreResult): void {
    if (result.success) {
      const runtime = this.runtimeService;
      if (
        runtime === null || runtime.activationState !== "active" ||
        runtime.revision === undefined || runtime.manifest === undefined
      ) {
        this.updateStatus({
          activationState: "inactive", activeRevision: undefined, sourceRevision: undefined,
          schemaCompatibility: "unknown", cacheFreshness: "none", restoreOutcome: "failed",
          lastDiagnostic: { message: "Catalog restoration reported success without an active runtime.", reason: "runtime-inconsistent", recoverable: false },
        });
        return;
      }
      this.updateStatus({
        activationState: runtime.activationState,
        activeRevision: runtime.revision,
        sourceRevision: runtime.manifest.sourceRevision,
        schemaCompatibility: "compatible",
        connectivity: "unknown",
        cacheFreshness: "offline",
        restoreOutcome: "restored-offline",
        lastDiagnostic: undefined,
      });
      return;
    }
    if (result.reason === "invalid-pointer") {
      this.updateStatus({
        activationState: "inactive", activeRevision: undefined, sourceRevision: undefined,
        schemaCompatibility: "unknown", connectivity: "unknown", cacheFreshness: "none",
        restoreOutcome: "idle", lastDiagnostic: undefined,
      });
      return;
    }
    this.updateStatus({
      activationState: "inactive", activeRevision: undefined, sourceRevision: undefined,
      schemaCompatibility: result.reason === "schema-incompatible" ? "incompatible" : "unknown",
      connectivity: "unknown", cacheFreshness: "none", restoreOutcome: "failed",
      lastDiagnostic: statusDiagnosticFromRestore(result),
    });
  }

  private clearResolvedEntity(entityId: string): void {
    if (this.unresolvedEntityIds.delete(entityId)) {
      this.updateStatus({ unresolvedEntityCount: this.unresolvedEntityIds.size });
    }
  }

  private updateStatus(update: Partial<CatalogRuntimeStatusInput>): void {
    this.statusFacts = { ...this.statusFacts, ...update };
    const next = deriveCatalogRuntimeStatus(this.statusFacts);
    if (JSON.stringify(next) === JSON.stringify(this.runtimeStatus)) return;
    this.runtimeStatus = next;
    for (const listener of this.statusListeners) this.notifyStatusListener(listener);
  }

  private notifyStatusListener(listener: (status: CatalogRuntimeStatusSnapshot) => void): void {
    try {
      listener(this.runtimeStatus);
    } catch {
      // Status observers must not interfere with service behavior or peers.
    }
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
