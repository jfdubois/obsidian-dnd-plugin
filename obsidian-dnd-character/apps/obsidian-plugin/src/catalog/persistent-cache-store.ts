/**
 * Persistent catalog cache store backed by Obsidian's
 * Plugin.loadData() / Plugin.saveData() API.
 *
 * Mobile-compatible via CapacitorAdapter. Stores cache
 * envelopes under a top-level `catalogCache` key in the
 * plugin's data.json, separate from settings.
 *
 * Every envelope is serialized to JSON and validated on
 * load. Malformed entries are reported as diagnostics and
 * treated as cache misses without corrupting the store.
 */

import type { Plugin } from "obsidian";
import type {
  CatalogCacheStore,
  CacheEnvelope,
  CacheStoreDiagnostic,
  CacheExpirationPolicy,
} from "@obsidian-dnd/catalog-contract";
import {
  CACHE_SCHEMA_VERSION,
  isCacheEnvelope,
  isCatalogCacheKey,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import {
  catalogRevisionStr,
  createCatalogRevision,
} from "@obsidian-dnd/domain";

/* ── Constants ──────────────────────────────────────────────────── */

/** Top-level key in plugin data.json for catalog cache data. */
const CATALOG_CACHE_DATA_KEY = "catalogCache";

/**
 * Type for the raw persisted cache data structure.
 * Keys are cache keys; values are serialized envelopes.
 */
type PersistedCatalogCacheData = Record<string, unknown>;

/* ── Store implementation ───────────────────────────────────────── */

/**
 * Persistent catalog cache store using Obsidian Plugin
 * loadData / saveData API.
 *
 * Thread-safe within a single Obsidian instance. Not
 * shared across windows or tabs (each has its own Plugin
 * instance).
 *
 * Write failures do not destroy previous entries because
 * Obsidian's saveData atomically replaces data.json. If
 * saveData throws, the previous data.json remains intact.
 */
export class PersistentCatalogCacheStore implements CatalogCacheStore {
  private plugin: Plugin;
  /** In-memory cache of envelopes loaded from disk. */
  private envelopes: Map<string, CacheEnvelope<unknown>> = new Map();
  /** Diagnostics collected during load. */
  private diagnostics_: CacheStoreDiagnostic[] = [];
  /** Whether the store has been initialized from disk. */
  private initialized = false;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */

  /**
   * Load persisted cache data from disk into memory.
   * Call once during plugin onload.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const raw = await this.plugin.loadData();
    const cacheData = (raw && typeof raw === "object" && CATALOG_CACHE_DATA_KEY in raw)
      ? (raw as Record<string, unknown>)[CATALOG_CACHE_DATA_KEY]
      : null;

    if (cacheData && typeof cacheData === "object" && !Array.isArray(cacheData)) {
      const entries = cacheData as PersistedCatalogCacheData;
      for (const [key, rawValue] of Object.entries(entries)) {
        const envelope = this.deserializeEnvelope(key, rawValue);
        if (envelope !== null) {
          this.envelopes.set(key, envelope);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Persist current in-memory envelopes to disk.
   * Call during plugin onunload or after bulk writes.
   */
  async flush(): Promise<void> {
    if (!this.initialized) return;

    const raw = await this.plugin.loadData();
    const currentCache = this.serializeAll();

    // Merge with existing plugin data to preserve settings.
    const updated = {
      ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
      [CATALOG_CACHE_DATA_KEY]: currentCache,
    };

    await this.plugin.saveData(updated);
  }

  /* ── CatalogCacheStore interface ──────────────────────────── */

  async get<T>(key: string): Promise<CacheEnvelope<T> | null> {
    await this.ensureInitialized();
    const entry = this.envelopes.get(key);
    if (entry === undefined) {
      return null;
    }
    return entry as CacheEnvelope<T>;
  }

  async set<T>(key: string, envelope: CacheEnvelope<T>): Promise<void> {
    await this.ensureInitialized();
    this.envelopes.set(key, envelope as CacheEnvelope<unknown>);
    await this.flush();
  }

  async invalidate(key: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.envelopes.delete(key)) {
      return false;
    }
    await this.flush();
    return true;
  }

  async invalidateByRevision(revision: CatalogRevision): Promise<number> {
    await this.ensureInitialized();
    const revisionStr = catalogRevisionStr(revision);
    let count = 0;
    for (const [key, envelope] of this.envelopes) {
      if (catalogRevisionStr(envelope.catalogRevision) === revisionStr) {
        this.envelopes.delete(key);
        count += 1;
      }
    }
    if (count > 0) {
      await this.flush();
    }
    return count;
  }

  async clear(): Promise<number> {
    await this.ensureInitialized();
    // Only clear catalog cache keys, not other plugin data.
    const keysToRemove: string[] = [];
    for (const key of this.envelopes.keys()) {
      if (isCatalogCacheKey(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.envelopes.delete(key);
    }
    if (keysToRemove.length > 0) {
      await this.flush();
    }
    return keysToRemove.length;
  }

  keys(): string[] {
    return Array.from(this.envelopes.keys());
  }

  size(): number {
    return this.envelopes.size;
  }

  diagnostics(): CacheStoreDiagnostic[] {
    return this.diagnostics_;
  }

  /* ── Serialization helpers ─────────────────────────────────── */

  private ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      return this.initialize();
    }
    return Promise.resolve();
  }

  private deserializeEnvelope(
    key: string,
    raw: unknown,
  ): CacheEnvelope<unknown> | null {
    if (raw === null || raw === undefined) {
      this.diagnostics_.push({
        key,
        reason: "null-value",
      });
      return null;
    }

    if (typeof raw !== "object" || Array.isArray(raw)) {
      this.diagnostics_.push({
        key,
        reason: "not-an-object",
        rawData: raw,
      });
      return null;
    }

    const obj = raw as Record<string, unknown>;

    // Validate cache schema version.
    if (
      typeof obj.cacheSchemaVersion !== "number" ||
      obj.cacheSchemaVersion !== CACHE_SCHEMA_VERSION
    ) {
      this.diagnostics_.push({
        key,
        reason: "bad-schema-version",
        rawData: raw,
      });
      return null;
    }

    // Validate catalog revision (stored as string, reconstructed as branded type).
    if (typeof obj.catalogRevision !== "string" || obj.catalogRevision.length === 0) {
      this.diagnostics_.push({
        key,
        reason: "bad-catalog-revision",
        rawData: raw,
      });
      return null;
    }

    // Validate input hash.
    if (typeof obj.inputHash !== "string" || obj.inputHash.length === 0) {
      this.diagnostics_.push({
        key,
        reason: "bad-input-hash",
        rawData: raw,
      });
      return null;
    }

    // Validate created at (ISO 8601 string).
    if (typeof obj.createdAt !== "string" || obj.createdAt.length === 0) {
      this.diagnostics_.push({
        key,
        reason: "bad-created-at",
        rawData: raw,
      });
      return null;
    }

    // Validate expiration.
    if (obj.expiration === undefined || obj.expiration === null) {
      this.diagnostics_.push({
        key,
        reason: "bad-expiration",
        rawData: raw,
      });
      return null;
    }

    // Validate value exists.
    if (!("value" in obj)) {
      this.diagnostics_.push({
        key,
        reason: "missing-value",
        rawData: raw,
      });
      return null;
    }

    // Reconstruct branded types from persisted strings.
    const envelope = {
      cacheSchemaVersion: obj.cacheSchemaVersion as number,
      catalogRevision: createCatalogRevision(obj.catalogRevision as string),
      inputHash: obj.inputHash as string,
      createdAt: obj.createdAt as string,
      expiration: obj.expiration as CacheExpirationPolicy,
      value: obj.value as unknown,
    };

    // Final structural validation using contract-level type guard.
    if (!isCacheEnvelope(envelope)) {
      this.diagnostics_.push({
        key,
        reason: "bad-expiration",
        rawData: raw,
      });
      return null;
    }

    return envelope;
  }

  private serializeAll(): PersistedCatalogCacheData {
    const result: PersistedCatalogCacheData = {};
    for (const [key, envelope] of this.envelopes) {
      result[key] = {
        cacheSchemaVersion: envelope.cacheSchemaVersion,
        catalogRevision: catalogRevisionStr(envelope.catalogRevision),
        inputHash: envelope.inputHash,
        createdAt: envelope.createdAt,
        expiration: envelope.expiration,
        value: envelope.value,
      };
    }
    return result;
  }
}
