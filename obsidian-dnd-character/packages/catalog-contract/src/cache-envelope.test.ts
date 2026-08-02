/**
 * Tests for cache envelope types, validators, factories,
 * and expiration helpers.
 */

import { describe, it, expect } from "vitest";
import {
  CACHE_SCHEMA_VERSION,
  isCacheExpirationPolicy,
  isCacheEnvelope,
  createCacheEnvelope,
  isCacheExpired,
  isCacheValid,
  createNoExpiryExpiration,
  createTtlExpiration,
  createAbsoluteExpiration,
} from "./cache-envelope";
import type { CacheEnvelope } from "./cache-envelope";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Schema version constant ───────────────────────────────────── */

describe("CACHE_SCHEMA_VERSION", () => {
  it("equals 1", () => {
    expect(CACHE_SCHEMA_VERSION).toBe(1);
  });
});

/* ── Expiration policy factories ───────────────────────────────── */

describe("createNoExpiryExpiration", () => {
  it("creates a valid no-expiry policy", () => {
    const policy = createNoExpiryExpiration();
    expect(policy.kind).toBe("no-expiry");
    expect(isCacheExpirationPolicy(policy)).toBe(true);
  });
});

describe("createTtlExpiration", () => {
  it("creates a valid TTL policy", () => {
    const policy = createTtlExpiration(3600000);
    expect(policy.kind).toBe("ttl");
    expect(policy.ttlMs).toBe(3600000);
    expect(isCacheExpirationPolicy(policy)).toBe(true);
  });
});

describe("createAbsoluteExpiration", () => {
  it("creates a valid absolute policy", () => {
    const policy = createAbsoluteExpiration("2026-12-31T23:59:59Z");
    expect(policy.kind).toBe("absolute");
    expect(policy.expiresAt).toBe("2026-12-31T23:59:59Z");
    expect(isCacheExpirationPolicy(policy)).toBe(true);
  });
});

/* ── Expiration policy guard ───────────────────────────────────── */

describe("isCacheExpirationPolicy", () => {
  it("returns true for no-expiry", () => {
    expect(isCacheExpirationPolicy({ kind: "no-expiry" })).toBe(true);
  });

  it("returns true for ttl with valid ttlMs", () => {
    expect(isCacheExpirationPolicy({ kind: "ttl", ttlMs: 60000 })).toBe(true);
  });

  it("returns true for ttl with zero ttlMs", () => {
    expect(isCacheExpirationPolicy({ kind: "ttl", ttlMs: 0 })).toBe(true);
  });

  it("returns true for absolute with valid expiresAt", () => {
    expect(
      isCacheExpirationPolicy({
        kind: "absolute",
        expiresAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("returns false for unknown kind", () => {
    expect(isCacheExpirationPolicy({ kind: "unknown" })).toBe(false);
  });

  it("returns false for ttl with non-number ttlMs", () => {
    expect(isCacheExpirationPolicy({ kind: "ttl", ttlMs: "60000" })).toBe(false);
  });

  it("returns false for ttl with negative ttlMs", () => {
    expect(isCacheExpirationPolicy({ kind: "ttl", ttlMs: -1 })).toBe(false);
  });

  it("returns false for ttl with NaN ttlMs", () => {
    expect(isCacheExpirationPolicy({ kind: "ttl", ttlMs: NaN })).toBe(false);
  });

  it("returns false for absolute with empty expiresAt", () => {
    expect(
      isCacheExpirationPolicy({ kind: "absolute", expiresAt: "" }),
    ).toBe(false);
  });

  it("returns false for absolute with non-string expiresAt", () => {
    expect(
      isCacheExpirationPolicy({ kind: "absolute", expiresAt: 123 }),
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCacheExpirationPolicy(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCacheExpirationPolicy(undefined)).toBe(false);
  });

  it("returns false for a plain string", () => {
    expect(isCacheExpirationPolicy("no-expiry")).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isCacheExpirationPolicy({})).toBe(false);
  });
});

/* ── Cache envelope factory ────────────────────────────────────── */

describe("createCacheEnvelope", () => {
  it("creates a valid envelope", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc123",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createNoExpiryExpiration(),
      value: { id: "test" },
    });

    expect(isCacheEnvelope(envelope)).toBe(true);
    expect(envelope.cacheSchemaVersion).toBe(1);
    expect(envelope.catalogRevision).toBe("rev-001");
    expect(envelope.inputHash).toBe("abc123");
    expect(envelope.createdAt).toBe("2026-08-01T00:00:00Z");
    expect(envelope.expiration.kind).toBe("no-expiry");
    expect(envelope.value).toEqual({ id: "test" });
  });

  it("wraps an array value", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "hash1",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createTtlExpiration(3600000),
      value: ["item1", "item2"],
    });

    expect(isCacheEnvelope(envelope)).toBe(true);
    expect(envelope.value).toEqual(["item1", "item2"]);
  });

  it("wraps a string value", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "hash1",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createAbsoluteExpiration("2026-12-31T23:59:59Z"),
      value: "cached-data",
    });

    expect(isCacheEnvelope(envelope)).toBe(true);
    expect(envelope.value).toBe("cached-data");
  });
});

