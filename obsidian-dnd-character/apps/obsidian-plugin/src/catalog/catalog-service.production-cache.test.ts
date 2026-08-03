/**
 * Tests for CatalogService production cache validation.
 *
 * Verifies that runtime value validators are applied correctly
 * through the full production path, rejecting malformed cached
 * data and triggering fresh network fetches.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Plugin } from "obsidian";
import type { CatalogClient, EntityDetailResult } from "./client";
import {
  createNoExpiryExpiration,
  createCacheEnvelope,
  CACHE_SCHEMA_VERSION,
  buildManifestCacheKey,
  buildManifestInputHash,
  buildSourcesCacheKey,
  buildSourcesInputHash,
  createCatalogManifest,
  createCatalogSource,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";
import { CatalogService } from "./catalog-service";

/* ── Mock obsidian (hoisted by vitest) ─────────────────────────── */

const mockRequestUrl = vi.fn();

vi.mock("obsidian", () => ({
  requestUrl: (...args: unknown[]) => mockRequestUrl(...args),
}));

/* ── Mock Plugin ────────────────────────────────────────────────── */

function createMockPlugin(): Plugin {
  return {
    loadData: vi.fn().mockResolvedValue(null),
    saveData: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obsidian Plugin mock
    app: null as unknown as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obsidian Plugin mock
    manifest: {} as any,
    register: vi.fn(),
    registerEvent: vi.fn().mockReturnValue({ unregister: vi.fn() }),
    registerDomEvent: vi.fn(),
    registerInterval: vi.fn().mockReturnValue(0),
    addChild: vi.fn(),
    addCommand: vi.fn().mockReturnValue({ unload: vi.fn() }),
    addSettingTab: vi.fn(),
    getProjectDir: vi.fn().mockReturnValue("/mock"),
  } as unknown as Plugin;
}

/* ── Mock Client ────────────────────────────────────────────────── */

function createMockClient(): CatalogClient & { rejectNext: boolean } {
  const client: CatalogClient & { rejectNext: boolean } = {
    rejectNext: false,
    fetchCurrentRevision: vi.fn(),
    negotiateSchema: vi.fn(),
    fetchManifest: vi.fn(async () =>
      createCatalogManifest({
        schemaVersion: 1,
        catalogRevision: rev,
        sourceRevision: srcRevision,
        builderVersion: "0.1.0",
        generatedAt: "2026-07-22T00:00:00Z",
        rulesets: ["2024"],
        entityKinds: ["species"],
        checksums: { "manifest.json": "sha256-abc" },
      }),
    ),
    fetchSources: vi.fn(async () => [
      createCatalogSource({
        id: srcId,
        name: "Xanathar",
        abbreviation: "xphb",
        ruleset: "2024",
        category: "core",
      }),
    ]),
    fetchIndex: vi.fn(async () => []),
    fetchEntity: vi.fn(async () => {
      if (client.rejectNext) {
        throw new Error("network unavailable");
      }
      return {
        catalogRevision: "rev-001",
        data: {
          id: humanId,
          kind: "species",
          name: "Human",
          sourceId: srcId,
          ruleset: "2024",
          access: "core",
          legacy: false,
          size: "Medium",
          speed: 30,
          darkvision: false,
          traits: [],
          proficiencies: [],
          description: [],
          abilityScores: [],
          skillProficiencies: [],
          languages: [],
          additionalRules: [],
        },
      } as unknown as EntityDetailResult;
    }),
    testConnection: vi.fn().mockResolvedValue(true),
  };
  return client;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const rev = createCatalogRevision("rev-001");
const srcRevision = "src-001";
const humanId = createEntityId("species:2024:xphb:human");
const srcId = createSourceId("xphb");

/* ── Tests ──────────────────────────────────────────────────────── */

describe("CatalogService production cache validation", () => {
  let plugin: Plugin;
  let client: CatalogClient & { rejectNext: boolean };
  let service: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = createMockPlugin();
    client = createMockClient();
    service = new CatalogService(plugin, client, {
      defaultExpiration: createNoExpiryExpiration(),
    });
  });

  it("validates manifest cache with runtime validator", async () => {
    // Pre-populate cache with valid manifest
    const manifest = createCatalogManifest({
      schemaVersion: 1,
      catalogRevision: rev,
      sourceRevision: srcRevision,
      builderVersion: "0.1.0",
      generatedAt: "2026-07-22T00:00:00Z",
      rulesets: ["2024"],
      entityKinds: ["species"],
      checksums: { "manifest.json": "sha256-abc" },
    });
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildManifestInputHash(srcRevision),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: manifest,
    });
    const cacheKey = buildManifestCacheKey(rev);
    await service.getStore().set(cacheKey, envelope);

    // Fetch should hit cache (validator passes)
    const result = await service.fetchManifest(rev, srcRevision);
    expect(result.catalogRevision).toBe("rev-001");
    expect(client.fetchManifest).not.toHaveBeenCalled();
  });

  it("rejects malformed manifest cache and re-fetches", async () => {
    // Pre-populate cache with malformed manifest (missing required fields)
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildManifestInputHash(srcRevision),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: { invalid: "manifest" },
    });
    const cacheKey = buildManifestCacheKey(rev);
    await service.getStore().set(cacheKey, envelope);

    // Fetch should miss cache and call network
    const result = await service.fetchManifest(rev, srcRevision);
    expect(client.fetchManifest).toHaveBeenCalledTimes(1);
    expect(result.catalogRevision).toBe("rev-001");
  });

  it("validates sources cache with runtime validator", async () => {
    // Pre-populate cache with valid sources
    const sources = [
      createCatalogSource({
        id: srcId,
        name: "Xanathar",
        abbreviation: "xphb",
        ruleset: "2024",
        category: "core",
      }),
    ];
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildSourcesInputHash(srcRevision),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: sources,
    });
    const cacheKey = buildSourcesCacheKey(rev);
    await service.getStore().set(cacheKey, envelope);

    // Fetch should hit cache (validator passes)
    const result = await service.fetchSources(rev, srcRevision);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("xphb");
    expect(client.fetchSources).not.toHaveBeenCalled();
  });

  it("rejects malformed sources cache and re-fetches", async () => {
    // Pre-populate cache with malformed sources (not an array)
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildSourcesInputHash(srcRevision),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: { invalid: "sources" },
    });
    const cacheKey = buildSourcesCacheKey(rev);
    await service.getStore().set(cacheKey, envelope);

    // Fetch should miss cache and call network
    const result = await service.fetchSources(rev, srcRevision);
    expect(client.fetchSources).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(1);
  });

  it("rejects sources with invalid source entries", async () => {
    // Pre-populate cache with sources array containing invalid entries
    const envelope = createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: rev,
      inputHash: buildSourcesInputHash(srcRevision),
      createdAt: new Date().toISOString(),
      expiration: createNoExpiryExpiration(),
      value: [{ invalid: "source" }],
    });
    const cacheKey = buildSourcesCacheKey(rev);
    await service.getStore().set(cacheKey, envelope);

    // Fetch should miss cache and call network
    const result = await service.fetchSources(rev, srcRevision);
    expect(client.fetchSources).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(1);
  });
});
