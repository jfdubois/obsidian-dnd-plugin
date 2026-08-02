/**
 * Tests for revision activation validation.
 *
 * Validates that activateRevision orchestrates the full flow:
 * fetch current revision → fetch manifest → validate → negotiate schema.
 * All tests use a mocked CatalogClient with no network calls.
 */

import { describe, it, expect } from "vitest";
import { activateRevision } from "./revision-activation";
import type { CatalogClient, SchemaNegotiationResult, EntityDetailResult } from "./client";
import type { CatalogManifest, CatalogSource, CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import {
  createCatalogManifest,
  CATALOG_SCHEMA_VERSION,
} from "@obsidian-dnd/catalog-contract";
import type {
  CatalogRevision,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Mock client ───────────────────────────────────────────────── */

interface MockConfig {
  currentRevisionError?: Error | null;
  manifestError?: Error | null;
  manifest?: unknown;
  negotiateResult?: SchemaNegotiationResult;
}

class MockCatalogClient implements CatalogClient {
  private config: MockConfig;

  constructor(config: MockConfig = {}) {
    this.config = config;
  }

  async fetchCurrentRevision(): Promise<string> {
    if (this.config.currentRevisionError) {
      throw this.config.currentRevisionError;
    }
    return "rev-001";
  }

  async fetchManifest(_revision: CatalogRevision): Promise<CatalogManifest> {
    if (this.config.manifestError) {
      throw this.config.manifestError;
    }
    return this.config.manifest as CatalogManifest;
  }

  async fetchSources(_revision: CatalogRevision): Promise<CatalogSource[]> {
    throw new Error("not implemented");
  }

  async fetchIndex(
    _revision: CatalogRevision,
    _kind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]> {
    throw new Error("not implemented");
  }

  async fetchEntity(
    _revision: CatalogRevision,
    _detailPath: string,
  ): Promise<EntityDetailResult> {
    throw new Error("not implemented");
  }

  async testConnection(): Promise<boolean> {
    throw new Error("not implemented");
  }

  negotiateSchema(serverVersion: number): SchemaNegotiationResult {
    if (this.config.negotiateResult) {
      return this.config.negotiateResult;
    }
    return {
      compatible: serverVersion === CATALOG_SCHEMA_VERSION,
      serverSchemaVersion: serverVersion,
      pluginSchemaVersion: CATALOG_SCHEMA_VERSION,
    };
  }
}

/* ── Test helpers ──────────────────────────────────────────────── */

function createValidManifest(): CatalogManifest {
  return createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: createCatalogRevision("rev-001"),
    sourceRevision: "src-001",
    builderVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [
      "species",
      "background",
      "class",
      "subclass",
      "class-feature",
      "subclass-feature",
      "feat",
      "spell",
      "item",
      "optional-feature",
      "skill",
      "language",
    ],
    checksums: {},
  });
}

/* ── Positive tests ────────────────────────────────────────────── */

describe("activateRevision — positive", () => {
  it("activates successfully with a valid revision", async () => {
    const manifest = createValidManifest();
    const client = new MockCatalogClient({ manifest });

    const result = await activateRevision(client);

    expect(result.success).toBe(true);
    expect(result.revision).toBe("rev-001");
    expect(result.errors).toEqual([]);
    expect(result.manifest).toBe(manifest);
  });
});

/* ── Negative tests ────────────────────────────────────────────── */

describe("activateRevision — fetchCurrentRevision fails", () => {
  it("returns error when current.json fetch throws", async () => {
    const client = new MockCatalogClient({
      currentRevisionError: new Error("Network timeout"),
    });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Failed to fetch current revision");
    expect(result.errors[0]).toContain("Network timeout");
    expect(result.revision).toBeUndefined();
    expect(result.manifest).toBeUndefined();
  });
});

describe("activateRevision — fetchManifest fails", () => {
  it("returns error when manifest fetch throws", async () => {
    const client = new MockCatalogClient({
      manifestError: new Error("404 Not Found"),
    });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Failed to fetch manifest");
    expect(result.errors[0]).toContain("404 Not Found");
    expect(result.manifest).toBeUndefined();
  });
});

describe("activateRevision — manifest validation fails", () => {
  it("returns error when manifest is invalid shape", async () => {
    const client = new MockCatalogClient({
      manifest: { not: "a manifest" },
    });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Invalid manifest");
    expect(result.manifest).toBeUndefined();
  });
});

describe("activateRevision — schema negotiation fails", () => {
  it("returns error when schema negotiation is incompatible", async () => {
    const manifest = createValidManifest();
    const client = new MockCatalogClient({
      manifest,
      negotiateResult: {
        compatible: false,
        serverSchemaVersion: 99,
        pluginSchemaVersion: CATALOG_SCHEMA_VERSION,
        reason: "Server schema version 99 is not supported",
      },
    });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Schema negotiation failed");
    expect(result.errors[0]).toContain("99");
    expect(result.revision).toBeUndefined();
    expect(result.manifest).toBeUndefined();
  });
});

describe("activateRevision — missing required entity kinds", () => {
  it("returns error when required entity kinds are missing", async () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["skill", "language"],
      checksums: {},
    });

    const client = new MockCatalogClient({ manifest });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Missing required entity kinds");
    expect(result.errors[0]).toContain("species");
    expect(result.manifest).toBeUndefined();
  });
});

/* ── Error accumulation ────────────────────────────────────────── */

describe("activateRevision — error accumulation", () => {
  it("reports multiple failures when validation and negotiation both fail", async () => {
    // Manifest has wrong schema version AND missing entity kinds,
    // plus negotiation will also fail.
    const manifest = createCatalogManifest({
      schemaVersion: 99,
      catalogRevision: createCatalogRevision("rev-001"),
      sourceRevision: "src-001",
      builderVersion: "0.1.0",
      generatedAt: "2026-01-01T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["skill"],
      checksums: {},
    });

    const client = new MockCatalogClient({
      manifest,
      negotiateResult: {
        compatible: false,
        serverSchemaVersion: 99,
        pluginSchemaVersion: CATALOG_SCHEMA_VERSION,
        reason: "Unsupported version",
      },
    });

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    // Should have at least 2 errors: schema version mismatch + missing entity kinds
    // (negotiation is skipped when validation fails)
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.find((e) => e.includes("Unsupported schema version"))).toBeDefined();
    expect(result.errors.find((e) => e.includes("Missing required entity kinds"))).toBeDefined();
    expect(result.revision).toBeUndefined();
    expect(result.manifest).toBeUndefined();
  });
});

/* ── Function never throws ─────────────────────────────────────── */

describe("activateRevision — never throws", () => {
  it("returns error result instead of throwing for non-Error cause", async () => {
    const client = new MockCatalogClient({
      currentRevisionError: "string error" as unknown as Error,
    });

    // Override to throw a string (non-Error)
    const original = client.fetchCurrentRevision.bind(client);
    client.fetchCurrentRevision = async () => { throw "raw string error"; };

    const result = await activateRevision(client);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Unknown error fetching current revision");
    // Restore for other tests
    client.fetchCurrentRevision = original;
  });
});
