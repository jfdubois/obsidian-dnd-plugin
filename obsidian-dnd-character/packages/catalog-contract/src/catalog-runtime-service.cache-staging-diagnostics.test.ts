import { describe, expect, it, vi } from 'vitest';
import type { ActiveRevisionPersistence } from './active-revision-persistence';
import { CatalogCacheManager } from './cache-manager';
import { buildIndexCacheKey, buildManifestCacheKey, buildSourcesCacheKey } from './cache-keys';
import { InMemoryCatalogCacheStore } from './cache-store';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { createCatalogEntitySummary } from './entity-summary';
import { createSpeciesRule } from './entity-species';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { KIND_INDEX_FILENAME } from './kind-index-mapping';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';

const BASE_URL = 'https://catalog.example.test';
const REV_A = createCatalogRevision('revision-a');
const REV_B = createCatalogRevision('revision-b');
const HUMAN = createEntityId('species:human');
const KINDS = ['species', 'background', 'class', 'feat', 'spell', 'item'] as const;

function manifest(revision: typeof REV_A) {
  return createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION, catalogRevision: revision, sourceRevision: 'source-001',
    builderVersion: '0.1.0', generatedAt: '2026-08-03T00:00:00Z', rulesets: ['2024'],
    entityKinds: [...KINDS], checksums: { 'manifest.json': 'sha256-test' },
  });
}

const sources = [createCatalogSource({
  id: createSourceId('phb'), name: "Player's Handbook", abbreviation: 'PHB', ruleset: '2024', category: 'core',
})];
const indexes = {
  species: [createCatalogEntitySummary({
    id: HUMAN, kind: 'species', name: 'Human', sourceId: createSourceId('phb'), ruleset: '2024',
    access: 'core', legacy: false, tags: [], detailPath: 'entities/species/human.json',
  })],
  background: [], class: [], feat: [], spell: [], item: [],
};
const human = createSpeciesRule(
  HUMAN, 'Human', createSourceId('phb'), '2024', 'core', 'Medium', 30, false, [], [], [], [], [], [], [], false,
);

function ok(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

function fetcherFor(revision: typeof REV_A, entity = false): Fetcher {
  let entityRequested = false;
  return async (url) => {
    const prefix = `${BASE_URL}/revisions/${revision}/`;
    if (url === `${BASE_URL}/current.json`) return ok({ currentRevision: revision });
    if (url === `${prefix}manifest.json`) return ok(manifest(revision));
    if (url === `${prefix}sources.json`) return ok(sources);
    for (const kind of KINDS) {
      if (url === `${prefix}indexes/${KIND_INDEX_FILENAME[kind]}`) return ok(indexes[kind]);
    }
    if (entity && !entityRequested && url === `${prefix}entities/species/human.json`) {
      entityRequested = true;
      return ok(human);
    }
    throw new Error(`unexpected URL: ${url}`);
  };
}

function expectRuntimeError(error: unknown): CatalogRuntimeError {
  expect(error).toBeInstanceOf(CatalogRuntimeError);
  return error as CatalogRuntimeError;
}

describe('CatalogRuntimeService cache-staging diagnostics', () => {
  it('reports a manifest write rejection and leaves initial activation inactive', async () => {
    const store = new InMemoryCatalogCacheStore();
    const cause = new Error('manifest disk rejection');
    vi.spyOn(store, 'set').mockRejectedValue(cause);
    let pointer: unknown = null;
    const persistence: ActiveRevisionPersistence = {
      load: async () => pointer,
      save: async (revision) => { pointer = revision; },
      clear: async () => { pointer = null; },
    };
    const service = new CatalogRuntimeService({
      baseUrl: BASE_URL, fetcher: fetcherFor(REV_B),
      cacheManager: new CatalogCacheManager(store, { kind: 'no-expiry' }), activeRevisionPersistence: persistence,
    });

    let thrown: unknown;
    try { await service.activate(); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.operation).toBe('cache-write');
    expect(error.artifact).toBe('manifest');
    expect(error.artifactKey).toBe(buildManifestCacheKey(REV_B));
    expect(error.candidateRevision).toBe(REV_B);
    expect(error.previousActiveRevision).toBeUndefined();
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('manifest disk rejection');
    expect(error.stage).toBe('cache-staging');
    expect(error.resultingActivationState).toBe('inactive');
    expect(service.activationState).toBe('inactive');
    expect(service.revision).toBeUndefined();
    expect(await persistence.load()).toBeNull();
  });

  it('reports a sources key after staging candidate manifest without activating it', async () => {
    const store = new InMemoryCatalogCacheStore();
    const manager = new CatalogCacheManager(store, { kind: 'no-expiry' });
    const originalSet = store.set.bind(store);
    let failB = false;
    const cause = new Error('sources disk rejection');
    vi.spyOn(store, 'set').mockImplementation(async (key, envelope) => {
      if (failB && key === buildSourcesCacheKey(REV_B)) throw cause;
      return originalSet(key, envelope);
    });
    let current = REV_A;
    const service = new CatalogRuntimeService({ baseUrl: BASE_URL, fetcher: (url) => fetcherFor(current)(url), cacheManager: manager });
    await service.activate();
    failB = true;

    let thrown: unknown;
    current = REV_B;
    try { await service.activate(); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.operation).toBe('cache-write');
    expect(error.artifact).toBe('sources');
    expect(error.artifactKey).toBe(buildSourcesCacheKey(REV_B));
    expect(error.candidateRevision).toBe(REV_B);
    expect(error.previousActiveRevision).toBe(REV_A);
    expect(error.cause).toBe(cause);
    expect(error.resultingActivationState).toBe('active');
    expect(await store.get(buildManifestCacheKey(REV_B))).not.toBeNull();
    expect(service.revision).toBe(REV_A);
    expect(service.manifest?.catalogRevision).toBe(REV_A);
  });

  it('reports the index kind and canonical key for an index write rejection', async () => {
    const store = new InMemoryCatalogCacheStore();
    const cause = new Error('index disk rejection');
    vi.spyOn(store, 'set').mockImplementation(async (key) => {
      if (key === buildIndexCacheKey(REV_B, 'species')) throw cause;
    });
    const service = new CatalogRuntimeService({
      baseUrl: BASE_URL, fetcher: fetcherFor(REV_B), cacheManager: new CatalogCacheManager(store, { kind: 'no-expiry' }),
    });

    let thrown: unknown;
    try { await service.activate(); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.artifact).toBe('index');
    expect(error.artifactKey).toBe(buildIndexCacheKey(REV_B, 'species'));
    expect(error.cause).toBe(cause);
  });

  it('reports the required entity ID and kind for an entity write rejection', async () => {
    const store = new InMemoryCatalogCacheStore();
    const cause = new Error('entity disk rejection');
    vi.spyOn(store, 'set').mockImplementation(async (key) => {
      if (key.endsWith(`/${HUMAN}`)) throw cause;
    });
    const service = new CatalogRuntimeService({
      baseUrl: BASE_URL, fetcher: fetcherFor(REV_B, true), cacheManager: new CatalogCacheManager(store, { kind: 'no-expiry' }),
    });

    let thrown: unknown;
    try { await service.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }] }); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.artifact).toBe('entity');
    expect(error.failedEntityId).toBe(HUMAN);
    expect(error.failedEntityKind).toBe('species');
    expect(error.cause).toBe(cause);
  });
});
