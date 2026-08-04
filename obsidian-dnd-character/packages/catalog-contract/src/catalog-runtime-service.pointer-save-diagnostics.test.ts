import { describe, expect, it } from 'vitest';
import type { ActiveRevisionPersistence } from './active-revision-persistence';
import { CatalogCacheManager } from './cache-manager';
import { buildManifestCacheKey } from './cache-keys';
import { InMemoryCatalogCacheStore } from './cache-store';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { createCatalogEntitySummary } from './entity-summary';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { KIND_INDEX_FILENAME } from './kind-index-mapping';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';

const BASE_URL = 'https://catalog.example.test';
const REV_A = createCatalogRevision('revision-a');
const REV_B = createCatalogRevision('revision-b');
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
    id: createEntityId('species:human'), kind: 'species', name: 'Human', sourceId: createSourceId('phb'),
    ruleset: '2024', access: 'core', legacy: false, tags: [], detailPath: 'entities/species/human.json',
  })],
  background: [], class: [], feat: [], spell: [], item: [],
};

function ok(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

function fetcherFor(revision: typeof REV_A): Fetcher {
  return async (url) => {
    const prefix = `${BASE_URL}/revisions/${revision}/`;
    if (url === `${BASE_URL}/current.json`) return ok({ currentRevision: revision });
    if (url === `${prefix}manifest.json`) return ok(manifest(revision));
    if (url === `${prefix}sources.json`) return ok(sources);
    for (const kind of KINDS) {
      if (url === `${prefix}indexes/${KIND_INDEX_FILENAME[kind]}`) return ok(indexes[kind]);
    }
    throw new Error(`unexpected URL: ${url}`);
  };
}

function expectRuntimeError(error: unknown): CatalogRuntimeError {
  expect(error).toBeInstanceOf(CatalogRuntimeError);
  return error as CatalogRuntimeError;
}

describe('CatalogRuntimeService pointer-save diagnostics', () => {
  it('keeps initial activation inactive when a staged candidate pointer save rejects', async () => {
    const store = new InMemoryCatalogCacheStore();
    const cause = new Error('initial pointer rejection');
    let saved: unknown = null;
    const persistence: ActiveRevisionPersistence = {
      load: async () => saved,
      save: async (revision) => {
        expect(await store.get(buildManifestCacheKey(revision))).not.toBeNull();
        throw cause;
      },
      clear: async () => { saved = null; },
    };
    const service = new CatalogRuntimeService({
      baseUrl: BASE_URL, fetcher: fetcherFor(REV_B),
      cacheManager: new CatalogCacheManager(store, { kind: 'no-expiry' }), activeRevisionPersistence: persistence,
    });

    let thrown: unknown;
    try { await service.activate(); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.operation).toBe('active-revision-save');
    expect(error.artifact).toBe('active-pointer');
    expect(error.artifactKey).toBe('active-revision');
    expect(error.candidateRevision).toBe(REV_B);
    expect(error.previousActiveRevision).toBeUndefined();
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('initial pointer rejection');
    expect(error.stage).toBe('active-revision-save');
    expect(error.resultingActivationState).toBe('inactive');
    expect(await store.get(buildManifestCacheKey(REV_B))).not.toBeNull();
    expect(await persistence.load()).toBeNull();
    expect(service.activationState).toBe('inactive');
    expect(service.revision).toBeUndefined();
  });

  it('preserves A memory and pointer when B pointer save rejects after B staging', async () => {
    const store = new InMemoryCatalogCacheStore();
    let saved: typeof REV_A | null = null;
    let current = REV_A;
    const cause = new Error('replacement pointer rejection');
    const persistence: ActiveRevisionPersistence = {
      load: async () => saved,
      save: async (revision) => {
        expect(await store.get(buildManifestCacheKey(revision))).not.toBeNull();
        if (revision === REV_B) throw cause;
        saved = revision;
      },
      clear: async () => { saved = null; },
    };
    const service = new CatalogRuntimeService({
      baseUrl: BASE_URL, fetcher: (url) => fetcherFor(current)(url),
      cacheManager: new CatalogCacheManager(store, { kind: 'no-expiry' }), activeRevisionPersistence: persistence,
    });
    await service.activate();
    current = REV_B;

    let thrown: unknown;
    try { await service.activate(); } catch (error) { thrown = error; }

    const error = expectRuntimeError(thrown);
    expect(error.operation).toBe('active-revision-save');
    expect(error.candidateRevision).toBe(REV_B);
    expect(error.previousActiveRevision).toBe(REV_A);
    expect(error.cause).toBe(cause);
    expect(error.resultingActivationState).toBe('active');
    expect(await store.get(buildManifestCacheKey(REV_B))).not.toBeNull();
    expect(await persistence.load()).toBe(REV_A);
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
    expect(service.manifest?.catalogRevision).toBe(REV_A);
  });

  it('preserves non-Error pointer rejections and keeps successful pointer behavior', async () => {
    const rejected = 'pointer rejected as text';
    const failingPersistence: ActiveRevisionPersistence = {
      load: async () => null,
      save: async () => { throw rejected; },
      clear: async () => undefined,
    };
    const failed = new CatalogRuntimeService({ baseUrl: BASE_URL, fetcher: fetcherFor(REV_B), activeRevisionPersistence: failingPersistence });
    let thrown: unknown;
    try { await failed.activate(); } catch (error) { thrown = error; }
    const error = expectRuntimeError(thrown);
    expect(error.cause).toBe(rejected);
    expect(error.message).toContain(rejected);

    let saved: unknown = null;
    const succeedingPersistence: ActiveRevisionPersistence = {
      load: async () => saved,
      save: async (revision) => { saved = revision; },
      clear: async () => { saved = null; },
    };
    const succeeded = new CatalogRuntimeService({ baseUrl: BASE_URL, fetcher: fetcherFor(REV_B), activeRevisionPersistence: succeedingPersistence });
    await succeeded.activate();
    expect(await succeedingPersistence.load()).toBe(REV_B);
    expect(succeeded.activationState).toBe('active');
    expect(succeeded.revision).toBe(REV_B);
  });
});
