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

const makeSources = () => [
  createCatalogSource({
    id: createSourceId('phb'),
    name: "Player's Handbook",
    abbreviation: 'PHB',
    ruleset: '2024',
    category: 'core',
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

describe('CatalogRuntimeService — error diagnostics', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('preserves previous active revision on activation failure', async () => {
    const previousRevision = createCatalogRevision('rev-active-001');
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    service.revision = previousRevision;

    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.previousActiveRevision).toBe(previousRevision);
      } else {
        throw error;
      }
    }
  });

  it('preserves failed entity ID and kind on source reference failure', async () => {
    const manifest = createCatalogManifest({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      catalogRevision: REVISION,
      sourceRevision: 'abc123',
      builderVersion: '0.1.0',
      generatedAt: '2026-07-22T00:00:00Z',
      rulesets: ['2024'],
      entityKinds: ['species', 'background', 'class', 'feat', 'spell', 'item'],
      checksums: { 'manifest.json': 'sha256-abc' },
    });
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
    for (const kind of manifest.entityKinds) {
      mockFetcher.mockResolvedValueOnce(jsonOk(kind === 'species' ? badIndex : []));
    }

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.failedEntityId).toBe('species:elf');
        expect(error.failedEntityKind).toBe('species');
      } else {
        throw error;
      }
    }
  });

  it('marks activation failure as recoverable', async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.recoverable).toBe(true);
      } else {
        throw error;
      }
    }
  });

  it('preserves endpoint and revision in error', async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.endpoint).toContain('current.json');
        expect(error.status).toBe(404);
        expect(error.revision).toBeUndefined();
      } else {
        throw error;
      }
    }
  });

  it('wraps non-CatalogRuntimeError as recoverable', async () => {
    mockFetcher.mockRejectedValueOnce(new Error('network failure'));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.recoverable).toBe(true);
        expect(error.message).toBe('network failure');
        expect(error.revision).toBeUndefined();
      } else {
        throw error;
      }
    }
  });

  /* ── Revision boundary enforcement ─────────────────────────── */

  it('empty currentRevision is rejected with undefined error revision', async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: '' }));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.revision).toBeUndefined();
        expect(error.endpoint).toContain('current.json');
        expect(error.message).toContain('structural validation');
      } else {
        throw error;
      }
    }
  });

  it('non-string currentRevision is rejected with undefined error revision', async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 123 }));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.revision).toBeUndefined();
        expect(error.endpoint).toContain('current.json');
      } else {
        throw error;
      }
    }
  });

  it('malformed current pointer contains no fabricated revision', async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({}));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.revision).toBeUndefined();
        expect(error.endpoint).toContain('current.json');
      } else {
        throw error;
      }
    }
  });

  it('transport failure before revision discovery contains no fabricated revision', async () => {
    mockFetcher.mockResolvedValueOnce(jsonFail(500));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.revision).toBeUndefined();
        expect(error.endpoint).toContain('current.json');
        expect(error.status).toBe(500);
      } else {
        throw error;
      }
    }
  });

  it('failure after revision discovery retains the valid candidate revision', async () => {
    mockFetcher.mockResolvedValueOnce(jsonOk({ currentRevision: 'rev-test-001' }));
    mockFetcher.mockResolvedValueOnce(jsonFail(404));

    const service = createService();
    try {
      await service.activate();
      expect.fail('expected activation to fail');
    } catch (error) {
      if (error instanceof CatalogRuntimeError) {
        expect(error.revision).toBe(createCatalogRevision('rev-test-001'));
        expect(error.endpoint).toContain('manifest.json');
      } else {
        throw error;
      }
    }
  });
});
