import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogRuntimeService } from './catalog-runtime-service';
import type { CatalogCacheManager } from './cache-manager';

const mockFetcher = vi.fn();

function createService(cacheManager?: CatalogCacheManager) {
  return new CatalogRuntimeService({
    baseUrl: 'https://catalog.example.com',
    fetcher: mockFetcher,
    cacheManager,
  });
}

describe('CatalogRuntimeService — constructor / defaults', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
  });

  it('initializes with correct defaults', () => {
    const service = createService();

    expect(service.baseUrl).toBe('https://catalog.example.com');
    expect(service.revision).toBeUndefined();
    expect(service.manifest).toBeUndefined();
    expect(service.sources).toEqual({});
    expect(service.index).toEqual({});
    expect(service.activationState).toBe('inactive');
  });

  it('accepts optional cache manager without error', () => {
    const cacheManager = { invalidateByRevision: vi.fn() } as unknown as CatalogCacheManager;
    const service = createService(cacheManager);

    expect(service).toBeDefined();
    expect(service.activationState).toBe('inactive');
  });

  it('stores the provided base URL', () => {
    const service = new CatalogRuntimeService({
      baseUrl: 'https://other.example.com/catalog',
      fetcher: mockFetcher,
    });

    expect(service.baseUrl).toBe('https://other.example.com/catalog');
  });
});
