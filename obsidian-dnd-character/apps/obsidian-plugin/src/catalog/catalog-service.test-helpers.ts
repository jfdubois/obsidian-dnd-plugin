import { vi } from "vitest";
import type { Plugin } from "obsidian";
import {
  CACHE_SCHEMA_VERSION,
  CatalogCacheManager,
  CatalogRuntimeService,
  createCacheEnvelope,
  createCatalogEntitySummary,
  createCatalogManifest,
  createCatalogSource,
  createNoExpiryExpiration,
  createRenderParagraph,
  createSpeciesRule,
  buildEntityCacheKey,
  buildEntityInputHash,
  buildIndexCacheKey,
  buildIndexInputHash,
  buildManifestCacheKey,
  buildManifestInputHash,
  buildSourcesCacheKey,
  buildSourcesInputHash,
} from "@obsidian-dnd/catalog-contract";
import type {
  CacheEnvelope,
  CatalogEntitySummary,
  EntityDetailResponse,
} from "@obsidian-dnd/catalog-contract";
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from "@obsidian-dnd/domain";
import type { CatalogClient, EntityDetailResult } from "./client";
import { CatalogService } from "./catalog-service";
import { ObsidianActiveRevisionPersistence } from "./obsidian-active-revision-persistence";
import { PersistentCatalogCacheStore } from "./persistent-cache-store";

export const rev = createCatalogRevision("rev-001");
export const srcRevision = "src-001";
export const humanId = createEntityId("species:2024:phb:human");
export const srcId = createSourceId("phb");
export const detailPath = "entities/species/human.json";
export const entityKinds = ["species", "background", "class", "feat", "spell", "item"] as const;

export interface Backing {
  data: unknown;
}

export function createBackingPlugin(backing: Backing): Plugin {
  return {
    loadData: vi.fn(async () => backing.data),
    saveData: vi.fn(async (data: unknown) => {
      backing.data = data;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Obsidian Plugin mock
    app: null as unknown as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Obsidian Plugin mock
    manifest: {} as any,
    register: vi.fn(),
    registerEvent: vi.fn().mockReturnValue({ unregister: vi.fn() }),
    registerDomEvent: vi.fn(),
    registerInterval: vi.fn().mockReturnValue(0),
    addChild: vi.fn(),
    addCommand: vi.fn().mockReturnValue({ unload: vi.fn() }),
    addSettingTab: vi.fn(),
  } as unknown as Plugin;
}

export function createManifest(sourceRevision = srcRevision) {
  return createCatalogManifest({
    schemaVersion: 2,
    catalogRevision: rev,
    sourceRevision,
    builderVersion: "0.1.0",
    generatedAt: "2026-07-22T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [...entityKinds],
    checksums: { "manifest.json": "sha256-abc" },
  });
}

export function createSourcesRecord() {
  const source = createCatalogSource({
    id: srcId,
    name: "Player's Handbook",
    abbreviation: "PHB",
    ruleset: "2024",
    category: "core",
  });
  return { [srcId]: source };
}

export function createHumanEntity(): EntityDetailResponse {
  return createSpeciesRule(
    humanId, "Human", srcId, "2024", "core",
    "Medium", 30, false, [], [],
    [createRenderParagraph("A classic humanoid species.")],
    [], [], [], [], false,
  );
}

export function createHumanSummary(): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: humanId,
    kind: "species",
    name: "Human",
    sourceId: srcId,
    ruleset: "2024",
    access: "core",
    legacy: false,
    tags: [],
    detailPath,
  });
}

export function createIndexes(): Record<string, CatalogEntitySummary[]> {
  return {
    species: [createHumanSummary()],
    background: [],
    class: [],
    feat: [],
    spell: [],
    item: [],
  };
}

export function createEntityResult(): EntityDetailResult {
  return {
    catalogRevision: rev,
    data: createHumanEntity(),
  };
}

