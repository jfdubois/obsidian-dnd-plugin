/**
 * Tests for the RequestUrlCatalogClient transport implementation.
 *
 * Validates that:
 * - The client satisfies the CatalogClient interface
 * - All fetch methods parse and validate responses correctly
 * - Schema negotiation returns correct results
 * - Connection test returns correct boolean
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  CatalogClient,
  CatalogClientConfig,
  CatalogClientError,
} from "./client";
import { RequestUrlCatalogClient } from "./request-url-client";
import type {
  CatalogRevision,
  EntityId,
} from "@obsidian-dnd/domain";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";
import type {
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogManifest,
  createCatalogSource,
  createCatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";

/* ── Mock setup ────────────────────────────────────────────────── */

const mockRequestUrl = vi.fn();

vi.mock("obsidian", () => ({
  requestUrl: (...args: unknown[]) => mockRequestUrl(...args),
}));

/* ── Test helpers ──────────────────────────────────────────────── */

function createMockManifest(catalogRevision: CatalogRevision): CatalogManifest {
  return createCatalogManifest({
    schemaVersion: 1,
    catalogRevision,
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

function createMockSource(): CatalogSource {
  return createCatalogSource({
    id: createSourceId("xphb"),
    name: "Player's Handbook",
    abbreviation: "PHB",
    ruleset: "2024",
    category: "core",
  });
}

function createMockEntitySummary(): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: createEntityId("species:2024:xphb:human"),
    kind: "species",
    name: "Human",
    sourceId: createSourceId("xphb"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    tags: ["base"],
    detailPath: "species/human.json",
  });
}

function mockResponse(json: unknown, status = 200) {
  mockRequestUrl.mockResolvedValue({
    status,
    headers: { "content-type": "application/json" },
    arrayBuffer: new ArrayBuffer(0),
    json,
    text: JSON.stringify(json),
  });
}

function mockNetworkError() {
  mockRequestUrl.mockRejectedValue(new Error("network failure"));
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("RequestUrlCatalogClient", () => {
  const revision: CatalogRevision = createCatalogRevision("rev-001");
  const config: CatalogClientConfig = {
    baseUrl: "https://catalog.example.com/catalog/v1",
    timeoutMs: 5000,
  };

  let client: CatalogClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new RequestUrlCatalogClient(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("satisfies the CatalogClient interface", () => {
    expect(typeof client.fetchManifest).toBe("function");
    expect(typeof client.fetchSources).toBe("function");
    expect(typeof client.fetchIndex).toBe("function");
    expect(typeof client.fetchEntity).toBe("function");
    expect(typeof client.testConnection).toBe("function");
    expect(typeof client.negotiateSchema).toBe("function");
  });

  /* ── fetchManifest ───────────────────────────────────────────── */

  it("fetchManifest returns parsed manifest on 200", async () => {
    const manifest = createMockManifest(revision);
    mockResponse(manifest);

    const result = await client.fetchManifest(revision);
    expect(result).toEqual(manifest);
  });

  it("fetchManifest throws on 404 with status code", async () => {
    mockResponse({}, 404);

    const error = await client.fetchManifest(revision).catch((e) => e);
    expect((error as CatalogClientError).status).toBe(404);
  });

  it("fetchManifest throws on invalid schema", async () => {
    mockResponse({ invalid: "data" });

    await expect(client.fetchManifest(revision)).rejects.toThrow(
      "Invalid manifest",
    );
  });

  it("fetchManifest throws on network failure", async () => {
    mockNetworkError();

    const error = await client.fetchManifest(revision).catch((e) => e);
    expect((error as CatalogClientError).cause).toBeDefined();
  });

  /* ── fetchSources ────────────────────────────────────────────── */

  it("fetchSources returns parsed sources on 200", async () => {
    const sources = [createMockSource()];
    mockResponse(sources);

    const result = await client.fetchSources(revision);
    expect(result).toEqual(sources);
  });

  it("fetchSources throws on non-array response", async () => {
    mockResponse({ sources: [] });

    await expect(client.fetchSources(revision)).rejects.toThrow(
      "Invalid sources",
    );
  });

  /* ── fetchIndex ──────────────────────────────────────────────── */

  it("fetchIndex returns parsed index on 200", async () => {
    const summaries = [createMockEntitySummary()];
    mockResponse(summaries);

    const result = await client.fetchIndex(revision, "species");
    expect(result).toEqual(summaries);
  });

  it("fetchIndex throws on non-array response", async () => {
    mockResponse({ index: [] });

    await expect(client.fetchIndex(revision, "spell")).rejects.toThrow(
      "Invalid index for spell",
    );
  });

  /* ── fetchEntity ─────────────────────────────────────────────── */

  it("fetchEntity returns entity detail result on 200", async () => {
    const entityData = { name: "Fireball", level: 3 };
    mockResponse(entityData);

    const entityId: EntityId = createEntityId("spell:2024:xphb:fireball");
    const result = await client.fetchEntity(revision, entityId);

    expect(result.data).toEqual(entityData);
    expect(result.catalogRevision).toBe(revision);
  });

  it("fetchEntity throws on 500 with status code", async () => {
    mockResponse({}, 500);

    const entityId: EntityId = createEntityId("spell:2024:xphb:fireball");
    const error = await client.fetchEntity(revision, entityId).catch((e) => e);
    expect((error as CatalogClientError).status).toBe(500);
  });

  /* ── testConnection ──────────────────────────────────────────── */

  it("testConnection returns true for valid manifest", async () => {
    mockResponse(createMockManifest(revision));

    const result = await client.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection returns false for invalid manifest", async () => {
    mockResponse({ status: "ok" });

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false on network error", async () => {
    mockNetworkError();

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false for wrong schema version", async () => {
    const manifest = createMockManifest(revision);
    mockResponse({ ...manifest, schemaVersion: 99 });

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false for missing required entity kinds", async () => {
    const manifest = createMockManifest(revision);
    mockResponse({ ...manifest, entityKinds: ["skill"] });

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  /* ── negotiateSchema ─────────────────────────────────────────── */

  it("negotiateSchema returns compatible when versions match", () => {
    const result = client.negotiateSchema(1);

    expect(result.compatible).toBe(true);
    expect(result.serverSchemaVersion).toBe(1);
    expect(result.pluginSchemaVersion).toBe(1);
    expect(result.reason).toBeUndefined();
  });

  it("negotiateSchema returns incompatible when versions differ", () => {
    const result = client.negotiateSchema(2);

    expect(result.compatible).toBe(false);
    expect(result.serverSchemaVersion).toBe(2);
    expect(result.pluginSchemaVersion).toBe(1);
    expect(result.reason).toContain("2");
  });
});
