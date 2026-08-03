/**
 * Tests for catalog runtime service cache restoration with exact
 * schema version enforcement (manifest checks).
 *
 * Validates that restoreFromCache rejects manifest envelopes with
 * schema version mismatches and returns specific actionable reasons.
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

/* ── Schema version mismatch ───────────────────────────────────── */

describe('restoreFromCache schema version enforcement', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('succeeds when manifest envelope has current schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with current schema version
    store.set(buildManifestCacheKey(REV), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Sources with current schema version
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

    // Indexes with current schema version
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
    expect(result.success).toBe(true);
  });

  it('rejects manifest with incompatible schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with incompatible schema version (future version)
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

  it('rejects manifest with different schema version', async () => {
    const manifest = makeManifest(REV);
    const sources = makeSources();
    const index = buildIndex();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Manifest with FUTURE schema version
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
});
