import { vi } from 'vitest';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import type { CatalogEntitySummary } from './entity-summary';
import { createCatalogEntitySummary } from './entity-summary';
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import type { ActiveRevisionPersistence } from './active-revision-persistence';
import type { CatalogCacheManager } from './cache-manager';
import { createCacheEnvelope, createNoExpiryExpiration } from './cache-envelope';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
} from './cache-keys';
import type { Fetcher } from './catalog-runtime-service';

export const REV_A = createCatalogRevision('rev-a');
export const REV_B = createCatalogRevision('rev-b');

export const makeManifest = (rev: typeof REV_A) =>
  createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: rev,
    sourceRevision: 'abc123',
    builderVersion: '0.1.0',
    generatedAt: '2026-07-22T00:00:00Z',
    rulesets: ['2024'],
    entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
    checksums: { 'manifest.json': 'sha256-abc' },
  });

export const makeSources = () => [
  createCatalogSource({
    id: createSourceId('phb'),
    name: "Player's Handbook",
    abbreviation: 'PHB',
    ruleset: '2024',
    category: 'core',
  }),
];

export const sp = (id: string, overrides?: Partial<CatalogEntitySummary>) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'species',
    name: 'Human',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/species/${id}.json`,
    ...overrides,
  });

export const bg = (id: string) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'background',
    name: 'Acolyte',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/backgrounds/${id}.json`,
  });

export const cls = (id: string) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'class',
    name: 'Barbarian',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/classes/${id}.json`,
  });

export const feat = (id: string) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'feat',
    name: 'Tough',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/feats/${id}.json`,
  });

export const spell = (id: string) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'spell',
    name: 'Fireball',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/spells/${id}.json`,
  });

export const item = (id: string) =>
  createCatalogEntitySummary({
    id: createEntityId(id),
    kind: 'item',
    name: 'Dagger',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: [],
    detailPath: `entities/items/${id}.json`,
  });

export function createMockPersistence(persistedRevision: string | null): ActiveRevisionPersistence {
  return {
    load: vi.fn(() => Promise.resolve(persistedRevision as unknown)),
    save: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  };
}

export interface MockCacheManagerResult {
  cm: CatalogCacheManager;
  store: Map<string, unknown>;
}

export function createMockCacheManager(): MockCacheManagerResult {
  const store = new Map<string, unknown>();
  return {
    cm: {
      getCached: vi.fn((key: string) => {
        const val = store.get(key);
        return Promise.resolve(val !== undefined ? val : null);
      }),
      set: vi.fn((key: string, envelope: unknown) => {
        store.set(key, envelope);
        return Promise.resolve();
      }),
      invalidate: vi.fn(() => Promise.resolve(false)),
      invalidateByRevision: vi.fn(() => Promise.resolve(0)),
      clear: vi.fn(() => Promise.resolve(0)),
      stats: vi.fn(() => ({ hits: 0, misses: 0, hitRate: 0, size: store.size })),
      fetch: vi.fn(),
      fetchWithOfflineFallback: vi.fn(),
    } as unknown as CatalogCacheManager,
    store,
  };
}

export function populateCache(
  store: Map<string, unknown>,
  revision: typeof REV_A,
  manifest: ReturnType<typeof makeManifest>,
  sources: ReturnType<typeof makeSources>,
  indexByKind: Record<string, CatalogEntitySummary[]>,
) {
  const expiration = createNoExpiryExpiration();
  const createdAt = '2026-07-22T00:00:00Z';
  const inputHash = manifest.sourceRevision;

  store.set(buildManifestCacheKey(revision), createCacheEnvelope({
    cacheSchemaVersion: 1,
    catalogRevision: revision,
    inputHash,
    createdAt,
    expiration,
    value: manifest,
  }));

  const sourcesRecord: Record<string, typeof sources[number]> = {};
  for (const s of sources) {
    sourcesRecord[s.id] = s;
  }
  store.set(buildSourcesCacheKey(revision), createCacheEnvelope({
    cacheSchemaVersion: 1,
    catalogRevision: revision,
    inputHash,
    createdAt,
    expiration,
    value: sourcesRecord,
  }));

  for (const kind of manifest.entityKinds) {
    const entries = indexByKind[kind] ?? [];
    store.set(buildIndexCacheKey(revision, kind), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: revision,
      inputHash: `${inputHash}:${kind}`,
      createdAt,
      expiration,
      value: entries,
    }));
  }
}

export const mockFetcher = vi.fn<Fetcher>();
