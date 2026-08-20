/**
 * Tests for catalog runtime service cache restoration with exact
 * schema version enforcement (sources and index checks).
 *
 * Validates that restoreFromCache rejects sources and index
 * envelopes with schema version mismatches and returns specific
 * actionable reasons.
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
    item: [item('item:dagger', ['simple-weapon'])],
  };
}

/* ── Sources and index schema version mismatch ─────────────────── */

describe('restoreFromCache schema version enforcement for sources and index', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('rejects sources with version mismatch', async () => {
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

    // Sources with WRONG schema version
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

  it('rejects index with version mismatch', async () => {
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

    // Index with WRONG schema version for first kind
    store.set(buildIndexCacheKey(REV, 'species'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION + 1,
      catalogRevision: REV,
      inputHash: `${SOURCE_REV}:species`,
      createdAt,
      expiration,
      value: index.species,
    }));

    // Remaining indexes with correct schema version
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
});
