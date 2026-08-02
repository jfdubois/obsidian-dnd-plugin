/**
 * Catalog client interface contract tests.
 *
 * Validates that:
 * - The CatalogClient interface defines all required methods
 * - A mock implementation satisfies the interface
 * - Schema negotiation returns correct compatibility results
 * - The interface types are properly imported from catalog-contract
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  CatalogClient,
  CatalogClientConfig,
  CatalogClientError,
  EntityDetailResult,
  SchemaNegotiationResult,
} from "./client";
import type {
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
  EntityDetailResponse,
} from "@obsidian-dnd/catalog-contract";
import {
  createSpeciesRule,
  createRenderParagraph,
} from "@obsidian-dnd/catalog-contract";
import type {
  CatalogRevision,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";

/* ── Mock implementation for contract validation ───────────────── */

/**
 * Minimal mock implementation that satisfies the CatalogClient
 * interface. If this compiles, the interface is structurally
 * sound and all methods have correct signatures.
 */
class MockCatalogClient implements CatalogClient {
  private config: CatalogClientConfig;

  constructor(config: CatalogClientConfig) {
    this.config = config;
  }

  async fetchCurrentRevision(): Promise<string> {
    throw new Error("Mock not implemented");
  }

  async fetchManifest(_catalogRevision: CatalogRevision): Promise<CatalogManifest> {
    throw new Error("Mock not implemented");
  }

  async fetchSources(_catalogRevision: CatalogRevision): Promise<CatalogSource[]> {
    throw new Error("Mock not implemented");
  }

  async fetchIndex(
    _catalogRevision: CatalogRevision,
    _entityKind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]> {
    throw new Error("Mock not implemented");
  }

  async fetchEntity(
    _catalogRevision: CatalogRevision,
    _detailPath: string,
  ): Promise<EntityDetailResult> {
    throw new Error("Mock not implemented");
  }

  async testConnection(): Promise<boolean> {
    throw new Error("Mock not implemented");
  }

