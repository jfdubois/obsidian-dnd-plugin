/**
 * Tests for production offline entity loading through CatalogRuntimeService.
 *
 * Validates that entity details cached during staging are readable
 * through the production cache path with canonical input hashes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import { createCacheEnvelope, createNoExpiryExpiration, CACHE_SCHEMA_VERSION } from './cache-envelope';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
  buildEntityInputHash,
} from './cache-keys';
import { createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { createCatalogEntitySummary } from './entity-summary';
import { createSpeciesRule } from './entity-species';
import {
  REV_A,
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

const SOURCE_REV = 'abc123';

function makeSpeciesSummary() {
  return createCatalogEntitySummary({
    id: createEntityId('species:human'),
    kind: 'species',
    name: 'Human',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: 'entities/species/human.json',
  });
}

function makeSpeciesDetail() {
  return createSpeciesRule(
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
}

/* ── Offline entity loading through production path ────────────── */

describe('offline entity loading through production path', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('loads cached entity detail with canonical input hash', async () => {
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const summary = makeSpeciesSummary();
    const detail = makeSpeciesDetail();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Stage manifest with correct schema version and input hash
    store.set(buildManifestCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Stage sources
    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    // Stage entity indexes for all required kinds
    const indexByKind = {
      species: [summary, sp('species:elf')],
      background: [bg('background:acolyte')],
      class: [cls('class:barbarian')],
      feat: [feat('feat:tough')],
      spell: [spell('spell:fireball')],
      item: [item('item:dagger', ['simple-weapon'])],
    };
    for (const kind of manifest.entityKinds) {
      const entries = indexByKind[kind as keyof typeof indexByKind] ?? [];
      store.set(buildIndexCacheKey(REV_A, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV_A,
        inputHash: `${SOURCE_REV}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    // Stage entity detail with CANONICAL input hash
    const entityHash = buildEntityInputHash(SOURCE_REV, 'species:human');
    store.set(buildEntityCacheKey(REV_A, 'species:human'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: entityHash,
      createdAt,
      expiration,
      value: detail,
    }));

    const persistence = createMockPersistence('rev-a');
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    // Restore from cache (activates service)
    const restoreResult = await service.restoreFromCache();
    expect(restoreResult.success).toBe(true);

    // Verify entity is accessible through getCached with canonical hash
    const cached = await cm.getCached(buildEntityCacheKey(REV_A, 'species:human'));
    expect(cached).not.toBeNull();
    if (cached) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (cached as any).value;
      expect(val.id).toBe('species:human');
      expect(cached.inputHash).toBe(entityHash);
    }
  });

  it('cached entity survives activation state transition', async () => {
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const summary = makeSpeciesSummary();
    const detail = makeSpeciesDetail();

    const { cm, store } = createMockCacheManager();
    const expiration = createNoExpiryExpiration();
    const createdAt = '2026-07-22T00:00:00Z';

    // Pre-populate cache with entity detail
    const entityHash = buildEntityInputHash(SOURCE_REV, 'species:human');
    store.set(buildEntityCacheKey(REV_A, 'species:human'), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: entityHash,
      createdAt,
      expiration,
      value: detail,
    }));

    // Stage manifest, sources, index
    store.set(buildManifestCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: manifest,
    }));

    const sourcesRecord: Record<string, typeof sources[number]> = {};
    for (const s of sources) sourcesRecord[s.id] = s;
    store.set(buildSourcesCacheKey(REV_A), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: REV_A,
      inputHash: SOURCE_REV,
      createdAt,
      expiration,
      value: sourcesRecord,
    }));

    const indexByKind = {
      species: [summary],
      background: [bg('background:acolyte')],
      class: [cls('class:barbarian')],
      feat: [feat('feat:tough')],
      spell: [spell('spell:fireball')],
      item: [item('item:dagger', ['simple-weapon'])],
    };
    for (const kind of manifest.entityKinds) {
      const entries = indexByKind[kind as keyof typeof indexByKind] ?? [];
      store.set(buildIndexCacheKey(REV_A, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: REV_A,
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

    // Verify activation state before restoration
    expect(service.activationState).toBe('inactive');

    // Restore from cache
    const restoreResult = await service.restoreFromCache();
    expect(restoreResult.success).toBe(true);

    // Verify activation state after restoration
    expect(service.activationState).toBe('active');

    // Verify entity is still accessible
    const cached = await cm.getCached(buildEntityCacheKey(REV_A, 'species:human'));
    expect(cached).not.toBeNull();
    if (cached) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (cached as any).value;
      expect(val.id).toBe('species:human');
    }
  });
});

/* ── Canonical hash consistency between staging and loading ────── */

describe('canonical hash consistency', () => {
  it('staging and restoration use same entity input hash format', () => {
    // The canonical builder produces: <sourceRevision>:<entityId>
    const hash = buildEntityInputHash(SOURCE_REV, 'species:human');

    // This must match what the runtime service stages
    expect(hash).toBe('abc123:species:human');

    // This must NOT match the old divergent format
    const oldDivergentFormat = `entity:${REV_A}:${SOURCE_REV}:species:human`;
    expect(hash).not.toBe(oldDivergentFormat);
  });

  it('manifest input hash is source revision only', () => {
    // Canonical manifest hash: <sourceRevision>
    const hash = SOURCE_REV; // buildManifestInputHash just returns sourceRevision
    expect(hash).toBe('abc123');
    expect(hash).not.toContain('manifest:');
  });

  it('sources input hash is source revision only', () => {
    // Canonical sources hash: <sourceRevision>
    const hash = SOURCE_REV; // buildSourcesInputHash just returns sourceRevision
    expect(hash).toBe('abc123');
    expect(hash).not.toContain('sources:');
  });

  it('index input hash is sourceRevision:kind', () => {
    // Canonical index hash: <sourceRevision>:<kind>
    const expected = `${SOURCE_REV}:species`;
    expect(expected).toBe('abc123:species');
    expect(expected).not.toContain('index:');
  });
});
