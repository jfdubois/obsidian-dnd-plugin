/**
 * Tests for CatalogCacheManager fetch-on-miss semantics,
 * invalidation delegation, and stats tracking.
 */

import { describe, it, expect, vi } from "vitest";
import { CatalogCacheManager } from "./cache-manager";
import { InMemoryCatalogCacheStore } from "./cache-store";
import {
  createNoExpiryExpiration,
  createTtlExpiration,
} from "./cache-envelope";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Helpers ─────────────────────────────────────────────────────── */

function createStore() {
  return new InMemoryCatalogCacheStore();
}

function createManager() {
  return new CatalogCacheManager(
    createStore(),
    createNoExpiryExpiration(),
  );
}

/* ── Cache miss ──────────────────────────────────────────────────── */

describe("CatalogCacheManager fetch on miss", () => {
  it("calls fetchFn and stores result", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue({ id: "species:human" });
    const revision = createCatalogRevision("rev-001");

    const result = await manager.fetch(
      "species:human",
      fetchFn,
      revision,
      "hash-abc",
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.value).toEqual({ id: "species:human" });
    expect(result.catalogRevision).toBe("rev-001");
    expect(result.inputHash).toBe("hash-abc");
    expect(manager.stats().misses).toBe(1);
  });

  it("creates envelope with correct schema version", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");

    const result = await manager.fetch(
      "key:1",
      fetchFn,
      createCatalogRevision("rev-001"),
      "hash-1",
    );

    expect(result.cacheSchemaVersion).toBe(1);
  });
});

/* ── Cache hit ───────────────────────────────────────────────────── */

describe("CatalogCacheManager fetch on hit", () => {
  it("returns stored envelope without calling fetchFn", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");
    const revision = createCatalogRevision("rev-001");

    // First call: miss
    await manager.fetch("key:1", fetchFn, revision, "hash-1");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Second call: hit
    await manager.fetch("key:1", fetchFn, revision, "hash-1");
    expect(fetchFn).toHaveBeenCalledTimes(1); // not called again

    expect(manager.stats().hits).toBe(1);
    expect(manager.stats().misses).toBe(1);
  });
});

/* ── Different inputHash creates new entry ───────────────────────── */

describe("CatalogCacheManager fetch with different inputHash", () => {
  it("creates a new cache entry", async () => {
    const manager = createManager();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");
    const revision = createCatalogRevision("rev-001");

    await manager.fetch("key:1", fetchFn, revision, "hash-old");
    await manager.fetch("key:1", fetchFn, revision, "hash-new");

    expect(fetchFn).toHaveBeenCalledTimes(2);
    // The second call overwrote the first
    const result = await manager.fetch("key:1", fetchFn, revision, "hash-new");
    expect(result.value).toBe("v2");
    expect(manager.stats().misses).toBe(2);
  });
});

/* ── Different revision invalidates cache ────────────────────────── */

describe("CatalogCacheManager fetch with different revision", () => {
  it("treats as miss and fetches new value", async () => {
    const manager = createManager();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await manager.fetch(
      "key:1",
      fetchFn,
      createCatalogRevision("rev-001"),
      "hash-1",
    );
    await manager.fetch(
      "key:1",
      fetchFn,
      createCatalogRevision("rev-002"),
      "hash-1",
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

/* ── Stats tracking ──────────────────────────────────────────────── */

describe("CatalogCacheManager stats", () => {
  it("starts with zero stats", () => {
    const manager = createManager();
    const s = manager.stats();
    expect(s.hits).toBe(0);
    expect(s.misses).toBe(0);
    expect(s.hitRate).toBe(0);
    expect(s.size).toBe(0);
  });

  it("tracks hits and misses correctly", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");
    const revision = createCatalogRevision("rev-001");

    // 3 misses
    await manager.fetch("k1", fetchFn, revision, "h");
    await manager.fetch("k2", fetchFn, revision, "h");
    await manager.fetch("k3", fetchFn, revision, "h");

    // 2 hits
    await manager.fetch("k1", fetchFn, revision, "h");
    await manager.fetch("k2", fetchFn, revision, "h");

    const s = manager.stats();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(3);
    expect(s.hitRate).toBeCloseTo(0.4); // 2 / 5
    expect(s.size).toBe(3);
  });

  it("hitRate is 0 when no lookups", () => {
    const manager = createManager();
    expect(manager.stats().hitRate).toBe(0);
  });
});

/* ── Invalidation delegation ─────────────────────────────────────── */

describe("CatalogCacheManager invalidation", () => {
  it("invalidate delegates to store", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");
    const revision = createCatalogRevision("rev-001");

    await manager.fetch("key:1", fetchFn, revision, "h");
    const removed = await manager.invalidate("key:1");
    expect(removed).toBe(true);

    // Now a fetch should miss again
    const fetchFn2 = vi.fn().mockResolvedValue("new-data");
    await manager.fetch("key:1", fetchFn2, revision, "h");
    expect(fetchFn2).toHaveBeenCalledTimes(1);
  });

  it("invalidateByRevision delegates to store", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");
    const rev1 = createCatalogRevision("rev-001");
    const rev2 = createCatalogRevision("rev-002");

    await manager.fetch("k1", fetchFn, rev1, "h");
    await manager.fetch("k2", fetchFn, rev1, "h");
    await manager.fetch("k3", fetchFn, rev2, "h");

    const count = await manager.invalidateByRevision(rev1);
    expect(count).toBe(2);
    expect(manager.stats().size).toBe(1);
  });

  it("clear delegates to store", async () => {
    const manager = createManager();
    const fetchFn = vi.fn().mockResolvedValue("data");

    await manager.fetch(
      "k1",
      fetchFn,
      createCatalogRevision("r1"),
      "h",
    );
    await manager.fetch(
      "k2",
      fetchFn,
      createCatalogRevision("r1"),
      "h",
    );

    const count = await manager.clear();
    expect(count).toBe(2);
    expect(manager.stats().size).toBe(0);
  });
});

/* ── TTL expiration ──────────────────────────────────────────────── */

describe("CatalogCacheManager with TTL expiration", () => {
  it("expired entry causes cache miss", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createTtlExpiration(1000), // 1 second TTL
    );

    // Pre-populate store with an envelope created 2 seconds ago
    // so it is guaranteed expired when fetched
    const { createCacheEnvelope } = await import("./cache-envelope");
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "h",
      createdAt: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
      expiration: createTtlExpiration(1000),
      value: "stale",
    });
    await store.set("key:1", oldEnvelope);

    // Fetch should see the entry as expired and call fetchFn
    const fetchFn = vi.fn().mockResolvedValue("fresh");
    const result = await manager.fetch(
      "key:1",
      fetchFn,
      createCatalogRevision("rev-001"),
      "h",
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.value).toBe("fresh");
    expect(manager.stats().misses).toBe(1);
  });
});

