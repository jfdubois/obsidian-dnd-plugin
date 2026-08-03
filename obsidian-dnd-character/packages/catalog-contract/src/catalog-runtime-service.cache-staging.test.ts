import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { CatalogCacheManager } from './cache-manager';
import { InMemoryCatalogCacheStore } from './cache-store';
import { isCacheEnvelope, CACHE_SCHEMA_VERSION } from './cache-envelope';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createSpeciesRule } from './entity-species';
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
} from './cache-keys';

/* ── Test fixtures ─────────────────────────────────────────────── */

const REV_A = createCatalogRevision('rev-a');
const REV_B = createCatalogRevision('rev-b');

const makeManifest = (rev: typeof REV_A) =>
  createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: rev,
    sourceRevision: 'src-abc',
    builderVersion: '0.1.0',
    generatedAt: '2026-07-22T00:00:00Z',
    rulesets: ['2024'],
    entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
    checksums: { 'manifest.json': 'sha256-abc' },
  });

const makeSources = () => [
  createCatalogSource({
    id: createSourceId('phb'),
    name: "Player's Handbook",
    abbreviation: 'PHB',
    ruleset: '2024',
    category: 'core',
  }),
];

const makeSpeciesIndex = () => [
  createCatalogEntitySummary({
    id: createEntityId('species:human'),
    kind: 'species',
    name: 'Human',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: ['humanoid'],
    detailPath: 'entities/species/human.json',
  }),
];

const makeBackgroundIndex = () => [
  createCatalogEntitySummary({
    id: createEntityId('background:acolyte'),
    kind: 'background',
    name: 'Acolyte',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: 'entities/backgrounds/acolyte.json',
  }),
];

const jsonOk = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);

/* ── Cache manager with real store ─────────────────────────────── */

function createCacheManager() {
  const store = new InMemoryCatalogCacheStore();
  return {
    manager: new CatalogCacheManager(store, { kind: 'no-expiry' } as const),
    store,
  };
}

/* ── Mock fetcher setup ────────────────────────────────────────── */

