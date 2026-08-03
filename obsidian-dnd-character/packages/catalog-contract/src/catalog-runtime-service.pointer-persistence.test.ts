import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import type { ActiveRevisionPersistence } from './active-revision-persistence';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { CatalogCacheManager } from './cache-manager';
import { InMemoryCatalogCacheStore } from './cache-store';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { buildManifestCacheKey } from './cache-keys';

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

const jsonOk = (data: unknown) => Promise.resolve({
  ok: true, status: 200, json: () => Promise.resolve(data),
} as Response);

function mockFetch(mock: ReturnType<typeof vi.fn>, manifest: ReturnType<typeof makeManifest>) {
  const sources = makeSources();
  const index = makeSpeciesIndex();
  mock.mockResolvedValueOnce(jsonOk({ currentRevision: manifest.catalogRevision }));
  mock.mockResolvedValueOnce(jsonOk(manifest));
  mock.mockResolvedValueOnce(jsonOk(sources));
  for (const k of manifest.entityKinds) {
    mock.mockResolvedValueOnce(jsonOk(k === 'species' ? index : []));
  }
}

function createCacheManager() {
  const store = new InMemoryCatalogCacheStore();
  return { manager: new CatalogCacheManager(store, { kind: 'no-expiry' } as const), store };
}

// ── Mock persistence store ──────────────────────────────────────

function createMockPersistence(options: { failSave?: boolean; failSecondSave?: boolean } = {}) {
  let _saved: typeof REV_A | null = null;
  let _count = 0;
  const calls: Array<typeof REV_A> = [];
  const persistence: ActiveRevisionPersistence = {
    async load() { return _saved ?? null; },
    async save(revision) {
      _count += 1;
      calls.push(revision);
      if (options.failSave) throw new Error('persistence failure');
      if (options.failSecondSave && _count === 2) throw new Error('second save failure');
      _saved = revision;
    },
    async clear() { _saved = null; },
  };
  return { persistence, get saved() { return _saved; }, get count() { return _count; }, calls };
}

// ── Tests ───────────────────────────────────────────────────────

describe('CatalogRuntimeService — active revision pointer persistence', () => {
  let mock: ReturnType<typeof vi.fn>;
  beforeEach(() => { mock = vi.fn(); });
  const getFetcher = (): Fetcher => mock as unknown as Fetcher;

  // Test 1: Pointer save timing (after staging, before swap)
  it('persists pointer after cache staging and before active snapshot swap', async () => {
    const { manager, store } = createCacheManager();
    const manifestB = makeManifest(REV_B);
    const { persistence, calls } = createMockPersistence();
    mockFetch(mock, manifestB);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      cacheManager: manager, activeRevisionPersistence: persistence,
    });
    await service.activate();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(REV_B);
    const mEnv = await store.get(buildManifestCacheKey(REV_B));
    expect(mEnv).not.toBeNull();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_B);
  });

  // Test 2: Success activates
  it('activates successfully when persistence succeeds', async () => {
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence();
    mockFetch(mock, manifestB);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    await service.activate();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_B);
    expect(await persistence.load()).toBe(REV_B);
  });

  // Test 3: Failure preserves former state (A)
  it('preserves former active state when persistence fails', async () => {
    const { manager } = createCacheManager();
    const manifestA = makeManifest(REV_A);
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSecondSave: true });
    mockFetch(mock, manifestA);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      cacheManager: manager, activeRevisionPersistence: persistence,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);
    expect(service.activationState).toBe('active');
    mockFetch(mock, manifestB);
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    expect(service.revision).toBe(REV_A);
    expect(service.activationState).toBe('active');
  });

  // Test 4: Failed first save leaves inactive
  it('leaves service inactive when first activation persistence fails', async () => {
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSave: true });
    mockFetch(mock, manifestB);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    expect(service.activationState).toBe('inactive');
    expect(service.revision).toBeUndefined();
  });

  // Test 5: Pointer remains A after failed B
  it('persists pointer remains at former revision after failed activation', async () => {
    const manifestA = makeManifest(REV_A);
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSecondSave: true });
    mockFetch(mock, manifestA);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    await service.activate();
    expect(service.revision).toBe(REV_A);
    mockFetch(mock, manifestB);
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    const loaded = await persistence.load();
    expect(loaded).toBe(REV_A);
    expect(service.revision).toBe(REV_A);
  });

  // Test 6: Failed first save leaves inactive (variant)
  it('does not activate when persistence fails on initial activation', async () => {
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSave: true });
    mockFetch(mock, manifestB);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    await expect(service.activate()).rejects.toThrow();
    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  // Test 7: Candidate B not visible after failure
  it('does not expose candidate revision after persistence failure', async () => {
    const manifestA = makeManifest(REV_A);
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSecondSave: true });
    mockFetch(mock, manifestA);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    await service.activate();
    mockFetch(mock, manifestB);
    await expect(service.activate()).rejects.toThrow();
    expect(service.revision).toBe(REV_A);
    expect(service.manifest?.catalogRevision).toBe(REV_A);
  });

  // Test 8: Former cache remains readable after failure
  it('preserves former revision cache after persistence failure', async () => {
    const { manager, store } = createCacheManager();
    const manifestA = makeManifest(REV_A);
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSecondSave: true });
    mockFetch(mock, manifestA);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      cacheManager: manager, activeRevisionPersistence: persistence,
    });
    await service.activate();
    const aKey = buildManifestCacheKey(REV_A);
    const aBefore = await store.get(aKey);
    expect(aBefore).not.toBeNull();
    mockFetch(mock, manifestB);
    await expect(service.activate()).rejects.toThrow();
    const aAfter = await store.get(aKey);
    expect(aAfter).not.toBeNull();
    expect(aAfter?.value).toEqual(aBefore?.value);
  });

  // Test 9: Candidate cache not invalidated on failure
  it('does not invalidate candidate cache on persistence failure', async () => {
    const { manager, store } = createCacheManager();
    const manifestA = makeManifest(REV_A);
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSecondSave: true });
    mockFetch(mock, manifestA);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      cacheManager: manager, activeRevisionPersistence: persistence,
    });
    await service.activate();
    mockFetch(mock, manifestB);
    await expect(service.activate()).rejects.toThrow();
    const bKey = buildManifestCacheKey(REV_B);
    const bEnv = await store.get(bKey);
    expect(bEnv).not.toBeNull();
  });

  // Test 10: Diagnostic identifies operation
  it('diagnostic identifies persistence failure endpoint', async () => {
    const manifestB = makeManifest(REV_B);
    const { persistence } = createMockPersistence({ failSave: true });
    mockFetch(mock, manifestB);
    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(),
      activeRevisionPersistence: persistence,
    });
    try {
      await service.activate();
      expect.fail('expected activation to throw');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.endpoint).toBe('active-revision-persistence');
        expect(error.revision).toBe(REV_B);
        expect(error.recoverable).toBe(true);
        expect(error.message).toContain('persist active revision pointer');
      } else {
        throw error;
      }
    }
  });
});
