import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import { CatalogRuntimeError } from './catalog-runtime-error';
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

const REV_A = createCatalogRevision('rev-a');
const REV_B = createCatalogRevision('rev-b');

const makeManifest = (rev: typeof REV_A) =>
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

const makeSources = () => [
  createCatalogSource({
    id: createSourceId('phb'),
    name: "Player's Handbook",
    abbreviation: 'PHB',
    ruleset: '2024',
    category: 'core',
  }),
];

const sp = (id: string, overrides?: Partial<CatalogEntitySummary>) =>
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

const bg = (id: string) =>
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

const mockFetcher = vi.fn();
const createService = () => new CatalogRuntimeService({ baseUrl: 'https://catalog.example.com', fetcher: mockFetcher });
const jsonOk = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) } as Response);

function mockFetch(manifest: ReturnType<typeof makeManifest>, sources: ReturnType<typeof makeSources>, indexByKind: Record<string, CatalogEntitySummary[]>) {
  mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: manifest.catalogRevision }));
  mockFetcher.mockResolvedValueOnce(jsonOk(manifest));
  mockFetcher.mockResolvedValueOnce(jsonOk(sources));
  for (const kind of manifest.entityKinds) {
    mockFetcher.mockResolvedValueOnce(jsonOk(indexByKind[kind] ?? []));
  }
}

describe('CatalogRuntimeService — index invariants', () => {
  beforeEach(() => { mockFetcher.mockReset(); });

  it('valid candidate indexes proceed', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('human')], background: [bg('acolyte')] });
    const service = createService();
    await service.activate();
    expect(service.activationState).toBe('active');
    expect(service.revision).toBe(REV_A);
  });

  it('wrong-kind summary fails with failedEntityKind', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('elf', { kind: 'background' })], background: [bg('acolyte')] });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(/has kind "background" but is in index "species"/);
    expect(service.activationState).toBe('inactive');
  });

  it('unsafe detail path fails during preparation', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('goblin', { detailPath: '../entities/goblin.json' })], background: [bg('acolyte')] });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(/invalid detailPath.*\.\./);
    expect(service.activationState).toBe('inactive');
  });

  it('unknown source ID fails with failedEntityId', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('orc', { sourceId: createSourceId('unknown') })], background: [bg('acolyte')] });
    const service = createService();
    try {
      await service.activate();
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CatalogRuntimeError);
      expect((e as CatalogRuntimeError).failedEntityId).toBe('orc');
    }
    expect(service.activationState).toBe('inactive');
  });

  it('duplicate ID within one index fails', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('human'), sp('human')], background: [bg('acolyte')] });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(/Duplicate entity ID.*human.*within index.*species/);
    expect(service.activationState).toBe('inactive');
  });

  it('duplicate ID across indexes fails', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('shared')], background: [bg('shared')] });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(/exists in both index/);
    expect(service.activationState).toBe('inactive');
  });

  it('ambiguous duplicate detail path fails', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), {
      species: [sp('dup1', { detailPath: 'entities/shared.json' }), sp('dup2', { detailPath: 'entities/shared.json' })],
      background: [bg('acolyte')],
    });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(/assigned to both entity/);
    expect(service.activationState).toBe('inactive');
  });

  describe('replacement activation preserves previous revision on failure', () => {
    it('survives wrong-kind failure', async () => {
      mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('human')], background: [bg('acolyte')] });
      mockFetch(makeManifest(REV_B), makeSources(), { species: [sp('elf', { kind: 'background' })], background: [bg('acolyte')] });
      const service = createService();
      await service.activate();
      expect(service.revision).toBe(REV_A);
      await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
      expect(service.revision).toBe(REV_A);
      expect(service.activationState).toBe('active');
    });

    it('survives duplicate-ID failure', async () => {
      mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('human')], background: [bg('acolyte')] });
      mockFetch(makeManifest(REV_B), makeSources(), { species: [sp('dup'), sp('dup')], background: [bg('acolyte')] });
      const service = createService();
      await service.activate();
      await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
      expect(service.revision).toBe(REV_A);
      expect(service.activationState).toBe('active');
    });

    it('survives detail-path failure', async () => {
      mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('human')], background: [bg('acolyte')] });
      mockFetch(makeManifest(REV_B), makeSources(), { species: [sp('goblin', { detailPath: '../entities/goblin.json' })], background: [bg('acolyte')] });
      const service = createService();
      await service.activate();
      await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
      expect(service.revision).toBe(REV_A);
      expect(service.activationState).toBe('active');
    });
  });

  it('first failed activation remains inactive with no data leaked', async () => {
    mockFetch(makeManifest(REV_A), makeSources(), { species: [sp('elf', { kind: 'background' })], background: [bg('acolyte')] });
    const service = createService();
    await expect(service.activate()).rejects.toThrow(CatalogRuntimeError);
    expect(service.activationState).toBe('inactive');
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
  });
});