/* ── getCached ─────────────────────────────────────────────────── */

describe("CatalogCacheManager getCached", () => {
  it("returns envelope for existing key", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");

    await manager.fetch("key:1", () => Promise.resolve("data"), revision, "h");
    const envelope = await manager.getCached("key:1");

    expect(envelope).not.toBeNull();
    expect(envelope!.value).toBe("data");
  });

  it("returns null for missing key", async () => {
    const manager = createManager();
    const envelope = await manager.getCached("missing");

    expect(envelope).toBeNull();
  });

  it("returns expired envelope", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createTtlExpiration(1000),
    );

    const { createCacheEnvelope } = await import("./cache-envelope");
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "h",
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
      value: "stale",
    });
    await store.set("key:1", oldEnvelope);

    const envelope = await manager.getCached("key:1");
    expect(envelope).not.toBeNull();
    expect(envelope!.value).toBe("stale");
  });

  it("does not increment hit stats", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");

    await manager.fetch("key:1", () => Promise.resolve("data"), revision, "h");
    const before = manager.stats();

    await manager.getCached("key:1");
    const after = manager.stats();

    expect(after.hits).toBe(before.hits);
    expect(after.misses).toBe(before.misses);
  });
});

/* ── fetchWithOfflineFallback ──────────────────────────────────── */

describe("CatalogCacheManager fetchWithOfflineFallback", () => {
  it("returns cached data on network error", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );
    const revision = createCatalogRevision("rev-001");

    // Pre-populate cache
    await manager.fetch(
      "key:1",
      () => Promise.resolve("original"),
      revision,
      "h",
    );

    // Network error triggers fallback
    const networkErr = new Error("network error");
    const result = await manager.fetchWithOfflineFallback(
      "key:1",
      () => Promise.reject(networkErr),
      revision,
      "h",
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.envelope.value).toBe("original");
  });

  it("re-throws when no cache exists", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");
    const networkErr = new Error("network error");

    await expect(
      manager.fetchWithOfflineFallback(
        "missing",
        () => Promise.reject(networkErr),
        revision,
        "h",
      ),
    ).rejects.toThrow("network error");
  });

  it("returns fromCache=true for valid hits", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");

    // Pre-populate
    await manager.fetch(
      "key:1",
      () => Promise.resolve("data"),
      revision,
      "h",
    );

    const result = await manager.fetchWithOfflineFallback(
      "key:1",
      () => Promise.resolve("should-not-call"),
      revision,
      "h",
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.envelope.value).toBe("data");
  });

  it("returns stale=true for expired fallback", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createTtlExpiration(1000),
    );

    const { createCacheEnvelope } = await import("./cache-envelope");
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "h",
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
      value: "stale-data",
    });
    await store.set("key:1", oldEnvelope);

    const networkErr = new Error("network error");
    const result = await manager.fetchWithOfflineFallback(
      "key:1",
      () => Promise.reject(networkErr),
      createCatalogRevision("rev-001"),
      "h",
      undefined,
      { allowStale: true },
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(true);
    expect(result.envelope.value).toBe("stale-data");
  });
});

/* ── Schema version enforcement ─────────────────────────────────── */

