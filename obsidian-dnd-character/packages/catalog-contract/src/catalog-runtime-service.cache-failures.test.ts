import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { CatalogCacheManager } from './cache-manager';
import { InMemoryCatalogCacheStore } from './cache-store';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { buildManifestCacheKey, buildSourcesCacheKey, buildIndexCacheKey } from './cache-keys';
import { createSpeciesRule } from './entity-species';

const REV_A = createCatalogRevision('rev-a');
const REV_B = createCatalogRevision('rev-b');

const makeManifest = (rev: typeof REV_A) => createCatalogManifest({
  schemaVersion: CATALOG_SCHEMA_VERSION, catalogRevision: rev, sourceRevision: 'src-abc',
  builderVersion: '0.1.0', generatedAt: '2026-07-22T00:00:00Z', rulesets: ['2024'],
  entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
  checksums: { 'manifest.json': 'sha256-abc' },
});

const makeSources = () => [createCatalogSource({
  id: createSourceId('phb'), name: "Player's Handbook", abbreviation: 'PHB',
  ruleset: '2024', category: 'core',
})];

const makeSpeciesIndex = () => [createCatalogEntitySummary({
  id: createEntityId('species:human'), kind: 'species', name: 'Human',
  sourceId: createSourceId('phb'), ruleset: '2024', access: 'core',
  legacy: false, tags: ['humanoid'], detailPath: 'entities/species/human.json',
})];

const makeBgIndex = () => [createCatalogEntitySummary({
  id: createEntityId('background:acolyte'), kind: 'background', name: 'Acolyte',
  sourceId: createSourceId('phb'), ruleset: '2024', access: 'core',
  legacy: false, tags: [], detailPath: 'entities/backgrounds/acolyte.json',
})];

const jsonOk = (data: unknown) => Promise.resolve({
  ok: true, status: 200, json: () => Promise.resolve(data),
} as Response);

function createCacheManager() {
  const store = new InMemoryCatalogCacheStore();
  return { manager: new CatalogCacheManager(store, { kind: 'no-expiry' } as const), store };
}

function mockFetch(mock: ReturnType<typeof vi.fn>, m: ReturnType<typeof makeManifest>,
  s: ReturnType<typeof makeSources>, idx: Record<string, ReturnType<typeof makeSpeciesIndex>>) {
  mock.mockResolvedValueOnce(jsonOk({ currentRevision: m.catalogRevision }));
  mock.mockResolvedValueOnce(jsonOk(m));
  mock.mockResolvedValueOnce(jsonOk(s));
  for (const k of m.entityKinds) mock.mockResolvedValueOnce(jsonOk(idx[k] ?? []));
}

const ALL_KINDS = { species: makeSpeciesIndex(), background: makeBgIndex(), class: [], feat: [], spell: [], item: [] };

