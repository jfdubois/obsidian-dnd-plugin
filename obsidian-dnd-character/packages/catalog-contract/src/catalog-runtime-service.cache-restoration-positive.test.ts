import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
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
  populateCache,
  mockFetcher,
} from './catalog-runtime-service.cache-restoration-helpers';
import { createCacheEnvelope, createNoExpiryExpiration } from './cache-envelope';
import { buildEntityCacheKey } from './cache-keys';
import { createSpeciesRule } from './entity-species';
import { createEntityId, createSourceId } from '@obsidian-dnd/domain';
import { isCatalogItemSummary } from './entity-summary';

describe('CatalogRuntimeService — restoreFromCache (positive)', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('restores active catalog from cache when all artifacts present', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const indexByKind = {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    };
    populateCache(store, REV_A, manifest, sources, indexByKind);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(true);
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
    expect(service.manifest).toBe(manifest);
    expect(service.sources).toHaveProperty('phb');
    expect(service.index).toHaveProperty('species');
    expect(service.index.species).toHaveLength(1);
    expect(service.index['species']).toBeDefined();
    const firstSpecies = service.index['species']?.[0];
    expect(firstSpecies).toBeDefined();
    expect(firstSpecies?.id).toBe('human');
    const restoredItem = service.index['item']?.[0];
    expect(isCatalogItemSummary(restoredItem)).toBe(true);
    expect(isCatalogItemSummary(restoredItem) && restoredItem.equipmentGroups).toEqual(['simple-weapon']);
  });

  it('makes zero network calls during restoration', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const indexByKind = {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    };
    populateCache(store, REV_A, manifest, sources, indexByKind);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    await service.restoreFromCache();
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('preserves unrelated cache on failure', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm } = createMockCacheManager();
    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    await service.restoreFromCache();
    expect(cm.clear).not.toHaveBeenCalled();
    expect(cm.invalidateByRevision).not.toHaveBeenCalled();
  });

  it('previously staged entity remains readable after reconstruction', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const indexByKind = {
      species: [sp('human'), sp('elf')],
      background: [bg('acolyte'), bg('soldier')],
      class: [cls('barbarian'), cls('wizard')],
      feat: [feat('tough'), feat('observant')],
      spell: [spell('fireball'), spell('shield')],
      item: [item('dagger', ['simple-weapon']), item('longsword', ['martial-weapon'])],
    };
    populateCache(store, REV_A, manifest, sources, indexByKind);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(true);

    // Verify staged entities are accessible in the restored index
    const species = service.index['species'];
    expect(species).toBeDefined();
    expect(species).toHaveLength(2);
    expect(species?.[0]?.id).toBe('human');
    expect(species?.[0]?.kind).toBe('species');
    expect(species?.[0]?.detailPath).toBe('entities/species/human.json');
    expect(species?.[1]?.id).toBe('elf');

    const classes = service.index['class'];
    expect(classes).toBeDefined();
    expect(classes).toHaveLength(2);
    expect(classes?.[0]?.id).toBe('barbarian');
    expect(classes?.[0]?.kind).toBe('class');
  });

  it('reconstructed service exposes the restored active revision', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const indexByKind = {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    };
    populateCache(store, REV_A, manifest, sources, indexByKind);

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(true);

    // Verify all public properties reflect the restored state
    expect(service.revision).toBe(REV_A);
    expect(service.manifest).toBe(manifest);
    expect(service.manifest?.catalogRevision).toBe(REV_A);
    expect(service.sources).toHaveProperty('phb');
    expect(service.sources['phb']?.abbreviation).toBe('PHB');
    expect(service.index).toHaveProperty('species');
    expect(service.index).toHaveProperty('background');
    expect(service.index).toHaveProperty('class');
    expect(service.index).toHaveProperty('feat');
    expect(service.index).toHaveProperty('spell');
    expect(service.index).toHaveProperty('item');
    expect(service.activationState).toBe('active');
  });

  it('returns cached entity detail from valid envelope after restoration', async () => {
    const persistence = createMockPersistence('rev-a');
    const { cm, store } = createMockCacheManager();
    const manifest = makeManifest(REV_A);
    const sources = makeSources();
    const indexByKind = {
      species: [sp('human')],
      background: [bg('acolyte')],
      class: [cls('barbarian')],
      feat: [feat('tough')],
      spell: [spell('fireball')],
      item: [item('dagger', ['simple-weapon'])],
    };
    populateCache(store, REV_A, manifest, sources, indexByKind);

    // Cache an entity detail envelope with valid metadata
    const humanId = createEntityId('species:human');
    const entityDetail = createSpeciesRule(
      humanId, 'Human', createSourceId('phb'), '2024', 'core',
      'Medium', 30, false, [], [], [], [], [], [], [], false,
    );
    store.set(buildEntityCacheKey(REV_A, 'species:human'), createCacheEnvelope({
      cacheSchemaVersion: 1,
      catalogRevision: REV_A,
      inputHash: manifest.sourceRevision,
      createdAt: '2026-07-22T00:00:00Z',
      expiration: createNoExpiryExpiration(),
      value: entityDetail,
    }));

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
      cacheManager: cm,
      activeRevisionPersistence: persistence,
    });

    const result = await service.restoreFromCache();
    expect(result.success).toBe(true);
    expect(service.activationState).toBe('active');

    // Retrieve entity detail from cache via cache manager
    const entityEnvelope = await cm.getCached(buildEntityCacheKey(REV_A, 'species:human'));
    expect(entityEnvelope).not.toBeNull();
    expect(entityEnvelope!.cacheSchemaVersion).toBe(1);
    expect(entityEnvelope!.catalogRevision).toBe(REV_A);
    expect(entityEnvelope!.value).toEqual(entityDetail);
    // Verify no network call was made
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
