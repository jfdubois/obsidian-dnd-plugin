/**
 * Tests for cache envelope schema version compatibility helpers.
 *
 * Validates that exact-match schema version enforcement rejects
 * both older and future schema versions, and that the structured
 * compatibility validator returns specific actionable reasons.
 */

import { describe, it, expect } from "vitest";
import {
  CACHE_SCHEMA_VERSION,
  createCacheEnvelope,
  createNoExpiryExpiration,
  isCacheEnvelopeVersionCompatible,
  validateCacheEnvelopeCompatibility,
} from "./cache-envelope";
import type { CacheEnvelope } from "./cache-envelope";
import { createCatalogRevision } from "@obsidian-dnd/domain";

const revision = createCatalogRevision("2025-01-01");
const inputHash = "source-rev-1";

function makeEnvelope(
  version: number,
  rev = revision,
  hash = inputHash,
): CacheEnvelope<string> {
  return createCacheEnvelope({
    cacheSchemaVersion: version,
    catalogRevision: rev,
    inputHash: hash,
    createdAt: new Date().toISOString(),
    expiration: createNoExpiryExpiration(),
    value: "test",
  });
}

/* ── isCacheEnvelopeVersionCompatible ──────────────────────────── */

describe("isCacheEnvelopeVersionCompatible", () => {
  it("returns true for current schema version", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION);
    expect(isCacheEnvelopeVersionCompatible(envelope)).toBe(true);
  });

  it("returns false for schema version 0", () => {
    const envelope = makeEnvelope(0);
    expect(isCacheEnvelopeVersionCompatible(envelope)).toBe(false);
  });

  it("returns false for future schema version", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION + 1);
    expect(isCacheEnvelopeVersionCompatible(envelope)).toBe(false);
  });

  it("returns false for schema version 99", () => {
    const envelope = makeEnvelope(99);
    expect(isCacheEnvelopeVersionCompatible(envelope)).toBe(false);
  });
});

/* ── validateCacheEnvelopeCompatibility ────────────────────────── */

describe("validateCacheEnvelopeCompatibility", () => {
  it("returns null for fully compatible envelope", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION);
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      revision,
      inputHash,
    );
    expect(result).toBeNull();
  });

  it("returns version-mismatch for wrong schema version", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION + 1);
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      revision,
      inputHash,
    );
    expect(result).toBe("version-mismatch");
  });

  it("returns revision-mismatch for wrong catalog revision", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION);
    const otherRevision = createCatalogRevision("2025-02-01");
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      otherRevision,
      inputHash,
    );
    expect(result).toBe("revision-mismatch");
  });

  it("returns input-hash-mismatch for wrong input hash", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION);
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      revision,
      "wrong-hash",
    );
    expect(result).toBe("input-hash-mismatch");
  });

  it("returns version-mismatch before revision-mismatch in priority", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION + 1);
    const otherRevision = createCatalogRevision("2025-02-01");
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      otherRevision,
      "wrong-hash",
    );
    // Version check comes first in priority order
    expect(result).toBe("version-mismatch");
  });

  it("returns revision-mismatch before input-hash-mismatch in priority", () => {
    const envelope = makeEnvelope(CACHE_SCHEMA_VERSION);
    const otherRevision = createCatalogRevision("2025-02-01");
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      otherRevision,
      "wrong-hash",
    );
    // Revision check comes before hash check
    expect(result).toBe("revision-mismatch");
  });

  it("returns expired for expired envelope with valid metadata", () => {
    const expiredDate = new Date(Date.now() - 86400000).toISOString();
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: revision,
      inputHash: inputHash,
      createdAt: expiredDate,
      expiration: { kind: "ttl", ttlMs: 3600000 },
      value: "test",
    });
    const result = validateCacheEnvelopeCompatibility(
      envelope,
      revision,
      inputHash,
    );
    expect(result).toBe("expired");
  });
});
