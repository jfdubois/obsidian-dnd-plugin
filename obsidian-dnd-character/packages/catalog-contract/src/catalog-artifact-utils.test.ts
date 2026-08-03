/**
 * Tests for shared catalog artifact utilities:
 * - KIND_INDEX_FILENAME mapping
 * - validateArtifactPath
 * - buildCatalogArtifactUrl
 */

import { describe, it, expect } from 'vitest';
import { createCatalogRevision } from '@obsidian-dnd/domain';
import { KIND_INDEX_FILENAME } from './kind-index-mapping';
import { validateArtifactPath } from './artifact-path-utils';
import { buildCatalogArtifactUrl } from './catalog-artifact-path';

/* ── KIND_INDEX_FILENAME ──────────────────────────────────────── */

describe('KIND_INDEX_FILENAME', () => {
  it('maps species to species.json', () => {
    expect(KIND_INDEX_FILENAME['species']).toBe('species.json');
  });

  it('maps background to backgrounds.json', () => {
    expect(KIND_INDEX_FILENAME['background']).toBe('backgrounds.json');
  });

  it('maps class to classes.json', () => {
    expect(KIND_INDEX_FILENAME['class']).toBe('classes.json');
  });

  it('maps subclass to subclasses.json', () => {
    expect(KIND_INDEX_FILENAME['subclass']).toBe('subclasses.json');
  });

  it('maps class-feature to class-features.json', () => {
    expect(KIND_INDEX_FILENAME['class-feature']).toBe('class-features.json');
  });

  it('maps subclass-feature to subclass-features.json', () => {
    expect(KIND_INDEX_FILENAME['subclass-feature']).toBe('subclass-features.json');
  });

  it('maps feat to feats.json', () => {
    expect(KIND_INDEX_FILENAME['feat']).toBe('feats.json');
  });

  it('maps spell to spells.json', () => {
    expect(KIND_INDEX_FILENAME['spell']).toBe('spells.json');
  });

  it('maps item to items.json', () => {
    expect(KIND_INDEX_FILENAME['item']).toBe('items.json');
  });

  it('maps optional-feature to optional-features.json', () => {
    expect(KIND_INDEX_FILENAME['optional-feature']).toBe('optional-features.json');
  });

  it('maps skill to skills.json', () => {
    expect(KIND_INDEX_FILENAME['skill']).toBe('skills.json');
  });

  it('maps language to languages.json', () => {
    expect(KIND_INDEX_FILENAME['language']).toBe('languages.json');
  });

  it('is frozen and immutable', () => {
    expect(() => {
      (KIND_INDEX_FILENAME as Record<string, string>)['species'] = 'bad.json';
    }).toThrow();
  });
});

/* ── validateArtifactPath ─────────────────────────────────────── */

describe('validateArtifactPath', () => {
  it('accepts valid simple path', () => {
    expect(() => validateArtifactPath('species/human.json')).not.toThrow();
  });

  it('accepts valid nested path', () => {
    expect(() => validateArtifactPath('entities/species/human.json')).not.toThrow();
  });

  it('accepts valid root-level path', () => {
    expect(() => validateArtifactPath('manifest.json')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateArtifactPath('')).toThrow('non-empty');
  });

  it('rejects path with .. segments', () => {
    expect(() => validateArtifactPath('../etc/passwd')).toThrow('..');
  });

  it('rejects path with .. in middle', () => {
    expect(() => validateArtifactPath('species/../../etc/passwd.json')).toThrow('..');
  });

  it('rejects absolute path with leading slash', () => {
    expect(() => validateArtifactPath('/etc/passwd.json')).toThrow('absolute');
  });

  it('rejects absolute path with drive letter', () => {
    expect(() => validateArtifactPath('C:/windows/system32/config.json')).toThrow('absolute');
  });

  it('rejects path with backslashes', () => {
    expect(() => validateArtifactPath('species\\human.json')).toThrow('backslashes');
  });

  it('rejects path with dot segment', () => {
    expect(() => validateArtifactPath('./species/human.json')).toThrow('\'.');
  });

  it('rejects path with dot segment in middle', () => {
    expect(() => validateArtifactPath('species/./human.json')).toThrow('\'.');
  });

  it('rejects path with query string', () => {
    expect(() => validateArtifactPath('species/human.json?foo=bar')).toThrow('query');
  });

  it('rejects path with fragment', () => {
    expect(() => validateArtifactPath('species/human.json#section')).toThrow('fragment');
  });

  it('rejects http scheme', () => {
    expect(() => validateArtifactPath('http://evil.com/data.json')).toThrow('URL schemes');
  });

  it('rejects https scheme', () => {
    expect(() => validateArtifactPath('https://evil.com/data.json')).toThrow('URL schemes');
  });

  it('rejects javascript scheme', () => {
    expect(() => validateArtifactPath('javascript:alert(1).json')).toThrow('URL schemes');
  });

  it('rejects data scheme', () => {
    expect(() => validateArtifactPath('data:text/html,<script>.json')).toThrow('URL schemes');
  });

  it('rejects null bytes', () => {
    expect(() => validateArtifactPath('species/human\0.json')).toThrow('null bytes');
  });

  it('rejects control characters', () => {
    expect(() => validateArtifactPath('species/human\x01.json')).toThrow('control characters');
  });

  it('accepts tab character (0x09)', () => {
    // Tab is allowed as an exception
    expect(() => validateArtifactPath('species/human\t.json')).not.toThrow();
  });

  it('rejects path without .json extension', () => {
    expect(() => validateArtifactPath('species/human.txt')).toThrow('.json');
  });
});

/* ── buildCatalogArtifactUrl ──────────────────────────────────── */

describe('buildCatalogArtifactUrl', () => {
  const baseUrl = 'https://catalog.example.com/catalog/v1';
  const revision = createCatalogRevision('rev-001');

  it('builds URL with revisions segment for revision-scoped artifact', () => {
    const url = buildCatalogArtifactUrl(baseUrl, revision, 'manifest.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/revisions/rev-001/manifest.json');
  });

  it('builds URL without revisions segment for revision-less artifact', () => {
    const url = buildCatalogArtifactUrl(baseUrl, undefined, 'current.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/current.json');
  });

  it('builds URL for nested index artifact', () => {
    const url = buildCatalogArtifactUrl(baseUrl, revision, 'indexes/species.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/revisions/rev-001/indexes/species.json');
  });

  it('builds URL for entity detail artifact', () => {
    const url = buildCatalogArtifactUrl(baseUrl, revision, 'species/human.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/revisions/rev-001/species/human.json');
  });

  it('strips trailing slashes from base URL', () => {
    const url = buildCatalogArtifactUrl(`${baseUrl}///`, revision, 'manifest.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/revisions/rev-001/manifest.json');
  });

  it('uses the revision string value correctly', () => {
    const rev2 = createCatalogRevision('2026-08-01-alpha');
    const url = buildCatalogArtifactUrl(baseUrl, rev2, 'sources.json');
    expect(url).toBe('https://catalog.example.com/catalog/v1/revisions/2026-08-01-alpha/sources.json');
  });
});