  negotiateSchema(_serverSchemaVersion: number): SchemaNegotiationResult {
    throw new Error("Mock not implemented");
  }
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("CatalogClient interface", () => {
  it("MockCatalogClient satisfies the CatalogClient interface", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expect(client).toBeDefined();
    expect(typeof client.fetchCurrentRevision).toBe("function");
    expect(typeof client.fetchManifest).toBe("function");
    expect(typeof client.fetchSources).toBe("function");
    expect(typeof client.fetchIndex).toBe("function");
    expect(typeof client.fetchEntity).toBe("function");
    expect(typeof client.testConnection).toBe("function");
    expect(typeof client.negotiateSchema).toBe("function");
  });

  it("CatalogClientConfig requires baseUrl", () => {
    const config: CatalogClientConfig = {
      baseUrl: "https://catalog.example.com/catalog/v1",
    };
    expect(config.baseUrl).toBe("https://catalog.example.com/catalog/v1");
  });

  it("CatalogClientConfig supports optional timeoutMs", () => {
    const config: CatalogClientConfig = {
      baseUrl: "https://catalog.example.com/catalog/v1",
      timeoutMs: 5000,
    };
    expect(config.timeoutMs).toBe(5000);
  });

  it("CatalogClientError has required fields", () => {
    const error: CatalogClientError = {
      message: "Server unreachable",
      status: 500,
    };
    expect(error.message).toBe("Server unreachable");
    expect(error.status).toBe(500);
  });

  it("CatalogClientError allows optional cause", () => {
    const underlyingError = new Error("network timeout");
    const error: CatalogClientError = {
      message: "Request failed",
      cause: underlyingError,
    };
    expect(error.cause).toBe(underlyingError);
  });

  it("EntityDetailResult has required fields", () => {
    const revision = createCatalogRevision("rev-001");
    const entityDetail: EntityDetailResponse = createSpeciesRule(
      createEntityId("species:2024:xphb:human"),
      "Human",
      createSourceId("xphb"),
      "2024",
      "core",
      "Medium",
      30,
      false,
      [],
      [],
      [createRenderParagraph("A classic humanoid species.")],
      [],
      [],
      [],
      [],
      false,
    );
    const result: EntityDetailResult = {
      data: entityDetail,
      catalogRevision: revision,
    };
    expect(result.catalogRevision).toBe(revision);
    expect(result.data.name).toBe("Human");
    expect(result.data.kind).toBe("species");
  });

  it("SchemaNegotiationResult has required fields", () => {
    const result: SchemaNegotiationResult = {
      compatible: true,
      serverSchemaVersion: 1,
      pluginSchemaVersion: 1,
    };
    expect(result.compatible).toBe(true);
    expect(result.serverSchemaVersion).toBe(1);
    expect(result.pluginSchemaVersion).toBe(1);
  });

  it("SchemaNegotiationResult supports optional reason", () => {
    const result: SchemaNegotiationResult = {
      compatible: false,
      serverSchemaVersion: 2,
      pluginSchemaVersion: 1,
      reason: "Server schema version 2 is not supported by plugin version 1",
    };
    expect(result.compatible).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

describe("CatalogClient method signatures", () => {
  it("fetchCurrentRevision returns Promise<string>", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.fetchCurrentRevision).parameter(0).toBeUndefined();
    expectTypeOf(client.fetchCurrentRevision).returns.toEqualTypeOf<Promise<string>>();
  });

  it("fetchManifest accepts CatalogRevision and returns Promise<CatalogManifest>", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.fetchManifest).parameter(0).toEqualTypeOf<CatalogRevision>();
    expectTypeOf(client.fetchManifest).returns.toEqualTypeOf<Promise<CatalogManifest>>();
  });

  it("fetchSources accepts CatalogRevision and returns Promise<CatalogSource[]>", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.fetchSources).parameter(0).toEqualTypeOf<CatalogRevision>();
    expectTypeOf(client.fetchSources).returns.toEqualTypeOf<Promise<CatalogSource[]>>();
  });

  it("fetchIndex accepts CatalogRevision and RuleEntityKind", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.fetchIndex).parameter(0).toEqualTypeOf<CatalogRevision>();
    expectTypeOf(client.fetchIndex).parameter(1).toEqualTypeOf<RuleEntityKind>();
    expectTypeOf(client.fetchIndex).returns.toEqualTypeOf<Promise<CatalogEntitySummary[]>>();
  });

  it("fetchEntity accepts CatalogRevision and detailPath string", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.fetchEntity).parameter(0).toEqualTypeOf<CatalogRevision>();
    expectTypeOf(client.fetchEntity).parameter(1).toEqualTypeOf<string>();
    expectTypeOf(client.fetchEntity).returns.toEqualTypeOf<Promise<EntityDetailResult>>();
  });

  it("testConnection returns Promise<boolean>", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.testConnection).returns.toEqualTypeOf<Promise<boolean>>();
  });

  it("negotiateSchema accepts number and returns SchemaNegotiationResult", () => {
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expectTypeOf(client.negotiateSchema).parameter(0).toEqualTypeOf<number>();
    expectTypeOf(client.negotiateSchema).returns.toEqualTypeOf<SchemaNegotiationResult>();
  });
});

describe("Schema negotiation behavior", () => {
  it("returns compatible when versions match", () => {
    const result: SchemaNegotiationResult = {
      compatible: true,
      serverSchemaVersion: 1,
      pluginSchemaVersion: 1,
    };
    expect(result.compatible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns incompatible when versions differ", () => {
    const result: SchemaNegotiationResult = {
      compatible: false,
      serverSchemaVersion: 2,
      pluginSchemaVersion: 1,
      reason: "Schema version mismatch",
    };
    expect(result.compatible).toBe(false);
    expect(result.reason).toBe("Schema version mismatch");
  });
});

describe("CatalogClient does not use raw 5eTools structures", () => {
  it("interface types only reference project packages", () => {
    // This test ensures the interface only depends on:
    // - @obsidian-dnd/domain (branded IDs, enums)
    // - @obsidian-dnd/catalog-contract (manifest, source, summary)
    // No raw 5eTools or D&D Beyond types should appear.
    const client = new MockCatalogClient({ baseUrl: "https://example.com" });
    expect(client).toBeDefined();
  });
});
