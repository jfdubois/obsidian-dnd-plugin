import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import {
  REV_A,
  REV_B,
  makeManifest,
  makeSources,
  sp,
  bg,
  cls,
  feat,
  spell,
  item,
  createMockPersistence,
  createMockCacheManager,
  populateCache,
  mockFetcher,
} from './catalog-runtime-service.cache-restoration-helpers';
import { createCacheEnvelope, createNoExpiryExpiration } from './cache-envelope';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
} from './cache-keys';
import type { CatalogEntitySummary } from './entity-summary';

describe('CatalogRuntimeService — restoreFromCache (negative)', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('returns false when no persistence store', async () => {
    const { cm } = createMockCacheManager();
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when no cache manager', async () => {
    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when persisted pointer is null', async () => {
    const persistence = createMockPersistence(null);
    const { cm } = createMockCacheManager();
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when persisted pointer is empty string', async () => {
    const persistence = createMockPersistence('');
    const { cm } = createMockCacheManager();
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when manifest not in cache', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm } = createMockCacheManager();
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when schema version incompatible', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    // Override schema version to incompatible value
    manifest.schemaVersion = 99;
    populateCache(store, REV_A, manifest, makeSources(), {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    });
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when manifest revision mismatch', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_B);
    populateCache(store, REV_A, manifest, makeSources(), {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    });
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when sources not in cache', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    store.set(buildManifestCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash: manifest.sourceRevision,
      createdAt: '2026-07-22T00:00:00Z',
      expiration: createNoExpiryExpiration(),
      value: manifest,
    }));
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when index not in cache', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) {
      sourcesRecord[s.id] = s;
    }
    const expiration = createNoExpiryExpiration();
    const inputHash = manifest.sourceRevision;
    store.set(buildManifestCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash,
      createdAt: '2026-07-22T00:00:00Z',
      expiration,
      value: manifest,
    }));
    store.set(buildSourcesCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash,
      createdAt: '2026-07-22T00:00:00Z',
      expiration,
      value: sourcesRecord,
    }));
    store.set(buildIndexCacheKey(REV_A, 'species'), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash: `${inputHash}:species`,
      createdAt: '2026-07-22T00:00:00Z',
      expiration,
      value: [sp('human')],
    }));
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when index invariants violated', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    populateCache(store, REV_A, manifest, sources, {
      species: [sp('elf', { kind: 'background' })],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    });
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('rejects a schema-v4 cached item index entry missing equipment groups', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const validItem = item('dagger', ['simple-weapon']);
    const { equipmentGroups: _equipmentGroups, ...missingGroups } = validItem;
    populateCache(store, REV_A, manifest, makeSources(), {
      species: [sp('human')], background: [bg('acolyte')], class: [cls('barbarian')],
      feat: [feat('tough')], spell: [spell('fireball')],
      item: [missingGroups as CatalogEntitySummary],
    });
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com', fetcher: mockFetcher, cacheManager: cm, activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result).toEqual({ success: false, reason: 'index-malformed' });
    expect(service.index['item']).toBeUndefined();
  });

  it('returns false when detail path is invalid', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    // Species entry with a detailPath containing ".." traversal
    const invalidSpecies = sp('rogue', {
      detailPath: 'entities/species/../../etc/passwd.json',
    });
    populateCache(store, REV_A, manifest, sources, {
      species: [invalidSpecies],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    });
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });

  it('returns false when manifest is structurally malformed', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    // Object missing required fields (entityKinds, rulesets) — fails isCatalogManifest
    const malformedManifest = {
      apiVersion: 1,
      schemaVersion: 2,
      catalogRevision: REV_A,
      sourceRevision: 'abc123',
      builderVersion: '0.1.0',
      generatedAt: '2026-07-22T00:00:00Z',
      checksums: { 'manifest.json': 'sha256-abc' },
    };
    store.set(buildManifestCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash: 'abc123',
      createdAt: '2026-07-22T00:00:00Z',
      expiration: createNoExpiryExpiration(),
      value: malformedManifest,
    }));
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });
    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    expect(service.activationState).toBe('inactive');
  });
});
