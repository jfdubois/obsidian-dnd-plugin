import type { CatalogRevision } from '@obsidian-dnd/domain';
import type { CatalogManifest } from './catalog-manifest';
import type { CatalogSource } from './source-metadata';
import type { CatalogEntitySummary } from './entity-summary';
import type { CatalogCacheManager } from './cache-manager';
import { isCatalogManifest } from './catalog-manifest';
import { isCatalogSource } from './source-metadata';
import { isCatalogEntitySummary } from './entity-summary';
import { CatalogRuntimeError } from './catalog-runtime-error';

/**
 * Activation state machine for the catalog runtime service.
 */
export type CatalogActivationState = 'inactive' | 'fetching' | 'active';

/**
 * Diagnostics snapshot returned by {@link CatalogRuntimeService.diagnostics}.
 */
export interface CatalogRuntimeDiagnostics {
  baseUrl: string;
  revision: CatalogRevision | undefined;
  activationState: CatalogActivationState;
  manifestPresent: boolean;
  sourceCount: number;
  indexEntryCount: number;
}

/**
 * Minimal fetch-compatible signature for dependency injection and testing.
 */
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Two-phase, transactional catalog revision activation service.
 *
 * Phase 1 — `fetchManifest`: validates manifest, sets internal manifest,
 *           invalidates cache by revision.
 * Phase 2 — `fetchSourcesAndIndex`: fetches sources and index, validates
 *           each entry, populates internal state.
 *
 * Both phases must succeed for `activationState` to become `'active'`.
 * Any failure throws {@link CatalogRuntimeError} and leaves the service
 * in a recoverable state.
 */
export class CatalogRuntimeService {
  public readonly baseUrl: string;
  public revision: CatalogRevision | undefined;
  public manifest: CatalogManifest | undefined;
  public sources: Record<string, CatalogSource> = {};
  public index: Record<string, CatalogEntitySummary[]> = {};
  public activationState: CatalogActivationState = 'inactive';

  private readonly fetcher: Fetcher;
  private readonly cacheManager: CatalogCacheManager | undefined;

  public constructor(options: {
    baseUrl: string;
    fetcher: Fetcher;
    cacheManager?: CatalogCacheManager;
  }) {
    this.baseUrl = options.baseUrl;
    this.fetcher = options.fetcher;
    this.cacheManager = options.cacheManager;
  }

  // ------------------------------------------------------------------
  // Phase 1
  // ------------------------------------------------------------------

  /**
   * Fetches and validates the catalog manifest for the given revision.
   *
   * On success sets `this.manifest` and invalidates the cache by revision.
   * On failure throws {@link CatalogRuntimeError}.
   */
  public async fetchManifest(revision: CatalogRevision): Promise<void> {
    const endpoint = `${this.baseUrl}/catalog/manifest`;
    const response = await this.fetchWithStatus(endpoint);

    if (!response.ok) {
      throw new CatalogRuntimeError({
        endpoint,
        revision,
        message: `Manifest fetch failed with status ${response.status}`,
        status: response.status,
      });
    }

    const raw = await response.json();

    if (!isCatalogManifest(raw)) {
      throw new CatalogRuntimeError({
        endpoint,
        revision,
        message: 'Manifest response failed structural validation',
      });
    }

    this.manifest = raw;
    void this.cacheManager?.invalidateByRevision(revision);
  }

  // ------------------------------------------------------------------
  // Phase 2
  // ------------------------------------------------------------------

