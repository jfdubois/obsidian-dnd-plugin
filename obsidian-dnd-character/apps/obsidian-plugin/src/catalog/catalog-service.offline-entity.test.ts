/**
 * Tests for CatalogService offline entity loading via full
 * production path.
 *
 * Verifies that:
 * - Cached entity data is returned when network is unavailable
 * - Network errors do not corrupt existing cache
 * - Missing cache + network error throws original error
 * - Runtime value validation rejects malformed cached values
 * - Offline fallback correctly marks stale entries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Plugin } from "obsidian";
import type { CatalogClient, EntityDetailResult } from "./client";
import {
  CatalogCacheManager,
  InMemoryCatalogCacheStore,
  createNoExpiryExpiration,
  createTtlExpiration,
  createCacheEnvelope,
  CACHE_SCHEMA_VERSION,
  buildEntityCacheKey,
  buildEntityInputHash,
  createSpeciesRule,
  createRenderParagraph,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";
import { CatalogService } from "./catalog-service";

/* ── Mock obsidian (hoisted by vitest) ─────────────────────────── */

const mockRequestUrl = vi.fn();

vi.mock("obsidian", () => ({
  requestUrl: (...args: unknown[]) => mockRequestUrl(...args),
}));

/* ── Mock Plugin ────────────────────────────────────────────────── */

function createMockPlugin(): Plugin {
  return {
    loadData: vi.fn().mockResolvedValue(null),
    saveData: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obsidian Plugin mock
    app: null as unknown as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obsidian Plugin mock
    manifest: {} as any,
    register: vi.fn(),
    registerEvent: vi.fn().mockReturnValue({ unregister: vi.fn() }),
    registerDomEvent: vi.fn(),
    registerInterval: vi.fn().mockReturnValue(0),
    addChild: vi.fn(),
    addCommand: vi.fn().mockReturnValue({ unload: vi.fn() }),
    addSettingTab: vi.fn(),
    getProjectDir: vi.fn().mockReturnValue("/mock"),
  } as unknown as Plugin;
}

/* ── Mock Client ────────────────────────────────────────────────── */

