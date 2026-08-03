/**
 * Tests for CatalogRuntimeService restoration reason diagnostics.
 *
 * Verifies that restoreFromCache returns specific, actionable
 * reasons for each failure mode with artifact-family prefixes
 * for cache envelope compatibility checks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import { createCacheEnvelope, createNoExpiryExpiration, CACHE_SCHEMA_VERSION } from './cache-envelope';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
} from './cache-keys';
import { createCatalogRevision } from '@obsidian-dnd/domain';
import {
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
  mockFetcher,
} from './catalog-runtime-service.cache-restoration-helpers';

const REV = createCatalogRevision('rev-a');
const SOURCE_REV = 'abc123';

function buildIndex() {
  return {
    species: [sp('species:human'), sp('species:elf')],
    background: [bg('background:acolyte')],
    class: [cls('class:barbarian')],
    feat: [feat('feat:tough')],
    spell: [spell('spell:fireball')],
    item: [item('item:dagger')],
  };
}

/* ── Artifact-specific restoration reasons ──────────────────────── */

describe('restoreFromCache artifact-specific restoration reasons', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('returns manifest-envelope-version-mismatch for wrong schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with wrong schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION + 1,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    for (const kind of manifest.entityKinds) {
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('manifest-envelope-version-mismatch');
    }
  });

  it('returns manifest-envelope-revision-mismatch for wrong revision', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with wrong revision
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision('rev-b'),
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    for (const kind of manifest.entityKinds) {
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('manifest-envelope-revision-mismatch');
    }
  });

  it('returns manifest-envelope-invalid for manifest hash mismatch', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with wrong input hash
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: 'wrong-hash',
      createdAt,
      expiration,
      value: manifest,
    }));

    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    for (const kind of manifest.entityKinds) {
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('manifest-envelope-invalid');
    }
  });

  it('returns sources-envelope-version-mismatch for wrong schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with wrong schema version
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION + 1,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    for (const kind of manifest.entityKinds) {
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('sources-envelope-version-mismatch');
    }
  });

  it('returns sources-envelope-revision-mismatch for wrong revision', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with wrong revision
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision('rev-b'),
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    for (const kind of manifest.entityKinds) {
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('sources-envelope-revision-mismatch');
    }
  });

  it('returns index-envelope-version-mismatch for wrong schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with correct schema version
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    // Index with wrong schema version
    const speciesEntries = index.species;
    store.set(buildIndexCacheKey(REV, 'species'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION + 1,
      catalogRevision: REV,
      inputHash: `${SOURCE_REV}:species`,
      createdAt,
      expiration,
      value: speciesEntries,
    }));

    for (const kind of manifest.entityKinds) {
      if (kind === 'species') continue;
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('index-envelope-version-mismatch');
    }
  });

  it('returns index-envelope-revision-mismatch for wrong revision', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with correct schema version
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    // Index with wrong revision
    const speciesEntries = index.species;
    store.set(buildIndexCacheKey(REV, 'species'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: createCatalogRevision('rev-b'),
      inputHash: `${SOURCE_REV}:species`,
      createdAt,
      expiration,
      value: speciesEntries,
    }));

    for (const kind of manifest.entityKinds) {
      if (kind === 'species') continue;
      const entries = index[kind as keyof typeof index] ?? [];
      store.set(buildIndexCacheKey(REV, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('index-envelope-revision-mismatch');
    }
  });
});