export function createClient(throwOnFetch = false): CatalogClient {
  return {
    fetchCurrentRevision: vi.fn(async () => rev),
    negotiateSchema: vi.fn(),
    fetchManifest: vi.fn(async () => createManifest()),
    fetchSources: vi.fn(async () => Object.values(createSourcesRecord())),
    fetchIndex: vi.fn(async (_revision, kind) => createIndexes()[kind] ?? []),
    fetchEntity: vi.fn(async () => {
      if (throwOnFetch) throw new Error("network unavailable");
      return createEntityResult();
    }),
    testConnection: vi.fn(async () => true),
  };
}

export function createGraph(
  backing: Backing,
  options: { throwOnClientFetch?: boolean; allowStale?: boolean } = {},
) {
  const plugin = createBackingPlugin(backing);
  const store = new PersistentCatalogCacheStore(plugin);
  const manager = new CatalogCacheManager(store, createNoExpiryExpiration());
  const persistence = new ObsidianActiveRevisionPersistence(plugin);
  const fetcher = vi.fn(async (input: string) => responseFor(input));
  const runtime = new CatalogRuntimeService({
    baseUrl: "https://catalog.test/catalog/v1",
    fetcher,
    cacheManager: manager,
    activeRevisionPersistence: persistence,
  });
  const client = createClient(options.throwOnClientFetch === true);
  const service = new CatalogService(plugin, client, {
    defaultExpiration: createNoExpiryExpiration(),
    allowStaleOfflineFallback: options.allowStale === true,
    cacheStore: store,
    cacheManager: manager,
    runtimeService: runtime,
  });
  return { plugin, store, manager, persistence, runtime, client, service, fetcher };
}

export async function activateAndPersist(graph: ReturnType<typeof createGraph>) {
  await graph.store.initialize();
  await graph.runtime.activate({
    requiredReferences: [{ entityId: humanId, kind: "species" }],
  });
  await graph.store.flush();
}

export function entityEnvelope(
  value: unknown,
  overrides: Partial<CacheEnvelope<unknown>> = {},
): CacheEnvelope<unknown> {
  return createCacheEnvelope({
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    catalogRevision: rev,
    inputHash: buildEntityInputHash(srcRevision, humanId),
    createdAt: new Date().toISOString(),
    expiration: createNoExpiryExpiration(),
    value,
    ...overrides,
  });
}

export async function seedUnrelated(graph: ReturnType<typeof createGraph>) {
  await graph.manager.set("entity/rev-001/species:2024:phb:elf", entityEnvelope(createHumanEntity(), {
    inputHash: `${srcRevision}:species:2024:phb:elf`,
  }));
}

export async function overwriteEntity(
  graph: ReturnType<typeof createGraph>,
  envelope: CacheEnvelope<unknown>,
) {
  await graph.manager.set(buildEntityCacheKey(rev, humanId), envelope);
  await graph.store.flush();
}

function responseFor(input: string): Response {
  const path = new URL(input).pathname;
  if (path.endsWith("/current.json")) return ok({ currentRevision: rev });
  if (path.endsWith("/manifest.json")) return ok(createManifest());
  if (path.endsWith("/sources.json")) return ok(Object.values(createSourcesRecord()));
  if (path.endsWith("/indexes/species.json")) return ok(createIndexes().species);
  if (path.includes("/indexes/")) return ok([]);
  if (path.endsWith(detailPath)) return ok(createHumanEntity());
  return { ok: false, status: 404, json: async () => ({}) } as Response;
}

function ok(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

export const keys = {
  manifest: () => buildManifestCacheKey(rev),
  sources: () => buildSourcesCacheKey(rev),
  index: (kind: string) => buildIndexCacheKey(rev, kind as never),
  entity: () => buildEntityCacheKey(rev, humanId),
  manifestHash: () => buildManifestInputHash(srcRevision),
  sourcesHash: () => buildSourcesInputHash(srcRevision),
  indexHash: (kind: string) => buildIndexInputHash(srcRevision, kind as never),
  entityHash: () => buildEntityInputHash(srcRevision, humanId),
};
