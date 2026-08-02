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
  EntityDetailResponse,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogManifest,
  createCatalogSource,
  createCatalogEntitySummary,
  createSpeciesRule,
  createRenderParagraph,
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

function createMockEntityDetail(): EntityDetailResponse {
  return createSpeciesRule(
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
  const baseUrl = "https://catalog.example.com/catalog/v1";
  const config: CatalogClientConfig = {
    baseUrl,
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
    expect(typeof client.fetchCurrentRevision).toBe("function");
    expect(typeof client.fetchManifest).toBe("function");
    expect(typeof client.fetchSources).toBe("function");
    expect(typeof client.fetchIndex).toBe("function");
    expect(typeof client.fetchEntity).toBe("function");
    expect(typeof client.testConnection).toBe("function");
    expect(typeof client.negotiateSchema).toBe("function");
  });

  /* ── fetchCurrentRevision ────────────────────────────────────── */

  it("fetchCurrentRevision returns revision string for valid current.json", async () => {
    mockResponse({ currentRevision: "smoke-test-rev-001" });

    const result = await client.fetchCurrentRevision();
    expect(result).toBe("smoke-test-rev-001");
  });

  it("fetchCurrentRevision throws on invalid current.json", async () => {
    mockResponse({ invalid: "data" });

    await expect(client.fetchCurrentRevision()).rejects.toThrow(
      "Invalid current.json",
    );
  });

  it("fetchCurrentRevision throws on network failure", async () => {
    mockNetworkError();

    const error = await client.fetchCurrentRevision().catch((e) => e);
    expect((error as CatalogClientError).cause).toBeDefined();
  });

  it("fetchCurrentRevision throws on 404", async () => {
    mockResponse({}, 404);

    const error = await client.fetchCurrentRevision().catch((e) => e);
    expect((error as CatalogClientError).status).toBe(404);
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

  it("fetchSources throws on invalid source entry in array", async () => {
    mockResponse([
      createMockSource(),
      { invalid: "entry" },
    ]);

    await expect(client.fetchSources(revision)).rejects.toThrow(
      "Invalid sources: entry at index 1",
    );
  });

  it("fetchSources throws on 404 with status code", async () => {
    mockResponse({}, 404);

    const error = await client.fetchSources(revision).catch((e) => e);
    expect((error as CatalogClientError).status).toBe(404);
  });

  it("fetchSources throws on network failure", async () => {
    mockNetworkError();

    const error = await client.fetchSources(revision).catch((e) => e);
    expect((error as CatalogClientError).cause).toBeDefined();
  });

  it("fetchSources returns multiple sources", async () => {
    const sources = [
      createMockSource(),
      createMockSource(),
    ];
    mockResponse(sources);

    const result = await client.fetchSources(revision);
    expect(result).toHaveLength(2);
    expect(result).toEqual(sources);
  });

  it("fetchSources accepts empty array", async () => {
    mockResponse([]);

    const result = await client.fetchSources(revision);
    expect(result).toEqual([]);
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

  it("fetchIndex throws on invalid entry in array", async () => {
    mockResponse([
      createMockEntitySummary(),
      { invalid: "entry" },
    ]);

    await expect(client.fetchIndex(revision, "class")).rejects.toThrow(
      "Invalid index for class: entry at index 1",
    );
  });

  it("fetchIndex throws on 404 with status code", async () => {
    mockResponse({}, 404);

    const error = await client.fetchIndex(revision, "feat").catch((e) => e);
    expect((error as CatalogClientError).status).toBe(404);
  });

  it("fetchIndex throws on network failure", async () => {
    mockNetworkError();

    const error = await client.fetchIndex(revision, "background").catch((e) => e);
    expect((error as CatalogClientError).cause).toBeDefined();
  });

  it("fetchIndex returns multiple summaries", async () => {
    const summaries = [
      createMockEntitySummary(),
      createMockEntitySummary(),
    ];
    mockResponse(summaries);

    const result = await client.fetchIndex(revision, "spell");
    expect(result).toHaveLength(2);
    expect(result).toEqual(summaries);
  });

  it("fetchIndex accepts empty array", async () => {
    mockResponse([]);

    const result = await client.fetchIndex(revision, "item");
    expect(result).toEqual([]);
  });

  /* ── fetchEntity ─────────────────────────────────────────────── */

  it("fetchEntity returns entity detail result on 200", async () => {
    const entityDetail = createMockEntityDetail();
    mockResponse(entityDetail);

    const detailPath = "species/human.json";
    const result = await client.fetchEntity(revision, detailPath);

    expect(result.data).toEqual(entityDetail);
    expect(result.catalogRevision).toBe(revision);
  });

  it("fetchEntity throws on 500 with status code", async () => {
    mockResponse({}, 500);

    const detailPath = "species/human.json";
    const error = await client.fetchEntity(revision, detailPath).catch((e) => e);
    expect((error as CatalogClientError).status).toBe(500);
  });

  it("fetchEntity throws on invalid entity detail response", async () => {
    mockResponse({ name: "Invalid", level: 3 });

    const detailPath = "species/human.json";
    const error = await client.fetchEntity(revision, detailPath).catch((e) => e);
    expect((error as CatalogClientError).message).toContain("Invalid entity detail");
  });

  /* ── testConnection ──────────────────────────────────────────── */

  it("testConnection returns true when current.json and manifest are valid", async () => {
    const manifest = createMockManifest(revision);
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: { currentRevision: "rev-001" },
      text: JSON.stringify({ currentRevision: "rev-001" }),
    });
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: manifest,
      text: JSON.stringify(manifest),
    });

    const result = await client.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection returns false when current.json is invalid", async () => {
    mockResponse({ invalid: "data" });

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false on network error during current.json fetch", async () => {
    mockNetworkError();

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false when manifest validation fails", async () => {
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: { currentRevision: "rev-001" },
      text: JSON.stringify({ currentRevision: "rev-001" }),
    });
    // Manifest with wrong schema version
    const badManifest = createMockManifest(revision);
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: { ...badManifest, schemaVersion: 99 },
      text: JSON.stringify({ ...badManifest, schemaVersion: 99 }),
    });

    const result = await client.testConnection();
    expect(result).toBe(false);
  });

  it("testConnection returns false when manifest missing required entity kinds", async () => {
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: { currentRevision: "rev-001" },
      text: JSON.stringify({ currentRevision: "rev-001" }),
    });
    const manifest = createMockManifest(revision);
    mockRequestUrl.mockResolvedValueOnce({
      status: 200,
      headers: { "content-type": "application/json" },
      arrayBuffer: new ArrayBuffer(0),
      json: { ...manifest, entityKinds: ["skill"] },
      text: JSON.stringify({ ...manifest, entityKinds: ["skill"] }),
    });

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

  /* ── URL construction ────────────────────────────────────────── */

  it("fetchManifest builds URL with manifest.json", async () => {
    mockResponse(createMockManifest(revision));
    await client.fetchManifest(revision);
    expect(mockRequestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${baseUrl}/rev-001/manifest.json`,
      }),
    );
  });

  it("fetchSources builds URL with sources.json", async () => {
    mockResponse([]);
    await client.fetchSources(revision);
    expect(mockRequestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${baseUrl}/rev-001/sources.json`,
      }),
    );
  });

  it("fetchIndex builds URL with indexes/{kind}.json", async () => {
    mockResponse([]);
    await client.fetchIndex(revision, "species");
    expect(mockRequestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${baseUrl}/rev-001/indexes/species.json`,
      }),
    );
  });

  it("fetchIndex builds URL with indexes/classes.json for class kind", async () => {
    mockResponse([]);
    await client.fetchIndex(revision, "class");
    expect(mockRequestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${baseUrl}/rev-001/indexes/classes.json`,
      }),
    );
  });

  it("fetchEntity builds URL with detailPath", async () => {
    mockResponse(createMockEntityDetail());
    await client.fetchEntity(revision, "species/human.json");
    expect(mockRequestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${baseUrl}/rev-001/species/human.json`,
      }),
    );
  });

  /* ── Path validation ─────────────────────────────────────────── */

  it("fetchEntity rejects empty path", async () => {
    const error = await client.fetchEntity(revision, "").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("non-empty");
  });

  it("fetchEntity rejects path with .. segments", async () => {
    const error = await client.fetchEntity(revision, "../etc/passwd").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("..");
  });

  it("fetchEntity rejects absolute path", async () => {
    const error = await client.fetchEntity(revision, "/etc/passwd").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("absolute");
  });

  it("fetchEntity rejects http scheme", async () => {
    const error = await client.fetchEntity(revision, "http://evil.com/data").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("URL schemes");
  });

  it("fetchEntity rejects javascript scheme", async () => {
    const error = await client.fetchEntity(revision, "javascript:alert(1)").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("URL schemes");
  });

  it("fetchEntity rejects data scheme", async () => {
    const error = await client.fetchEntity(revision, "data:text/html,<script>").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("URL schemes");
  });

  it("fetchEntity rejects null bytes", async () => {
    const error = await client.fetchEntity(revision, "species/human\0.json").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("null bytes");
  });

  it("fetchEntity rejects control characters", async () => {
    const error = await client.fetchEntity(revision, "species/human\x01.json").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("control characters");
  });

  it("fetchEntity rejects path without .json extension", async () => {
    const error = await client.fetchEntity(revision, "species/human.txt").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(".json");
  });

  it("fetchEntity accepts valid nested path", async () => {
    mockResponse(createMockEntityDetail());
    await client.fetchEntity(revision, "entities/species/human.json");
    expect(mockRequestUrl).toHaveBeenCalledTimes(1);
  });
});