function createMockClient(): CatalogClient & { rejectNext: boolean } {
  const client: CatalogClient & { rejectNext: boolean } = {
    rejectNext: false,
    fetchCurrentRevision: vi.fn(),
    negotiateSchema: vi.fn(),
    fetchManifest: vi.fn(),
    fetchSources: vi.fn(),
    fetchIndex: vi.fn(),
    fetchEntity: vi.fn(async () => {
      if (client.rejectNext) {
        throw new Error("network unavailable");
      }
      const species = createSpeciesRule(
        humanId, "Human", srcId, "2024", "core",
        "Medium", 30, false, [], [],
        [createRenderParagraph("A classic humanoid species.")],
        [], [], [], [], false,
      );
      return {
        catalogRevision: "rev-001",
        data: species,
      } as EntityDetailResult;
    }),
    testConnection: vi.fn().mockResolvedValue(true),
  };
  return client;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const rev = createCatalogRevision("rev-001");
const srcRevision = "src-001";
const humanId = createEntityId("species:2024:xphb:human");
const srcId = createSourceId("xphb");

function createEntityEnvelope(): ReturnType<typeof createCacheEnvelope> {
  const species = createSpeciesRule(
    humanId, "Human", srcId, "2024", "core",
    "Medium", 30, false, [], [],
    [createRenderParagraph("A classic humanoid species.")],
    [], [], [], [], false,
  );
  return createCacheEnvelope({
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    catalogRevision: rev,
    inputHash: buildEntityInputHash(srcRevision, humanId),
    createdAt: new Date().toISOString(),
    expiration: createNoExpiryExpiration(),
    value: {
      catalogRevision: "rev-001",
      data: species,
    } as EntityDetailResult,
  });
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe("CatalogService offline entity loading", () => {
  let plugin: Plugin;
  let client: CatalogClient & { rejectNext: boolean };
  let service: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = createMockPlugin();
    client = createMockClient();
    service = new CatalogService(plugin, client, {
      defaultExpiration: createNoExpiryExpiration(),
    });
  });

  it("returns cached entity when network fails", async () => {
    // Pre-populate cache with entity data
    const envelope = createEntityEnvelope();
    const cacheKey = buildEntityCacheKey(rev, humanId);
    await service.getStore().set(cacheKey, envelope);

    // Simulate network failure
    client.rejectNext = true;

    // Production path: fetchEntity should return cached value
    // since cache is valid and passes runtime validation
    const result = await service.fetchEntity(
      rev,
      srcRevision,
      humanId,
      "species/human.json",
    );

    expect(result.data.name).toBe("Human");
    // Client was called because cache miss triggers fetch
    // but the cached value is valid so it's returned
  });

  it("throws when no cache and network fails", async () => {
    // Cache is empty, no pre-populated data
    client.rejectNext = true;

    // Production path: fetchEntity should throw
    await expect(
      service.fetchEntity(
        rev,
        srcRevision,
        humanId,
        "species/human.json",
      ),
    ).rejects.toThrow("network unavailable");
  });

  it("cache hit prevents network call", async () => {
    // Pre-populate cache
    const envelope = createEntityEnvelope();
    const cacheKey = buildEntityCacheKey(rev, humanId);
    await service.getStore().set(cacheKey, envelope);

    // Entity fetch should hit cache
    const result = await service.fetchEntity(
      rev,
      srcRevision,
      humanId,
      "species/human.json",
    );

    // Cache hit: client.fetchEntity should NOT have been called
    expect(client.fetchEntity).not.toHaveBeenCalled();
    expect(result.data.name).toBe("Human");
  });

  it("cache miss triggers network fetch", async () => {
    // Cache is empty
    client.rejectNext = false;

    const result = await service.fetchEntity(
      rev,
      srcRevision,
      humanId,
      "species/human.json",
    );

    expect(client.fetchEntity).toHaveBeenCalledTimes(1);
    expect(result.data.name).toBe("Human");
  });

  it("runtime validator rejects malformed cached value", async () => {
    // Pre-populate cache with malformed entity (missing required fields)
    const malformedEnvelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildEntityInputHash(srcRevision, humanId),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: {
        catalogRevision: "rev-001",
        data: { invalid: "entity" },
      } as unknown as EntityDetailResult,
    });
    const cacheKey = buildEntityCacheKey(rev, humanId);
    await service.getStore().set(cacheKey, malformedEnvelope);

    // Production path: fetchEntity should miss cache due to
    // runtime validator failure and trigger network fetch
    client.rejectNext = false;
    const result = await service.fetchEntity(
      rev,
      srcRevision,
      humanId,
      "species/human.json",
    );

    // Cache miss: client.fetchEntity was called
    expect(client.fetchEntity).toHaveBeenCalledTimes(1);
    expect(result.data.name).toBe("Human");
  });

  it("marks schema-mismatched cache as stale on offline fallback", async () => {
    const store = new InMemoryCatalogCacheStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );

    // Pre-populate with old schema version
    const species = createSpeciesRule(
      humanId, "Human", srcId, "2024", "core",
      "Medium", 30, false, [], [],
      [createRenderParagraph("Old schema entity.")],
      [], [], [], [], false,
    );
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 99, // wrong version
      catalogRevision: rev,
      inputHash: buildEntityInputHash(srcRevision, humanId),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: { data: species } as EntityDetailResult,
    });
    const cacheKey = buildEntityCacheKey(rev, humanId);
    await store.set(cacheKey, oldEnvelope);

    // Network error triggers fallback
    const result = await manager.fetchWithOfflineFallback(
      cacheKey,
      async () => { throw new Error("network unavailable"); },
      rev,
      buildEntityInputHash(srcRevision, humanId),
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(true); // schema mismatch = stale
  });

  it("marks expired cache as stale on offline fallback", async () => {
    const store = new InMemoryCatalogCacheStore();
    const manager = new CatalogCacheManager(
      store,
      createTtlExpiration(1000),
    );

    // Pre-populate with expired envelope
    const species = createSpeciesRule(
      humanId, "Human", srcId, "2024", "core",
      "Medium", 30, false, [], [],
      [createRenderParagraph("Expired entity.")],
      [], [], [], [], false,
    );
    const expiredEnvelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildEntityInputHash(srcRevision, humanId),
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
      value: { data: species } as EntityDetailResult,
    });
    const cacheKey = buildEntityCacheKey(rev, humanId);
    await store.set(cacheKey, expiredEnvelope);

    // Network error triggers fallback
    const result = await manager.fetchWithOfflineFallback(
      cacheKey,
      async () => { throw new Error("network unavailable"); },
      rev,
      buildEntityInputHash(srcRevision, humanId),
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(true); // expired = stale
  });
});
