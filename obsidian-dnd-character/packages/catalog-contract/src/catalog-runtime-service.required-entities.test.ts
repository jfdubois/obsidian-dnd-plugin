import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { createCatalogManifest } from './catalog-manifest';
import { createCatalogSource } from './source-metadata';
import { createCatalogEntitySummary } from './entity-summary';
import { createSpeciesRule } from './entity-species';
import { createCatalogRevision, createEntityId, createSourceId, type RuleEntityKind } from '@obsidian-dnd/domain';
import { CATALOG_SCHEMA_VERSION } from './schema-version';

const REV = createCatalogRevision('rev-001');
const HUMAN = createEntityId('species:human');
const ELF = createEntityId('species:elf');
const PHB = createSourceId('phb');

const KINDS: RuleEntityKind[] = ['species', 'background', 'class', 'feat', 'spell', 'item'];

const manifest = () => createCatalogManifest({
  schemaVersion: CATALOG_SCHEMA_VERSION, catalogRevision: REV, sourceRevision: 'abc',
  builderVersion: '0.1.0', generatedAt: '2026-07-22T00:00:00Z', rulesets: ['2024'],
  entityKinds: KINDS, checksums: { 'manifest.json': 'sha' },
});

const sources = () => [createCatalogSource({
  id: PHB, name: "Player's Handbook", abbreviation: 'PHB', ruleset: '2024', category: 'core',
})];

const summary = (id: typeof HUMAN, path: string, name: string) => createCatalogEntitySummary({
  id, kind: 'species', name, sourceId: PHB, ruleset: '2024',
  access: 'core', legacy: false, tags: [], detailPath: path,
});

const entity = (id: typeof HUMAN, name: string, darkvision: boolean) => createSpeciesRule(
  id, name, PHB, '2024', 'core', 'Medium', 30, darkvision, [], [], [], [], [], [], [], false,
);

const mock = vi.fn();
const svc = () => new CatalogRuntimeService({ baseUrl: 'https://cat.test', fetcher: mock });
const ok = (d: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(d) } as Response);

function mockFetch(m: ReturnType<typeof manifest>, s: ReturnType<typeof sources>, idx: ReturnType<typeof summary>[]) {
  mock.mockResolvedValueOnce(ok({ currentRevision: 'rev-001' }));
  mock.mockResolvedValueOnce(ok(m));
  mock.mockResolvedValueOnce(ok(s));
  for (const k of m.entityKinds) mock.mockResolvedValueOnce(ok(k === 'species' ? idx : []));
}

describe('required entity validation', () => {
  beforeEach(() => mock.mockReset());

  it('activates with empty requiredReferences', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    const s = svc();
    await s.activate({ requiredReferences: [] });
    expect(s.activationState).toBe('active');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('activates when requiredReferences omitted', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    const s = svc();
    await s.activate();
    expect(s.activationState).toBe('active');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('activates and retains single required entity', async () => {
    const e = entity(HUMAN, 'Human', false);
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(ok(e));
    const s = svc();
    await s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }] });
    expect(s.activationState).toBe('active');
    expect(s.requiredEntities.size).toBe(1);
    expect(s.requiredEntities.get(HUMAN)).toEqual(e);
  });

  it('activates and retains multiple required entities', async () => {
    const h = entity(HUMAN, 'Human', false);
    const el = entity(ELF, 'Elf', true);
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human'), summary(ELF, 'entities/species/elf.json', 'Elf')]);
    mock.mockResolvedValueOnce(ok(h));
    mock.mockResolvedValueOnce(ok(el));
    const s = svc();
    await s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }, { entityId: ELF, kind: 'species' }] });
    expect(s.activationState).toBe('active');
    expect(s.requiredEntities.size).toBe(2);
    expect(s.requiredEntities.get(HUMAN)).toEqual(h);
    expect(s.requiredEntities.get(ELF)).toEqual(el);
  });

  it('fails when required entity not in index', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    const s = svc();
    await expect(s.activate({ requiredReferences: [{ entityId: ELF, kind: 'species' }] })).rejects.toThrow(CatalogRuntimeError);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('fails when required entity fetch returns 404', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response));
    const s = svc();
    await expect(s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }] })).rejects.toThrow(CatalogRuntimeError);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('fails when required entity fails structural validation', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(ok({ invalid: true }));
    const s = svc();
    await expect(s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }] })).rejects.toThrow(CatalogRuntimeError);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('fails when required entity ID mismatch', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(ok(entity(ELF, 'Elf', true)));
    const s = svc();
    await expect(s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'species' }] })).rejects.toThrow(/ID mismatch/);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('fails when required entity kind mismatch', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(ok(entity(HUMAN, 'Human', false)));
    const s = svc();
    await expect(s.activate({ requiredReferences: [{ entityId: HUMAN, kind: 'background' }] })).rejects.toThrow(CatalogRuntimeError);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('fails when duplicate references have conflicting kinds', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    const s = svc();
    await expect(s.activate({
      requiredReferences: [{ entityId: HUMAN, kind: 'species' }, { entityId: HUMAN, kind: 'background' }],
    })).rejects.toThrow(/conflicting kinds/);
    expect(s.activationState).toBe('inactive');
    expect(s.requiredEntities.size).toBe(0);
  });

  it('deduplicates identical required references', async () => {
    const e = entity(HUMAN, 'Human', false);
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    mock.mockResolvedValueOnce(ok(e));
    const s = svc();
    await s.activate({
      requiredReferences: [{ entityId: HUMAN, kind: 'species' }, { entityId: HUMAN, kind: 'species' }],
    });
    expect(s.activationState).toBe('active');
    expect(s.requiredEntities.size).toBe(1);
  });

  it('preserves previous state on validation failure', async () => {
    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    const s = svc();
    await s.activate();
    expect(s.activationState).toBe('active');

    mockFetch(manifest(), sources(), [summary(HUMAN, 'entities/species/human.json', 'Human')]);
    await expect(s.activate({ requiredReferences: [{ entityId: ELF, kind: 'species' }] })).rejects.toThrow(CatalogRuntimeError);
    expect(s.activationState).toBe('active');
    expect(s.revision).toBe(REV);
    expect(s.requiredEntities.size).toBe(0);
  });
});
