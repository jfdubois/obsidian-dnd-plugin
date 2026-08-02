/**
 * Integration tests for catalog transport + cache interaction.
 *
 * Verifies that:
 * - Mock requestUrl returns specific responses
 * - Cache store receives envelopes after fetch
 * - Cache hit prevents additional network calls
 * - Cache invalidation forces re-fetch
 * - Different revisions create separate cache entries
 *
 * Store and manager unit tests live in catalog-contract;
 * this file focuses on the transport layer wired through the cache.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RequestUrlCatalogClient } from "./request-url-client";
import type { CatalogClient, CatalogClientConfig } from "./client";
import {
  CatalogCacheManager,
  InMemoryCatalogCacheStore,
  createNoExpiryExpiration,
  createTtlExpiration,
  createCacheEnvelope,
  createCatalogManifest,
  createCatalogSource,
  createCatalogEntitySummary,
  createSpeciesRule,
  createRenderParagraph,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";

/* ── Mock setup ────────────────────────────────────────────────── */

const mockRequestUrl = vi.fn();

vi.mock("obsidian", () => ({
  requestUrl: (...args: unknown[]) => mockRequestUrl(...args),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

const config: CatalogClientConfig = {
  baseUrl: "https://catalog.example.com/catalog/v1",
  timeoutMs: 5000,
};

function createClient() {
  return new RequestUrlCatalogClient(config);
}

function createManager() {
  return new CatalogCacheManager(
    new InMemoryCatalogCacheStore(),
    createNoExpiryExpiration(),
  );
}

function mockResponse(json: unknown) {
  mockRequestUrl.mockResolvedValue({
    status: 200,
    headers: { "content-type": "application/json" },
    arrayBuffer: new ArrayBuffer(0),
    json,
    text: JSON.stringify(json),
  });
}

const rev = createCatalogRevision("rev-001");
const srcId = createSourceId("xphb");
const humanId = createEntityId("species:2024:xphb:human");

function mockManifest() {
  mockResponse(createCatalogManifest({
    schemaVersion: 1,
    catalogRevision: rev,
    sourceRevision: "src-001",
    builderVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [
      "species", "background", "class", "subclass",
      "class-feature", "subclass-feature", "feat",
      "spell", "item", "optional-feature", "skill", "language",
    ],
    checksums: {},
  }));
}

function mockSources() {
  mockResponse([createCatalogSource({
    id: srcId, name: "Player's Handbook", abbreviation: "PHB",
    ruleset: "2024", category: "core",
  })]);
}

function mockIndex() {
  mockResponse([createCatalogEntitySummary({
    id: humanId, kind: "species", name: "Human",
    sourceId: srcId, ruleset: "2024", access: "core",
    legacy: false, tags: ["base"], detailPath: "species/human.json",
  })]);
}

function mockEntity() {
  mockResponse(createSpeciesRule(
    humanId, "Human", srcId, "2024", "core",
    "Medium", 30, false, [], [],
    [createRenderParagraph("A classic humanoid species.")],
    [], [], [], [], false,
  ));
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("Transport + Cache Integration", () => {
  let client: CatalogClient;
  let manager: CatalogCacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createClient();
    manager = createManager();
  });

  afterEach(() => vi.restoreAllMocks());

  /* ── Fetch populates cache ──────────────────────────────────── */

  it("fetchManifest populates cache after first call", async () => {
    mockManifest();
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    expect(manager.stats().misses).toBe(1);
    expect(manager.stats().size).toBe(1);
  });

  it("fetchSources populates cache and returns data", async () => {
    mockSources();
    const result = await manager.fetch("sources", () => client.fetchSources(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    expect(result.value).toHaveLength(1);
    const first = result.value[0];
    expect(first).not.toBeUndefined();
    expect(first!.name).toBe("Player's Handbook");
  });

  it("fetchIndex populates cache and returns summaries", async () => {
    mockIndex();
    const result = await manager.fetch("index:species", () => client.fetchIndex(rev, "species"), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    expect(result.value).toHaveLength(1);
    const first = result.value[0];
    expect(first).not.toBeUndefined();
    expect(first!.kind).toBe("species");
  });

  it("fetchEntity populates cache and returns entity detail", async () => {
    mockEntity();
    const result = await manager.fetch("entity:human", () => client.fetchEntity(rev, humanId), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    expect(result.value.data.name).toBe("Human");
    expect(result.value.catalogRevision).toBe("rev-001");
  });

  /* ── Cache hit prevents network calls ───────────────────────── */

  it("cache hit prevents additional network calls", async () => {
    mockManifest();
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    expect(manager.stats().hits).toBe(1);
  });

  /* ── Cache invalidation forces re-fetch ─────────────────────── */

  it("invalidate forces re-fetch", async () => {
    mockManifest();
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    await manager.invalidate("manifest");
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });

  it("clear forces all entries to re-fetch", async () => {
    mockManifest();
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    const cleared = await manager.clear();
    expect(cleared).toBe(1);
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });

  it("invalidateByRevision removes entries for that revision", async () => {
    mockManifest();
    const rev1 = createCatalogRevision("rev-001");
    const rev2 = createCatalogRevision("rev-002");
    // Store under different keys so both survive
    await manager.fetch("manifest:rev1", () => client.fetchManifest(rev1), rev1, "h1");
    await manager.fetch("manifest:rev2", () => client.fetchManifest(rev2), rev2, "h2");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    expect(manager.stats().size).toBe(2);
    const removed = await manager.invalidateByRevision(rev1);
    expect(removed).toBe(1);
    expect(manager.stats().size).toBe(1);
    // rev1 key is gone, rev2 key remains
    await manager.fetch("manifest:rev1", () => client.fetchManifest(rev1), rev1, "h1");
    expect(mockRequestUrl).toHaveBeenCalledTimes(3);
    await manager.fetch("manifest:rev2", () => client.fetchManifest(rev2), rev2, "h2");
    expect(mockRequestUrl).toHaveBeenCalledTimes(3);
  });

  /* ── Different revisions under same key overwrite ──────────── */

  it("different revisions under same key overwrite the entry", async () => {
    mockManifest();
    const rev1 = createCatalogRevision("rev-001");
    const rev2 = createCatalogRevision("rev-002");
    await manager.fetch("manifest", () => client.fetchManifest(rev1), rev1, "h");
    await manager.fetch("manifest", () => client.fetchManifest(rev2), rev2, "h");
    // Both are misses (revision mismatch), second overwrites first
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    expect(manager.stats().misses).toBe(2);
    expect(manager.stats().size).toBe(1);
  });

  /* ── Multiple entity kinds cached independently ─────────────── */

  it("multiple entity kinds are cached independently", async () => {
    mockIndex();
    await manager.fetch("index:species", () => client.fetchIndex(rev, "species"), rev, "h-species");
    await manager.fetch("index:feat", () => client.fetchIndex(rev, "feat"), rev, "h-feat");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    expect(manager.stats().size).toBe(2);
    await manager.fetch("index:species", () => client.fetchIndex(rev, "species"), rev, "h-species");
    await manager.fetch("index:feat", () => client.fetchIndex(rev, "feat"), rev, "h-feat");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    expect(manager.stats().hits).toBe(2);
  });

  /* ── Network error does not corrupt cache ───────────────────── */

  it("network error does not corrupt cache", async () => {
    mockRequestUrl.mockRejectedValue(new Error("network failure"));
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h").catch(() => undefined);
    expect(manager.stats().misses).toBe(1);
    expect(manager.stats().size).toBe(0);
    mockManifest();
    const result = await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    expect(result).toBeDefined();
    expect(manager.stats().size).toBe(1);
  });

  /* ── TTL expiration forces re-fetch ─────────────────────────── */

  it("TTL expiration forces re-fetch", async () => {
    const store = new InMemoryCatalogCacheStore();
    const ttlManager = new CatalogCacheManager(store, createTtlExpiration(1000));
    const c2 = createClient();
    mockManifest();
    await ttlManager.fetch("manifest", () => c2.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
    const expired = createCacheEnvelope({
      cacheSchemaVersion: 1, catalogRevision: rev, inputHash: "h",
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000), value: { stale: true },
    });
    await store.set("manifest", expired);
    mockManifest();
    await ttlManager.fetch("manifest", () => c2.fetchManifest(rev), rev, "h");
    expect(mockRequestUrl).toHaveBeenCalledTimes(2);
  });

  /* ── Stats accuracy ─────────────────────────────────────────── */

  it("stats reflect correct hit rate after mixed operations", async () => {
    mockManifest();
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    mockSources();
    await manager.fetch("sources", () => client.fetchSources(rev), rev, "h-src");
    await manager.fetch("manifest", () => client.fetchManifest(rev), rev, "h");
    const stats = manager.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(0.333, 2);
    expect(stats.size).toBe(2);
  });
});