/* ── Cache envelope guard ──────────────────────────────────────── */

describe("isCacheEnvelope", () => {
  function makeValidEnvelope(): CacheEnvelope<string> {
    return createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc123",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createNoExpiryExpiration(),
      value: "test",
    });
  }

  it("returns true for a valid envelope", () => {
    expect(isCacheEnvelope(makeValidEnvelope())).toBe(true);
  });

  it("returns false for null", () => {
    expect(isCacheEnvelope(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCacheEnvelope(undefined)).toBe(false);
  });

  it("returns false for a plain string", () => {
    expect(isCacheEnvelope("envelope")).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isCacheEnvelope({})).toBe(false);
  });

  it("returns false when cacheSchemaVersion is missing", () => {
    const obj = {
      catalogRevision: "rev-001",
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when cacheSchemaVersion is not an integer", () => {
    const obj = {
      cacheSchemaVersion: 1.5,
      catalogRevision: "rev-001",
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when cacheSchemaVersion is zero", () => {
    const obj = {
      cacheSchemaVersion: 0,
      catalogRevision: "rev-001",
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when catalogRevision is missing", () => {
    const obj = {
      cacheSchemaVersion: 1,
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when catalogRevision is an empty string", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: "",
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when inputHash is missing", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when inputHash is empty", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when createdAt is missing", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when createdAt is empty", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "",
      expiration: { kind: "no-expiry" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when expiration is missing", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when expiration is invalid", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "invalid" },
      value: "test",
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });

  it("returns false when value is missing", () => {
    const obj = {
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: { kind: "no-expiry" },
    };
    expect(isCacheEnvelope(obj)).toBe(false);
  });
});

/* ── isCacheExpired ────────────────────────────────────────────── */

describe("isCacheExpired", () => {
  const baseTime = new Date("2026-08-01T12:00:00Z");

  it("returns false for no-expiry policy", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createNoExpiryExpiration(),
      value: "test",
    });
    expect(isCacheExpired(envelope, baseTime)).toBe(false);
  });

  it("returns false for ttl that has not elapsed", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T11:00:00Z",
      expiration: createTtlExpiration(7200000), // 2 hours
      value: "test",
    });
    // created at 11:00, ttl 2h, now 12:00 -> not expired
    expect(isCacheExpired(envelope, baseTime)).toBe(false);
  });

  it("returns true for ttl that has elapsed", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T10:00:00Z",
      expiration: createTtlExpiration(3600000), // 1 hour
      value: "test",
    });
    // created at 10:00, ttl 1h, now 12:00 -> expired
    expect(isCacheExpired(envelope, baseTime)).toBe(true);
  });

  it("returns true for ttl of zero", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T10:00:00Z",
      expiration: createTtlExpiration(0),
      value: "test",
    });
    expect(isCacheExpired(envelope, baseTime)).toBe(true);
  });

  it("returns false for absolute that has not passed", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createAbsoluteExpiration("2026-08-01T13:00:00Z"),
      value: "test",
    });
    expect(isCacheExpired(envelope, baseTime)).toBe(false);
  });

  it("returns true for absolute that has passed", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createAbsoluteExpiration("2026-08-01T11:00:00Z"),
      value: "test",
    });
    expect(isCacheExpired(envelope, baseTime)).toBe(true);
  });

  it("returns false for absolute at exact boundary", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createAbsoluteExpiration("2026-08-01T12:00:00Z"),
      value: "test",
    });
    // expiresAt equals now -> not expired (strict greater than)
    expect(isCacheExpired(envelope, baseTime)).toBe(false);
  });
});

/* ── isCacheValid ──────────────────────────────────────────────── */

describe("isCacheValid", () => {
  const baseTime = new Date("2026-08-01T12:00:00Z");

  function makeEnvelope(): CacheEnvelope<string> {
    return createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc123",
      createdAt: "2026-08-01T00:00:00Z",
      expiration: createNoExpiryExpiration(),
      value: "test",
    });
  }

  it("returns true when revision and hash match and not expired", () => {
    const envelope = makeEnvelope();
    expect(
      isCacheValid(
        envelope,
        createCatalogRevision("rev-001"),
        "abc123",
        baseTime,
      ),
    ).toBe(true);
  });

  it("returns false when catalog revision does not match", () => {
    const envelope = makeEnvelope();
    expect(
      isCacheValid(
        envelope,
        createCatalogRevision("rev-002"),
        "abc123",
        baseTime,
      ),
    ).toBe(false);
  });

  it("returns false when input hash does not match", () => {
    const envelope = makeEnvelope();
    expect(
      isCacheValid(
        envelope,
        createCatalogRevision("rev-001"),
        "different-hash",
        baseTime,
      ),
    ).toBe(false);
  });

  it("returns false when envelope is expired", () => {
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: createCatalogRevision("rev-001"),
      inputHash: "abc123",
      createdAt: "2026-08-01T10:00:00Z",
      expiration: createTtlExpiration(3600000), // 1 hour
      value: "test",
    });
    expect(
      isCacheValid(
        envelope,
        createCatalogRevision("rev-001"),
        "abc123",
        baseTime,
      ),
    ).toBe(false);
  });
});
