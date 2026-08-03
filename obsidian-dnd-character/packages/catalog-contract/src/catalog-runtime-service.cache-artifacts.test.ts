import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { CatalogCacheManager } from './cache-manager';
import { InMemoryCatalogCacheStore } from './cache-store';
import { isCacheEnvelope, CACHE_SCHEMA_VERSION } from './cache-envelope';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { buildManifestCacheKey, buildSourcesCacheKey, buildIndexCacheKey } from './cache-keys';

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

/* ── Tests ─────────────────────────────────────────────────────── */

describe('CatalogRuntimeService — cache artifact staging', () => {
  let mock: ReturnType<typeof vi.fn>;

  beforeEach(() => { mock = vi.fn(); });
  const getFetcher = (): Fetcher => mock as unknown as Fetcher;

  it('stages manifest, sources, and indexes to revision-specific cache keys', async () => {
    const { manager, store } = createCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();

    mockFetch(mock, manifest, sources, ALL_KINDS);

    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager });
    await service.activate();
    expect(service.activationState).toBe('active');

    const mKey = buildManifestCacheKey(REV_A);
    const mEnv = await store.get(mKey);
    expect(mEnv).not.toBeNull();
    expect(isCacheEnvelope(mEnv!)).toBe(true);
    expect(mEnv!.value).toEqual(manifest);
    expect(mEnv!.catalogRevision).toBe(REV_A);
    expect(mEnv!.cacheSchemaVersion).toBe(CACHE_SCHEMA_VERSION);

    const sKey = buildSourcesCacheKey(REV_A);
    const sEnv = await store.get(sKey);
    expect(sEnv).not.toBeNull();
    expect(sEnv!.value).toEqual({ 'phb': sources[0] });

    const spKey = buildIndexCacheKey(REV_A, 'species');
    const spEnv = await store.get(spKey);
    expect(spEnv).not.toBeNull();
    expect(spEnv!.value).toEqual(ALL_KINDS.species);

    const bgKey = buildIndexCacheKey(REV_A, 'background');
    const bgEnv = await store.get(bgKey);
    expect(bgEnv).not.toBeNull();
    expect(bgEnv!.value).toEqual(ALL_KINDS.background);
  });

  it('does not stage when no cache manager is configured', async () => {
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher() });
    await service.activate();
    expect(service.activationState).toBe('active');
  });

  it('candidate cache entries survive commit (no invalidation)', async () => {
    const { manager, store } = createCacheManager();
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager });
    await service.activate();

    expect(await store.get(buildManifestCacheKey(REV_A))).not.toBeNull();
    expect(await store.get(buildSourcesCacheKey(REV_A))).not.toBeNull();
    expect(await store.get(buildIndexCacheKey(REV_A, 'species'))).not.toBeNull();
    expect(await store.get(buildIndexCacheKey(REV_A, 'background'))).not.toBeNull();
  });

  it('cache envelopes use correct schema version and no-expiry expiration', async () => {
    const { manager, store } = createCacheManager();
    mockFetch(mock, makeManifest(REV_A), makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager });
    await service.activate();

    const env = await store.get(buildManifestCacheKey(REV_A));
    expect(env).not.toBeNull();
    expect(env!.cacheSchemaVersion).toBe(CACHE_SCHEMA_VERSION);
    expect(env!.expiration).toEqual({ kind: 'no-expiry' });
    expect(env!.catalogRevision).toBe(REV_A);
    expect(env!.inputHash).toBe('src-abc');
    expect(env!.createdAt).toBeDefined();
  });

  it('revision A cache survives successful revision B activation', async () => {
    const { manager, store } = createCacheManager();
    const manifestA = makeManifest(REV_A);

    mockFetch(mock, manifestA, makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager });
    await service.activate();
    expect(service.revision).toBe(REV_A);

    const mKeyA = buildManifestCacheKey(REV_A);
    expect(await store.get(mKeyA)).not.toBeNull();

    // Activate REV_B
    mockFetch(mock, makeManifest(REV_B), makeSources(), ALL_KINDS);
    await service.activate();
    expect(service.revision).toBe(REV_B);

    // REV_A cache must still exist
    const cachedA = await store.get(mKeyA);
    expect(cachedA).not.toBeNull();
    expect(cachedA!.value).toEqual(manifestA);
  });

  it('revision B cache remains readable after successful activation', async () => {
    const { manager, store } = createCacheManager();
    const manifestB = makeManifest(REV_B);

    mockFetch(mock, manifestB, makeSources(), ALL_KINDS);
    const service = new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager });
    await service.activate();
    expect(service.revision).toBe(REV_B);

    const cachedB = await store.get(buildManifestCacheKey(REV_B));
    expect(cachedB).not.toBeNull();
    expect(cachedB!.value).toEqual(manifestB);
    expect(cachedB!.catalogRevision).toBe(REV_B);

    const sourcesCached = await store.get(buildSourcesCacheKey(REV_B));
    expect(sourcesCached).not.toBeNull();
    expect(sourcesCached!.catalogRevision).toBe(REV_B);

    const speciesCached = await store.get(buildIndexCacheKey(REV_B, 'species'));
    expect(speciesCached).not.toBeNull();
    expect(speciesCached!.catalogRevision).toBe(REV_B);
  });
});
