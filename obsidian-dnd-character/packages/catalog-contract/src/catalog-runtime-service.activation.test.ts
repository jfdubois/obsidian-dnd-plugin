import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import {
  createCatalogRevision,
  createEntityId,
  createSourceId,
} from '@obsidian-dnd/domain';

const REVISION = createCatalogRevision('rev-test-001');

const makeManifest = () =>
  createCatalogManifest({
    schemaVersion: 1,
    catalogRevision: REVISION,
    sourceRevision: 'abc123',
    builderVersion: '0.1.0',
    generatedAt: '2026-07-22T00:00:00Z',
    rulesets: ['2024'],
    entityKinds: ['species'],
    checksums: { 'manifest.json': 'sha256-abc' },
  });

const makeSources = () => [
  createCatalogSource({
    id: createSourceId('phb'),
    name: "Player's Handbook",
    abbreviation: 'PHB',
    ruleset: '2024',
    category: 'core',
  }),
];

const makeIndex = () => [
  createCatalogEntitySummary({
    id: createEntityId('species:human'),
    kind: 'species',
    name: 'Human',
    sourceId: createSourceId('phb'),
    ruleset: '2024',
    access: 'core',
    legacy: false,
    tags: ['humanoid'],
    detailPath: 'entities/species/human.json',
  }),
];

const mockFetcher = vi.fn();

function createService() {
  return new CatalogRuntimeService({
    baseUrl: 'https://catalog.example.com',
    fetcher: mockFetcher,
  });
}

const jsonOk = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);

const jsonFail = (status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'fail' }),
  } as Response);

describe('CatalogRuntimeService — activation', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('discovers revision from current.json and activates successfully', async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await service.activate();

    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(createCatalogRevision('rev-test-001'));
    expect(service.manifest).toEqual(manifest);
    expect(Object.keys(service.sources)).toHaveLength(1);
    expect(service.index['species']).toEqual(index);
  });

  it('sets state to fetching before any fetch occurs', async () => {
    mockFetcher.mockImplementation(() => {
      return Promise.resolve().then(() => {
        throw new Error('network');
      });
    });

    const service = new CatalogRuntimeService({
      baseUrl: 'https://catalog.example.com',
      fetcher: mockFetcher,
    });

    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    expect(service.activationState).toBe('inactive');
  });

  it('preserves inactive state when current.json returns 404', async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  it('preserves inactive state when manifest fetch fails', async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
  });

  it('preserves inactive state when sources fetch fails', async () => {
    const manifest = makeManifest();
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
  });

  it('preserves inactive state when index fetch fails', async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonFail(502));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });

  it('preserves inactive state on manifest revision mismatch', async () => {
    const wrongManifest = createCatalogManifest({
      schemaVersion: 1,
      catalogRevision: createCatalogRevision('rev-wrong-001'),
      sourceRevision: 'abc123',
      builderVersion: '0.1.0',
      generatedAt: '2026-07-22T00:00:00Z',
      rulesets: ['2024'],
      entityKinds: ['species'],
      checksums: { 'manifest.json': 'sha256-abc' },
    });
    const sources = makeSources();
    const index = makeIndex();
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(wrongManifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(index));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
  });

  it('preserves inactive state when index references unknown source', async () => {
    const manifest = makeManifest();
    const sources = makeSources();
    const badIndex = [
      createCatalogEntitySummary({
        id: createEntityId('species:elf'),
        kind: 'species',
        name: 'Elf',
        sourceId: createSourceId('unknown-source'),
        ruleset: '2024',
        access: 'core',
        legacy: false,
        tags: [],
        detailPath: 'entities/species/elf.json',
      }),
    ];
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    mockFetcher.mockResolvedValueOnce(jsonOk(badIndex));

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);

    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
  });
});
