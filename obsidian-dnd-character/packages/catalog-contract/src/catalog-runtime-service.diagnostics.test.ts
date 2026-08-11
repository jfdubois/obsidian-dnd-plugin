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
import { CATALOG_SCHEMA_VERSION } from './schema-version';

const REVISION = createCatalogRevision('rev-test-001');

const _makeManifest = () =>
  createCatalogManifest({
    schemaVersion: 2,
    catalogRevision: REVISION,
    sourceRevision: 'abc123',
    builderVersion: '0.1.0',
    generatedAt: '2026-07-22T00:00:00Z',
    rulesets: ['2024'],
    entityKinds: ['species'],
    checksums: { 'manifest.json': 'sha256-abc' },
  });

const makeFullManifest = () =>
  createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: REVISION,
    sourceRevision: 'abc123',
    builderVersion: '0.1.0',
    generatedAt: '2026-07-22T00:00:00Z',
    rulesets: ['2024'],
    entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
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

describe('CatalogRuntimeService — diagnostics and lifecycle', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('returns correct diagnostics before activation', () => {
    const service = createService();
    const diag = service.diagnostics();

    expect(diag.baseUrl).toBe('https://catalog.example.com');
    expect(diag.revision).toBeUndefined();
    expect(diag.activationState).toBe('inactive');
    expect(diag.manifestPresent).toBe(false);
    expect(diag.sourceCount).toBe(0);
    expect(diag.indexEntryCount).toBe(0);
  });

  it('returns correct diagnostics after successful activation', async () => {
    const manifest = makeFullManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    for (const kind of manifest.entityKinds) {
      mockFetcher.mockResolvedValueOnce(jsonOk(kind === 'species' ? index : []));
    }

    const service = createService();
    await service.activate();

    const diag = service.diagnostics();
    expect(diag.baseUrl).toBe('https://catalog.example.com');
    expect(diag.revision).toBe(createCatalogRevision('rev-test-001'));
    expect(diag.activationState).toBe('active');
    expect(diag.manifestPresent).toBe(true);
    expect(diag.sourceCount).toBe(1);
    expect(diag.indexEntryCount).toBe(6);
  });

  it('reset clears all state and returns to inactive', async () => {
    const manifest = makeFullManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    for (const kind of manifest.entityKinds) {
      mockFetcher.mockResolvedValueOnce(jsonOk(kind === 'species' ? index : []));
    }

    const service = createService();
    await service.activate();
    expect(service.activationState).toBe('active');

    service.reset();

    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
    expect(service.activationState).toBe('inactive');
  });

  it('allows re-activation after failure', async () => {
    const manifest = makeFullManifest();
    const sources = makeSources();
    const index = makeIndex();

    mockFetcher.mockResolvedValueOnce(jsonFail(404));
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
    mockFetcher.mockResolvedValueOnce(jsonOk(sources));
    for (const kind of manifest.entityKinds) {
      mockFetcher.mockResolvedValueOnce(jsonOk(kind === 'species' ? index : []));
    }

    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    expect(service.activationState).toBe('inactive');

    await service.activate();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(createCatalogRevision('rev-test-001'));
  });
});
