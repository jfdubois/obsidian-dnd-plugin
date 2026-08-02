/**
 * Tests for CatalogCacheStore interface and
 * InMemoryCatalogCacheStore implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryCatalogCacheStore,
  type CatalogCacheStore,
} from "./cache-store";
import {
  createCacheEnvelope,
  createNoExpiryExpiration,
} from "./cache-envelope";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Helpers ─────────────────────────────────────────────────────── */

function makeEnvelope(
  revision: string,
  inputHash: string,
  value: unknown,
) {
  return createCacheEnvelope({
    cacheSchemaVersion: 1,
    catalogRevision: createCatalogRevision(revision),
    inputHash,
    createdAt: "2026-08-01T00:00:00Z",
    expiration: createNoExpiryExpiration(),
    value,
  });
}

/* ── get / set round-trip ────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore get/set", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("stores and retrieves an envelope", async () => {
    const envelope = makeEnvelope("rev-001", "hash-a", { id: "species:human" });
    await store.set("species:human", envelope);

    const result = await store.get<{ id: string }>("species:human");
    expect(result).not.toBeNull();
    expect(result!.value).toEqual({ id: "species:human" });
  });

  it("overwrites an existing key", async () => {
    const first = makeEnvelope("rev-001", "hash-a", "first");
    const second = makeEnvelope("rev-001", "hash-b", "second");

    await store.set("species:human", first);
    await store.set("species:human", second);

    const result = await store.get<string>("species:human");
    expect(result).not.toBeNull();
    expect(result!.value).toBe("second");
    expect(result!.inputHash).toBe("hash-b");
  });

  it("returns null for non-existent key", async () => {
    const result = await store.get<string>("nonexistent:key");
    expect(result).toBeNull();
  });

  it("returns null after invalidation", async () => {
    const envelope = makeEnvelope("rev-001", "hash-a", "data");
    await store.set("species:human", envelope);

    await store.invalidate("species:human");
    const result = await store.get<string>("species:human");
    expect(result).toBeNull();
  });
});

/* ── Cache envelope round-trip ───────────────────────────────────── */

describe("CacheEnvelope round-trip", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("preserves all envelope metadata", async () => {
    const envelope = makeEnvelope("rev-001", "hash-abc", { name: "test" });
    await store.set("test:key", envelope);

    const result = await store.get<{ name: string }>("test:key");
    expect(result).not.toBeNull();
    expect(result!.cacheSchemaVersion).toBe(1);
    expect(result!.catalogRevision).toBe("rev-001");
    expect(result!.inputHash).toBe("hash-abc");
    expect(result!.createdAt).toBe("2026-08-01T00:00:00Z");
    expect(result!.expiration.kind).toBe("no-expiry");
  });
});

/* ── invalidate ──────────────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore invalidate", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("returns true for existing key", async () => {
    await store.set("key:1", makeEnvelope("rev-001", "h", "v"));
    const result = await store.invalidate("key:1");
    expect(result).toBe(true);
  });

  it("returns false for non-existent key", async () => {
    const result = await store.invalidate("nonexistent");
    expect(result).toBe(false);
  });

  it("does not affect other keys", async () => {
    await store.set("key:1", makeEnvelope("rev-001", "h", "v1"));
    await store.set("key:2", makeEnvelope("rev-001", "h", "v2"));

    await store.invalidate("key:1");

    const r1 = await store.get<string>("key:1");
    const r2 = await store.get<string>("key:2");
    expect(r1).toBeNull();
    expect(r2).not.toBeNull();
    expect(r2!.value).toBe("v2");
  });
});

/* ── invalidateByRevision ────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore invalidateByRevision", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("removes all entries for a revision", async () => {
    await store.set("key:1", makeEnvelope("rev-001", "h", "v1"));
    await store.set("key:2", makeEnvelope("rev-001", "h", "v2"));
    await store.set("key:3", makeEnvelope("rev-002", "h", "v3"));

    const count = await store.invalidateByRevision(
      createCatalogRevision("rev-001"),
    );
    expect(count).toBe(2);
    expect(store.size()).toBe(1);

    const remaining = await store.get<string>("key:3");
    expect(remaining).not.toBeNull();
    expect(remaining!.value).toBe("v3");
  });

  it("returns 0 for unknown revision", async () => {
    await store.set("key:1", makeEnvelope("rev-001", "h", "v"));
    const count = await store.invalidateByRevision(
      createCatalogRevision("unknown"),
    );
    expect(count).toBe(0);
    expect(store.size()).toBe(1);
  });

  it("handles empty store", async () => {
    const count = await store.invalidateByRevision(
      createCatalogRevision("rev-001"),
    );
    expect(count).toBe(0);
  });
});

/* ── clear ───────────────────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore clear", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("removes all entries and returns count", async () => {
    await store.set("key:1", makeEnvelope("rev-001", "h", "v1"));
    await store.set("key:2", makeEnvelope("rev-002", "h", "v2"));
    await store.set("key:3", makeEnvelope("rev-001", "h", "v3"));

    const count = await store.clear();
    expect(count).toBe(3);
    expect(store.size()).toBe(0);
    expect(store.keys()).toEqual([]);
  });

  it("returns 0 for empty store", async () => {
    const count = await store.clear();
    expect(count).toBe(0);
  });
});

/* ── keys and size ───────────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore keys/size", () => {
  let store: CatalogCacheStore;

  beforeEach(() => {
    store = new InMemoryCatalogCacheStore();
  });

  it("returns empty keys for empty store", () => {
    expect(store.keys()).toEqual([]);
    expect(store.size()).toBe(0);
  });

  it("lists all keys", async () => {
    await store.set("species:human", makeEnvelope("r1", "h", "v"));
    await store.set("species:elf", makeEnvelope("r1", "h", "v"));
    await store.set("class:fighter", makeEnvelope("r1", "h", "v"));

    const keys = store.keys();
    expect(keys.length).toBe(3);
    expect(keys).toContain("species:human");
    expect(keys).toContain("species:elf");
    expect(keys).toContain("class:fighter");
  });

  it("size matches number of entries", async () => {
    expect(store.size()).toBe(0);
    await store.set("k1", makeEnvelope("r1", "h", "v"));
    expect(store.size()).toBe(1);
    await store.set("k2", makeEnvelope("r1", "h", "v"));
    expect(store.size()).toBe(2);
    await store.invalidate("k1");
    expect(store.size()).toBe(1);
  });
});

/* ── Large cache stress ──────────────────────────────────────────── */

describe("InMemoryCatalogCacheStore large cache", () => {
  it("handles 100+ entries", async () => {
    const store = new InMemoryCatalogCacheStore();
    const rev = createCatalogRevision("rev-stress");

    for (let i = 0; i < 150; i++) {
      await store.set(
        `entity:${i}`,
        makeEnvelope("rev-stress", `hash-${i}`, { index: i }),
      );
    }

    expect(store.size()).toBe(150);

    // Retrieve a random entry
    const result = await store.get<{ index: number }>("entity:75");
    expect(result).not.toBeNull();
    expect(result!.value.index).toBe(75);

    // Invalidate by revision removes all
    const removed = await store.invalidateByRevision(rev);
    expect(removed).toBe(150);
    expect(store.size()).toBe(0);
  });
});
