/**
 * Tests for catalog runtime service cache restoration input hash
 * mismatch with specific failure reasons.
 *
 * Validates that restoreFromCache returns structured diagnostics
 * when cached envelope input hashes do not match expected values.
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

/* ── Input hash mismatch with specific reasons ─────────────────── */

describe('restoreFromCache input hash mismatch reasons', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('returns manifest-envelope-invalid for manifest input hash mismatch', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with WRONG input hash
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

  it('returns sources-envelope-invalid for sources input hash mismatch', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct input hash
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with WRONG input hash
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: 'wrong-sources-hash',
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
      expect(result.reason).toBe('sources-envelope-invalid');
    }
  });

  it('returns index-envelope-invalid for index input hash mismatch', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with correct input hash
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with correct input hash
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

    // Index with WRONG input hash
    store.set(buildIndexCacheKey(REV, 'species'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: 'wrong-index-hash',
      createdAt,
      expiration,
      value: index.species,
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
      expect(result.reason).toBe('index-envelope-invalid');
    }
  });
});
