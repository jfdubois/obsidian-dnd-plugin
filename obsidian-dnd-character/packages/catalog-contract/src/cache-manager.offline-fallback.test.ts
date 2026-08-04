import { describe, expect, it, vi } from "vitest";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import { CatalogCacheManager } from "./cache-manager";
import { InMemoryCatalogCacheStore } from "./cache-store";
import {
  CACHE_SCHEMA_VERSION,
  createCacheEnvelope,
  createNoExpiryExpiration,
  createTtlExpiration,
} from "./cache-envelope";

const revision = createCatalogRevision("rev-001");
const otherRevision = createCatalogRevision("rev-002");

function createManager() {
  const store = new InMemoryCatalogCacheStore();
  const manager = new CatalogCacheManager(store, createNoExpiryExpiration());
  return { store, manager };
}

function envelope(value: unknown, overrides = {}) {
  return createCacheEnvelope({
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    catalogRevision: revision,
    inputHash: "hash-1",
    createdAt: new Date().toISOString(),
    expiration: createNoExpiryExpiration(),
    value,
    ...overrides,
  });
}

describe("CatalogCacheManager offline fallback compatibility", () => {
  it("returns compatible fallback after network failure", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope({ valid: true }));

    const result = await manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
      (value): value is { valid: boolean } =>
        typeof value === "object" && value !== null && "valid" in value,
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.envelope.value).toEqual({ valid: true });
  });

  it("rejects wrong schema fallback", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("bad", { cacheSchemaVersion: 99 }));

    await expect(manager.fetchWithOfflineFallback<{ valid: true }>(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
    )).rejects.toThrow("network unavailable");
  });

  it("rejects wrong revision fallback", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("bad", { catalogRevision: otherRevision }));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
    )).rejects.toThrow("network unavailable");
  });

  it("rejects wrong hash fallback", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("bad", { inputHash: "other-hash" }));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
    )).rejects.toThrow("network unavailable");
  });

  it("rejects malformed value fallback", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope({ valid: false }));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
      (value): value is { valid: true } =>
        typeof value === "object" &&
        value !== null &&
        (value as { valid?: unknown }).valid === true,
    )).rejects.toThrow("network unavailable");
  });

  it("rejects expired fallback when stale fallback is disabled", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("expired", {
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
    }));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
    )).rejects.toThrow("network unavailable");
  });

  it("returns expired compatible fallback only when stale fallback is enabled", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("expired", {
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
    }));

    const result = await manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
      undefined,
      { allowStale: true },
    );

    expect(result.fromCache).toBe(true);
    expect(result.stale).toBe(true);
    expect(result.envelope.value).toBe("expired");
  });

  it("requires runtime validator even when stale fallback is enabled", async () => {
    const { store, manager } = createManager();
    const validatorCalls = vi.fn();
    const validator = (value: unknown): value is { valid: true } => {
      validatorCalls();
      return (
        typeof value === "object" &&
        value !== null &&
        (value as { valid?: unknown }).valid === true
      );
    };
    await store.set("entity", envelope({ valid: false }, {
      createdAt: new Date(Date.now() - 5000).toISOString(),
      expiration: createTtlExpiration(1000),
    }));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
      validator,
      { allowStale: true },
    )).rejects.toThrow("network unavailable");
    expect(validatorCalls).toHaveBeenCalledTimes(1);
  });

  it("does not remove unrelated cache entries when fallback is invalid", async () => {
    const { store, manager } = createManager();
    await store.set("entity", envelope("bad", { inputHash: "other-hash" }));
    await store.set("unrelated", envelope("keep"));

    await expect(manager.fetchWithOfflineFallback(
      "entity",
      async () => { throw new Error("network unavailable"); },
      revision,
      "hash-1",
    )).rejects.toThrow("network unavailable");

    expect(await store.get("unrelated")).not.toBeNull();
  });
});