function mockFetchForRevision(
  fetcher: ReturnType<typeof vi.fn>,
  manifest: ReturnType<typeof makeManifest>,
  sources: ReturnType<typeof makeSources>,
  indexByKind: Record<string, ReturnType<typeof makeSpeciesIndex>>,
) {
  fetcher.mockResolvedValueOnce(jsonOk({ currentRevision: manifest.catalogRevision }));
  fetcher.mockResolvedValueOnce(jsonOk(manifest));
  fetcher.mockResolvedValueOnce(jsonOk(sources));
  for (const kind of manifest.entityKinds) {
    fetcher.mockResolvedValueOnce(jsonOk(indexByKind[kind] ?? []));
  }
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe('CatalogRuntimeService — candidate cache staging', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetcher = vi.fn();
  });

  const getFetcher = (): Fetcher => mockFetcher as unknown as Fetcher;

  it('stages manifest, sources, and indexes to revision-specific cache keys', async () => {
    const { manager, store } = createCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await service.activate();

    expect(service.activationState).toBe('active');

    // Verify manifest cache entry
    const manifestKey = buildManifestCacheKey(REV_A);
    const manifestEnvelope = await store.get(manifestKey);
    expect(manifestEnvelope).not.toBeNull();
    expect(isCacheEnvelope(manifestEnvelope!)).toBe(true);
    expect(manifestEnvelope!.value).toEqual(manifest);
    expect(manifestEnvelope!.catalogRevision).toBe(REV_A);
    expect(manifestEnvelope!.cacheSchemaVersion).toBe(CACHE_SCHEMA_VERSION);

    // Verify sources cache entry
    const sourcesKey = buildSourcesCacheKey(REV_A);
    const sourcesEnvelope = await store.get(sourcesKey);
    expect(sourcesEnvelope).not.toBeNull();
    expect(sourcesEnvelope!.value).toEqual({ 'phb': sources[0] });

    // Verify species index cache entry
    const speciesKey = buildIndexCacheKey(REV_A, 'species');
    const speciesEnvelope = await store.get(speciesKey);
    expect(speciesEnvelope).not.toBeNull();
    expect(speciesEnvelope!.value).toEqual(speciesIndex);

    // Verify background index cache entry
    const bgKey = buildIndexCacheKey(REV_A, 'background');
    const bgEnvelope = await store.get(bgKey);
    expect(bgEnvelope).not.toBeNull();
    expect(bgEnvelope!.value).toEqual(bgIndex);
  });

  it('does not stage when no cache manager is configured', async () => {
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
    });

    await service.activate();

    expect(service.activationState).toBe('active');
    // Activation succeeds even without cache manager
  });

  it('cache write failure aborts activation and preserves inactive state', async () => {
    // Create a store that throws on set
    const failingStore = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('disk full')),
      invalidate: vi.fn().mockResolvedValue(false),
      invalidateByRevision: vi.fn().mockResolvedValue(0),
      clear: vi.fn().mockResolvedValue(0),
      keys: vi.fn().mockReturnValue([]),
      size: vi.fn().mockReturnValue(0),
      diagnostics: vi.fn().mockReturnValue([]),
    };

    const manager = new CatalogCacheManager(failingStore, { kind: 'no-expiry' } as const);
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    // State must be rolled back to inactive
    expect(service.activationState).toBe('inactive');
    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  it('preserves former active revision cache when candidate staging fails', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds and stages to cache
    const manifestA = makeManifest(REV_A);
    const sourcesA = makeSources();
    const speciesIndexA = makeSpeciesIndex();
    const bgIndexA = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifestA, sourcesA, {
      species: speciesIndexA,
      background: bgIndexA,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await service.activate();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);

    // Verify REV_A cache entries exist
    const manifestKeyA = buildManifestCacheKey(REV_A);
    const cachedA = await store.get(manifestKeyA);
    expect(cachedA).not.toBeNull();

    // Second activation: REV_B fetches successfully but cache write fails
    // Make the store throw on the next set call
    const originalSet = store.set.bind(store);
    let setCallCount = 0;
    vi.spyOn(store, 'set').mockImplementation(async (key, envelope) => {
      setCallCount += 1;
      if (setCallCount > 0) {
        throw new Error('write failure during REV_B staging');
      }
      return originalSet(key, envelope);
    });

    const manifestB = makeManifest(REV_B);
    const sourcesB = makeSources();
    const speciesIndexB = makeSpeciesIndex();
    const bgIndexB = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifestB, sourcesB, {
      species: speciesIndexB,
      background: bgIndexB,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    // Service state must be rolled back to REV_A
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
    expect(service.manifest).toEqual(manifestA);

    // REV_A cache entries must still exist (not overwritten or invalidated)
    const cachedAAfter = await store.get(manifestKeyA);
    expect(cachedAAfter).not.toBeNull();
    expect(cachedAAfter!.value).toEqual(manifestA);
  });

  it('candidate cache entries survive commit (no invalidation)', async () => {
    const { manager, store } = createCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await service.activate();

    // Verify all cache entries still exist after commit
    const manifestKey = buildManifestCacheKey(REV_A);
    const manifestEnvelope = await store.get(manifestKey);
    expect(manifestEnvelope).not.toBeNull();

    const sourcesKey = buildSourcesCacheKey(REV_A);
    const sourcesEnvelope = await store.get(sourcesKey);
    expect(sourcesEnvelope).not.toBeNull();

    const speciesKey = buildIndexCacheKey(REV_A, 'species');
    const speciesEnvelope = await store.get(speciesKey);
    expect(speciesEnvelope).not.toBeNull();

    const bgKey = buildIndexCacheKey(REV_A, 'background');
    const bgEnvelope = await store.get(bgKey);
    expect(bgEnvelope).not.toBeNull();
  });

  it('stages required entities when validation references are provided', async () => {
    const { manager, store } = createCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    // Create a valid species rule that passes structural validation
    const entityDetail = createSpeciesRule(
      createEntityId('species:human'),
      'Human',
      createSourceId('phb'),
      '2024',
      'core',
      'Medium',
      30,
      false,
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      false,
    );

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });
    // Additional fetch for the required entity detail
    mockFetcher.mockResolvedValueOnce(jsonOk(entityDetail));

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await service.activate({
      requiredReferences: [
        { entityId: createEntityId('species:human'), kind: 'species' },
      ],
    });

    expect(service.activationState).toBe('active');

    // Verify entity cache entry exists
    const entityKey = buildEntityCacheKey(REV_A, 'entities/species/human.json');
    const entityEnvelope = await store.get(entityKey);
    expect(entityEnvelope).not.toBeNull();
    expect(entityEnvelope!.value).toEqual(entityDetail);
  });

  it('cache envelopes use correct schema version and no-expiry expiration', async () => {
    const { manager, store } = createCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const speciesIndex = makeSpeciesIndex();
    const bgIndex = makeBackgroundIndex();

    mockFetchForRevision(mockFetcher, manifest, sources, {
      species: speciesIndex,
      background: bgIndex,
      class: [],
      feat: [],
      spell: [],
      item: [],
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: getFetcher(),
      cacheManager: manager,
    });

    await service.activate();

    const manifestKey = buildManifestCacheKey(REV_A);
    const envelope = await store.get(manifestKey);
    expect(envelope).not.toBeNull();
    expect(envelope!.cacheSchemaVersion).toBe(CACHE_SCHEMA_VERSION);
    expect(envelope!.expiration).toEqual({ kind: 'no-expiry' });
    expect(envelope!.catalogRevision).toBe(REV_A);
    expect(envelope!.inputHash).toBe('src-abc');
    expect(envelope!.createdAt).toBeDefined();
  });
});
