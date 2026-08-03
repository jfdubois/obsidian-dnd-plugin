/**
 * Tests for canonical input hash builders.
 *
 * Validates that all hash builders produce deterministic,
 * consistent output used by both staging and restoration.
 */

import { describe, it, expect } from "vitest";
import {
  buildManifestInputHash,
  buildSourcesInputHash,
  buildIndexInputHash,
  buildEntityInputHash,
} from "./cache-keys";
import type { RuleEntityKind } from "@obsidian-dnd/domain";

const sourceRevision = "src-2025-01-01";
const entityKind: RuleEntityKind = "species";
const entityId = "species:human";

/* ── buildManifestInputHash ────────────────────────────────────── */

describe("buildManifestInputHash", () => {
  it("produces source revision only", () => {
    expect(buildManifestInputHash(sourceRevision)).toBe(sourceRevision);
  });

  it("is deterministic for same input", () => {
    const hash1 = buildManifestInputHash(sourceRevision);
    const hash2 = buildManifestInputHash(sourceRevision);
    expect(hash1).toBe(hash2);
  });

  it("differs for different source revisions", () => {
    const hash1 = buildManifestInputHash("src-1");
    const hash2 = buildManifestInputHash("src-2");
    expect(hash1).not.toBe(hash2);
  });
});

/* ── buildSourcesInputHash ─────────────────────────────────────── */

describe("buildSourcesInputHash", () => {
  it("produces source revision only", () => {
    expect(buildSourcesInputHash(sourceRevision)).toBe(sourceRevision);
  });

  it("is deterministic for same input", () => {
    const hash1 = buildSourcesInputHash(sourceRevision);
    const hash2 = buildSourcesInputHash(sourceRevision);
    expect(hash1).toBe(hash2);
  });
});

/* ── buildIndexInputHash ───────────────────────────────────────── */

describe("buildIndexInputHash", () => {
  it("produces sourceRevision:kind format", () => {
    expect(buildIndexInputHash(sourceRevision, entityKind)).toBe(
      `${sourceRevision}:${entityKind}`,
    );
  });

  it("is deterministic for same input", () => {
    const hash1 = buildIndexInputHash(sourceRevision, entityKind);
    const hash2 = buildIndexInputHash(sourceRevision, entityKind);
    expect(hash1).toBe(hash2);
  });

  it("differs for different entity kinds", () => {
    const hash1 = buildIndexInputHash(sourceRevision, "species");
    const hash2 = buildIndexInputHash(sourceRevision, "background");
    expect(hash1).not.toBe(hash2);
  });

  it("differs for different source revisions", () => {
    const hash1 = buildIndexInputHash("src-1", entityKind);
    const hash2 = buildIndexInputHash("src-2", entityKind);
    expect(hash1).not.toBe(hash2);
  });
});

/* ── buildEntityInputHash ──────────────────────────────────────── */

describe("buildEntityInputHash", () => {
  it("produces sourceRevision:entityId format", () => {
    expect(buildEntityInputHash(sourceRevision, entityId)).toBe(
      `${sourceRevision}:${entityId}`,
    );
  });

  it("is deterministic for same input", () => {
    const hash1 = buildEntityInputHash(sourceRevision, entityId);
    const hash2 = buildEntityInputHash(sourceRevision, entityId);
    expect(hash1).toBe(hash2);
  });

  it("differs for different entity IDs", () => {
    const hash1 = buildEntityInputHash(sourceRevision, "species:human");
    const hash2 = buildEntityInputHash(sourceRevision, "species:elf");
    expect(hash1).not.toBe(hash2);
  });

  it("differs for different source revisions", () => {
    const hash1 = buildEntityInputHash("src-1", entityId);
    const hash2 = buildEntityInputHash("src-2", entityId);
    expect(hash1).not.toBe(hash2);
  });

  it("matches format used by runtime service staging", () => {
    // The runtime service stages entity envelopes with this exact format
    const hash = buildEntityInputHash(sourceRevision, entityId);
    expect(hash).toBe("src-2025-01-01:species:human");
  });
});

/* ── Cross-builder consistency ─────────────────────────────────── */

describe("cross-builder consistency", () => {
  it("manifest and sources hashes match for same source revision", () => {
    const manifestHash = buildManifestInputHash(sourceRevision);
    const sourcesHash = buildSourcesInputHash(sourceRevision);
    expect(manifestHash).toBe(sourcesHash);
  });

  it("index hash includes kind suffix not present in manifest hash", () => {
    const manifestHash = buildManifestInputHash(sourceRevision);
    const indexHash = buildIndexInputHash(sourceRevision, entityKind);
    expect(indexHash).not.toBe(manifestHash);
    expect(indexHash).toContain(manifestHash);
  });

  it("entity hash includes entityId suffix not present in manifest hash", () => {
    const manifestHash = buildManifestInputHash(sourceRevision);
    const entityHash = buildEntityInputHash(sourceRevision, entityId);
    expect(entityHash).not.toBe(manifestHash);
    expect(entityHash).toContain(manifestHash);
  });
});