describe('CatalogRuntimeService — cache failure modes', () => {
  let mock: ReturnType<typeof vi.fn>;

  beforeEach(() => { mock = vi.fn(); });
  const getFetcher = (): Fetcher => mock as unknown as Fetcher;

  it('cache write failure aborts activation and preserves inactive state', async () => {
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
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });

    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  it('preserves former active revision cache when candidate staging fails', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds and stages to cache
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });

    await service.activate();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);

    const manifestKeyA = buildManifestCacheKey(REV_A);
    expect(await store.get(manifestKeyA)).not.toBeNull();

    // Second activation: REV_B fetches successfully but cache write fails
    vi.spyOn(store, 'set').mockImplementation(async (_key, _envelope) => {
      throw new Error('write failure during REV_B staging');
    });

    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    // Service state must be rolled back to REV_A
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);

    // REV_A cache entries must still exist
    const cachedAAfter = await store.get(manifestKeyA);
    expect(cachedAAfter).not.toBeNull();
    expect(cachedAAfter!.value).toEqual(makeManifest(REV_A));
  });

  it('index write failure after earlier artifacts staged preserves rollback', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);

    // Second activation: REV_B, fail on write #3 (first index, after manifest+sources)
    const originalSet = store.set.bind(store);
    let setCount = 0;
    vi.spyOn(store, 'set').mockImplementation(async (key, envelope) => {
      setCount += 1;
      if (setCount === 3) throw new Error('index write failure');
      return originalSet(key, envelope);
    });

    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    // Manifest and sources were staged before the failure
    expect(setCount).toBe(3);
    const manifestB = await store.get(buildManifestCacheKey(REV_B));
    expect(manifestB).not.toBeNull();
    const sourcesB = await store.get(buildSourcesCacheKey(REV_B));
    expect(sourcesB).not.toBeNull();

    // Service rolled back to REV_A
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
  });

  it('required-entity write failure after artifacts staged preserves rollback', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);

    // Second activation: REV_B with required entity, fail on write #9 (first entity)
    // Writes: 1 manifest + 1 sources + 6 indexes + 1 entity = 9
    const entityDetail = createSpeciesRule(
      createEntityId('species:human'), 'Human', createSourceId('phb'),
      '2024', 'core', 'Medium', 30, false, [], [], [], [], [], [], [], false,
    );
    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    mock.mockResolvedValueOnce(jsonOk(entityDetail));

    let setCount = 0;
    const originalSet = store.set.bind(store);
    vi.spyOn(store, 'set').mockImplementation(async (key, envelope) => {
      setCount += 1;
      if (setCount === 9) throw new Error('entity write failure');
      return originalSet(key, envelope);
    });

    await expect(service.activate({
      requiredReferences: [{ entityId: createEntityId('species:human'), kind: 'species' }],
    })).rejects.toThrow(CatalogRuntimeError);

    // Manifest, sources, and indexes were staged before the failure
    expect(setCount).toBe(9);
    expect(await store.get(buildManifestCacheKey(REV_B))).not.toBeNull();
    expect(await store.get(buildSourcesCacheKey(REV_B))).not.toBeNull();
    expect(await store.get(buildIndexCacheKey(REV_B, 'species'))).not.toBeNull();

    // Service rolled back to REV_A
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
  });

  it('candidate is not active while staging promise is pending', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);

    // Second activation: REV_B, hold the first staging write pending
    let resolveSet: () => void;
    const pendingPromise = new Promise<void>((resolve) => { resolveSet = resolve; });

    vi.spyOn(store, 'set').mockImplementation(async () => {
      await pendingPromise; // Block until resolved
    });

    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    const activatePromise = service.activate();

    // While staging is pending, candidate must NOT be active
    expect(service.activationState).toBe('fetching');
    expect(service.revision).toBe(REV_A); // Former revision still active

    // Resolve the pending write and let activation complete
    resolveSet!();
    await activatePromise;
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_B);
  });

  it('candidate only becomes active after final staging promise resolves', async () => {
    const { manager, store } = createCacheManager();

    // First activation: REV_A succeeds
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: getFetcher(), cacheManager: manager,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);

    // Second activation: REV_B, hold the last staging write pending
    // Writes: 1 manifest + 1 sources + 6 indexes = 8 total (no required entities)
    const originalSet = store.set.bind(store);
    let setCount = 0;
    let resolveSet: () => void;
    const pendingPromise = new Promise<void>((resolve) => { resolveSet = resolve; });

    // Signal when we've completed 7 writes and the 8th is blocking
    let reachedSeventh: (count: number) => void;
    const seventhDone = new Promise<number>((resolve) => { reachedSeventh = resolve; });

    vi.spyOn(store, 'set').mockImplementation(async (key, envelope) => {
      setCount += 1;
      if (setCount === 8) {
        reachedSeventh(setCount - 1); // Signal: 7 writes done, 8th is about to block
        await pendingPromise;
        return originalSet(key, envelope);
      }
      return originalSet(key, envelope);
    });

    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    const activatePromise = service.activate();

    // Wait until the first 7 writes complete and the 8th blocks
    const completedWrites = await seventhDone;

    // After 7 writes but before final write, candidate must NOT be active
    expect(completedWrites).toBe(7);
    expect(service.activationState).toBe('fetching');
    expect(service.revision).toBe(REV_A);

    // Resolve final write
    resolveSet!();
    await activatePromise;
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_B);
    expect(setCount).toBe(8);
  });
});
