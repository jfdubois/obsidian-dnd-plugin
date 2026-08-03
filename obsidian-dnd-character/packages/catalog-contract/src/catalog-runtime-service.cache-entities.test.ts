import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService, type Fetcher } from './catalog-runtime-service';
import { CatalogCacheManager } from './cache-manager';
import { InMemoryCatalogCacheStore } from './cache-store';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createSpeciesRule } from './entity-species';
import { createCatalogRevision, createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';
import { buildEntityCacheKey, parseCacheKey } from './cache-keys';

const REV_A = createCatalogRevision('rev-a');
const HUMAN = createEntityId('species:human');
const PHB = createSourceId('phb');

const makeManifest = () => createCatalogManifest({
  schemaVersion: CATALOG_SCHEMA_VERSION, catalogRevision: REV_A, sourceRevision: 'src-abc',
  builderVersion: '0.1.0', generatedAt: '2026-07-22T00:00:00Z', rulesets: ['2024'],
  entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
  checksums: { 'manifest.json': 'sha256-abc' },
});

const makeSources = () => [createCatalogSource({
  id: PHB, name: "Player's Handbook", abbreviation: 'PHB',
  ruleset: '2024', category: 'core',
})];

const makeSpeciesIndex = () => [createCatalogEntitySummary({
  id: HUMAN, kind: 'species', name: 'Human',
  sourceId: PHB, ruleset: '2024', access: 'core',
  legacy: false, tags: ['humanoid'], detailPath: 'entities/species/human.json',
})];

const makeBgIndex = () => [createCatalogEntitySummary({
  id: createEntityId('background:acolyte'), kind: 'background', name: 'Acolyte',
  sourceId: PHB, ruleset: '2024', access: 'core',
  legacy: false, tags: [], detailPath: 'entities/backgrounds/acolyte.json',
})];

const jsonOk = (data: unknown) => Promise.resolve({
  ok: true, status: 200, json: () => Promise.resolve(data),
} as Response);

function createCacheManager() {
  const store = new InMemoryCatalogCacheStore();
  return { manager: new CatalogCacheManager(store, { kind: 'no-expiry' } as const), store };
}

function mockFetch(mock: ReturnType<typeof vi.fn>, m: ReturnType<typeof makeManifest>,
  s: ReturnType<typeof makeSources>, idx: Record<string, ReturnType<typeof makeSpeciesIndex>>) {
  mock.mockResolvedValueOnce(jsonOk({ currentRevision: m.catalogRevision }));
  mock.mockResolvedValueOnce(jsonOk(m));
  mock.mockResolvedValueOnce(jsonOk(s));
  for (const k of m.entityKinds) mock.mockResolvedValueOnce(jsonOk(idx[k] ?? []));
}

const ALL_KINDS = { species: makeSpeciesIndex(), background: makeBgIndex(), class: [], feat: [], spell: [], item: [] };

describe('CatalogRuntimeService — entity cache keys', () => {
  let mock: ReturnType<typeof vi.fn>;

  beforeEach(() => { mock = vi.fn(); });
  const getFetcher = (): Fetcher => mock as unknown as Fetcher;

  it('uses canonical entity ID (not detail path) in cache key', () => {
    const key = buildEntityCacheKey(REV_A, 'species:human');
    expect(key).toBe('entity/rev-a/species:human');
    expect(key).not.toContain('entities/species/human.json');
  });

  it('parseCacheKey returns complete entity ID without truncation', () => {
    const key = buildEntityCacheKey(REV_A, 'species:human');
    const parsed = parseCacheKey(key);
    expect(parsed).not.toBeNull();
    expect(parsed!.namespace).toBe('entity');
    expect(parsed!.revision).toBe('rev-a');
    expect(parsed!.entityId).toBe('species:human');
  });

  it('parseCacheKey handles entity IDs with slashes', () => {
    const key = buildEntityCacheKey(REV_A, 'feat:2024:phb:action-survivor');
    const parsed = parseCacheKey(key);
    expect(parsed).not.toBeNull();
    expect(parsed!.entityId).toBe('feat:2024:phb:action-survivor');
  });

  it('stages required entity using canonical entity ID as cache key', async () => {
    const { manager, store } = createCacheManager();
    const entityDetail = createSpeciesRule(HUMAN, 'Human', PHB, '2024', 'core', 'Medium', 30, false, [], [], [], [], [], [], [], false);

    mockFetch(mock, makeManifest(), makeSources(), ALL_KINDS);
    mock.mockResolvedValueOnce(jsonOk(entityDetail));

    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager,
    });

    await service.activate({
      requiredReferences: [{ entityId: HUMAN, kind: 'species' }],
    });

    expect(service.activationState).toBe('active');

    // Entity must be cached under canonical entity ID, not detail path
    const entityKey = buildEntityCacheKey(REV_A, String(HUMAN));
    const entityEnvelope = await store.get(entityKey);
    expect(entityEnvelope).not.toBeNull();
    expect(entityEnvelope!.value).toEqual(entityDetail);
  });

  it('entity cache key is parseable and round-trips correctly', async () => {
    const { manager, store } = createCacheManager();
    const entityDetail = createSpeciesRule(HUMAN, 'Human', PHB, '2024', 'core', 'Medium', 30, false, [], [], [], [], [], [], [], false);

    mockFetch(mock, makeManifest(), makeSources(), ALL_KINDS);
    mock.mockResolvedValueOnce(jsonOk(entityDetail));

    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager,
    });

    await service.activate({
      requiredReferences: [{ entityId: HUMAN, kind: 'species' }],
    });

    // Parse the key and verify round-trip
    const entityKey = buildEntityCacheKey(REV_A, String(HUMAN));
    const parsed = parseCacheKey(entityKey);
    expect(parsed).not.toBeNull();
    expect(parsed!.entityId).toBe(String(HUMAN));

    // Rebuild from parsed components
    const rebuiltKey = buildEntityCacheKey(REV_A, parsed!.entityId!);
    expect(rebuiltKey).toBe(entityKey);

    // Verify the same key retrieves the cached entity
    const entityEnvelope = await store.get(rebuiltKey);
    expect(entityEnvelope).not.toBeNull();
    expect(entityEnvelope!.value).toEqual(entityDetail);
  });

  it('does not stage entity when no required references provided', async () => {
    const { manager, store } = createCacheManager();

    mockFetch(mock, makeManifest(), makeSources(), ALL_KINDS);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://cat.test', fetcher: getFetcher(), cacheManager: manager,
    });

    await service.activate();
    expect(service.activationState).toBe('active');

    // No entity should be cached
    const entityKey = buildEntityCacheKey(REV_A, String(HUMAN));
    const entityEnvelope = await store.get(entityKey);
    expect(entityEnvelope).toBeNull();
  });
});