  /**
   * Fetches and validates the sources and index for the given revision.
   *
   * Must be called after `fetchManifest`. On success populates
   * `this.sources` and `this.index`. On failure throws
   * {@link CatalogRuntimeError}.
   */
  public async fetchSourcesAndIndex(revision: CatalogRevision): Promise<void> {
    const sourcesEndpoint = `${this.baseUrl}/catalog/sources`;
    const indexEndpoint = `${this.baseUrl}/catalog/index`;

    // Fetch sources
    const sourcesResponse = await this.fetchWithStatus(sourcesEndpoint);
    if (!sourcesResponse.ok) {
      throw new CatalogRuntimeError({
        endpoint: sourcesEndpoint,
        revision,
        message: `Sources fetch failed with status ${sourcesResponse.status}`,
        status: sourcesResponse.status,
      });
    }

    const sourcesRaw = await sourcesResponse.json();
    if (typeof sourcesRaw !== 'object' || sourcesRaw === null) {
      throw new CatalogRuntimeError({
        endpoint: sourcesEndpoint,
        revision,
        message: 'Sources response is not an object',
      });
    }

    const validatedSources: Record<string, CatalogSource> = {};
    for (const [key, value] of Object.entries(sourcesRaw)) {
      if (!isCatalogSource(value)) {
        throw new CatalogRuntimeError({
          endpoint: sourcesEndpoint,
          revision,
          message: `Source entry "${key}" failed structural validation`,
        });
      }
      validatedSources[key] = value;
    }
    this.sources = validatedSources;

    // Fetch index
    const indexResponse = await this.fetchWithStatus(indexEndpoint);
    if (!indexResponse.ok) {
      throw new CatalogRuntimeError({
        endpoint: indexEndpoint,
        revision,
        message: `Index fetch failed with status ${indexResponse.status}`,
        status: indexResponse.status,
      });
    }

    const indexRaw = await indexResponse.json();
    if (typeof indexRaw !== 'object' || indexRaw === null) {
      throw new CatalogRuntimeError({
        endpoint: indexEndpoint,
        revision,
        message: 'Index response is not an object',
      });
    }

    const validatedIndex: Record<string, CatalogEntitySummary[]> = {};
    for (const [key, value] of Object.entries(indexRaw)) {
      if (!Array.isArray(value)) {
        throw new CatalogRuntimeError({
          endpoint: indexEndpoint,
          revision,
          message: `Index entry "${key}" is not an array`,
        });
      }
      for (let i = 0; i < value.length; i++) {
        if (!isCatalogEntitySummary(value[i])) {
          throw new CatalogRuntimeError({
            endpoint: indexEndpoint,
            revision,
            message: `Index entry "${key}[${i}]" failed structural validation`,
          });
        }
      }
      validatedIndex[key] = value;
    }
    this.index = validatedIndex;
  }

  // ------------------------------------------------------------------
  // Activation
  // ------------------------------------------------------------------

  /**
   * Runs both activation phases sequentially.
   *
   * Sets `activationState` to `'fetching'` before phase 1.
   * On success of both phases sets `activationState` to `'active'`.
   * On failure of either phase the service remains recoverable
   * (`activationState` is set to `'inactive'`).
   */
  public async activate(revision: CatalogRevision): Promise<void> {
    this.revision = revision;
    this.activationState = 'fetching';

    try {
      await this.fetchManifest(revision);
      await this.fetchSourcesAndIndex(revision);
      this.activationState = 'active';
    } catch (error) {
      this.activationState = 'inactive';
      if (error instanceof CatalogRuntimeError) {
        throw error;
      }
      throw new CatalogRuntimeError({
        endpoint: 'unknown',
        revision,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------

  /**
   * Clears all internal state and returns to `'inactive'`.
   */
  public reset(): void {
    this.revision = undefined;
    this.manifest = undefined;
    this.sources = {};
    this.index = {};
    this.activationState = 'inactive';
  }

  // ------------------------------------------------------------------
  // Diagnostics
  // ------------------------------------------------------------------

  /**
   * Returns an immutable snapshot of current service state.
   */
  public diagnostics(): CatalogRuntimeDiagnostics {
    return {
      baseUrl: this.baseUrl,
      revision: this.revision,
      activationState: this.activationState,
      manifestPresent: this.manifest !== undefined,
      sourceCount: Object.keys(this.sources).length,
      indexEntryCount: Object.keys(this.index).length,
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async fetchWithStatus(endpoint: string): Promise<Response> {
    const response = await this.fetcher(endpoint);
    return response;
  }
}