describe("CatalogCacheManager fetch schema version enforcement", () => {
  it("returns cache hit for schema-compatible envelope", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");

    // Pre-populate with current schema version
    await manager.fetch(
      "key:1",
      () => Promise.resolve("data"),
      revision,
      "h",
    );

    // Second call should be a cache hit
    const fetchFn = vi.fn().mockResolvedValue("should-not-call");
    await manager.fetch("key:1", fetchFn, revision, "h");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(manager.stats().hits).toBe(1);
  });

  it("treats schema-mismatched envelope as cache miss", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );

    // Pre-populate store with an envelope that has a different schema version
    const { createCacheEnvelope } = await import("./cache-envelope");
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 99, // intentionally wrong
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "h",
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: "stale-schema",
    });
    await store.set("key:1", oldEnvelope);

    // Fetch should see schema mismatch and call fetchFn
    const fetchFn = vi.fn().mockResolvedValue("fresh");
    const result = await manager.fetch(
      "key:1",
      fetchFn,
      createCatalogRevision("rev-001"),
      "h",
    );

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.value).toBe("fresh");
    expect(result.cacheSchemaVersion).toBe(1); // new envelope has current version
    expect(manager.stats().misses).toBe(1);
  });

  it("offline fallback rejects schema-mismatched envelope", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );

    // Pre-populate with old schema version
    const { createCacheEnvelope } = await import("./cache-envelope");
    const oldEnvelope = createCacheEnvelope({
      cacheSchemaVersion: 99,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "h",
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: "old-schema-data",
    });
    await store.set("key:1", oldEnvelope);

    const networkErr = new Error("network error");
    await expect(
      manager.fetchWithOfflineFallback(
        "key:1",
        () => Promise.reject(networkErr),
        createCatalogRevision("rev-001"),
        "h",
      ),
    ).rejects.toThrow("network error");
  });
});

/* ── Runtime value validation ───────────────────────────────────── */

describe("CatalogCacheManager fetch with valueValidator", () => {
  it("returns cache hit when validator passes", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );
    const revision = createCatalogRevision("rev-001");

    // Pre-populate cache
    await manager.fetch(
      "key:1",
      () => Promise.resolve({ valid: true }),
      revision,
      "h",
    );

    // Second call with validator that passes
    const fetchFn = vi.fn().mockResolvedValue({ valid: false });
    const validator = (v: unknown): v is { valid: boolean } =>
      typeof v === "object" && v !== null && (v as { valid: boolean }).valid === true;

    const result = await manager.fetch(
      "key:1",
      fetchFn,
      revision,
      "h",
      validator,
    );

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.value).toEqual({ valid: true });
    expect(manager.stats().hits).toBe(1);
  });

  it("treats validator failure as cache miss", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );
    const revision = createCatalogRevision("rev-001");

    // Pre-populate cache with data that will fail validator
    await manager.fetch(
      "key:1",
      () => Promise.resolve({ valid: false }),
      revision,
      "h",
    );
    const missesBefore = manager.stats().misses;

    // Fetch with validator that rejects cached value
    const fetchFn = vi.fn().mockResolvedValue({ valid: true });
    const validator = (v: unknown): v is { valid: boolean } =>
      typeof v === "object" && v !== null && (v as { valid: boolean }).valid === true;

    const result = await manager.fetch(
      "key:1",
      fetchFn,
      revision,
      "h",
      validator,
    );

    // Validator failed, so fetchFn was called
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.value).toEqual({ valid: true });
    expect(manager.stats().misses).toBe(missesBefore + 1);
  });

  it("skips validator when not provided", async () => {
    const manager = createManager();
    const revision = createCatalogRevision("rev-001");

    // Pre-populate cache
    await manager.fetch(
      "key:1",
      () => Promise.resolve("data"),
      revision,
      "h",
    );

    // Second call without validator should be cache hit
    const fetchFn = vi.fn().mockResolvedValue("should-not-call");
    await manager.fetch("key:1", fetchFn, revision, "h");

    expect(fetchFn).not.toHaveBeenCalled();
    expect(manager.stats().hits).toBe(1);
  });

  it("offline fallback with validator re-fetches on failure", async () => {
    const store = createStore();
    const manager = new CatalogCacheManager(
      store,
      createNoExpiryExpiration(),
    );
    const revision = createCatalogRevision("rev-001");

    // Pre-populate cache with data that will fail validator
    await manager.fetch(
      "key:1",
      () => Promise.resolve({ valid: false }),
      revision,
      "h",
    );

    // Fetch with offline fallback and validator that rejects
    const fetchFn = vi.fn().mockResolvedValue({ valid: true });
    const validator = (v: unknown): v is { valid: boolean } =>
      typeof v === "object" && v !== null && (v as { valid: boolean }).valid === true;

    const result = await manager.fetchWithOfflineFallback(
      "key:1",
      fetchFn,
      revision,
      "h",
      validator,
    );

    // Validator failed, so fetchFn was called
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.fromCache).toBe(false);
    expect(result.stale).toBe(false);
    expect(result.envelope.value).toEqual({ valid: true });
  });
});
