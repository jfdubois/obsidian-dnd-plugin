import type { CatalogRevision } from '@obsidian-dnd/domain';
import { createCatalogRevision } from '@obsidian-dnd/domain';
import type { CatalogManifest } from './catalog-manifest';
import type { CatalogSource } from './source-metadata';
import type { CatalogEntitySummary } from './entity-summary';
import type { EntityDetailResponse } from './entity-detail';
import type { CatalogCacheManager } from './cache-manager';
import { isCatalogManifest } from './catalog-manifest';
import { isCatalogSource } from './source-metadata';
import { isCatalogEntitySummary } from './entity-summary';
import { isEntityDetailResponse } from './entity-detail';
import { isCurrentRevision } from './current-revision';
import { CatalogRuntimeError } from './catalog-runtime-error';
import { KIND_INDEX_FILENAME } from './kind-index-mapping';
import { validateArtifactPath } from './artifact-path-utils';
import { buildCatalogArtifactUrl } from './catalog-artifact-path';
import {
  validateSchemaVersion,
  validateRequiredEntityKinds,
} from './compatibility-validation';

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
 * Internal candidate state for two-stage activation.
 */
type CandidateState = {
  revision: CatalogRevision;
  manifest: CatalogManifest;
  sources: Record<string, CatalogSource>;
  index: Record<string, CatalogEntitySummary[]>;
};

/**
 * Two-phase, transactional catalog revision activation service.
 *
 * Uses static artifact paths: `{baseUrl}/revisions/{revision}/{artifact}`
 *
 * Phase 1 — prepare: fetches current.json, manifest, sources, and
 *           per-kind indexes into a candidate without mutating active state.
 * Phase 2 — commit: atomically swaps candidate into active state.
 *
 * On failure: retains former active snapshot/state; discards only
 * incomplete candidate staging.
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
  // Activation (two-phase: prepare → commit)
  // ------------------------------------------------------------------

  /**
   * Activates the catalog by discovering the current revision from
   * `current.json`, then preparing and committing a candidate.
   *
   * On success sets `activationState` to `'active'`.
   * On failure preserves former active state and throws
   * {@link CatalogRuntimeError} with recoverability diagnostics.
   */
  public async activate(): Promise<void> {
    const previousRevision = this.revision;
    const previousManifest = this.manifest;
    const previousSources = this.sources;
    const previousIndex = this.index;
    const previousState = this.activationState;
    this.activationState = 'fetching';

    try {
      const candidate = await this.prepareCandidate();
      this.validateCandidate(candidate);
      this.commitCandidate(candidate);
      this.activationState = 'active';
    } catch (error) {
      this.revision = previousRevision;
      this.manifest = previousManifest;
      this.sources = previousSources;
      this.index = previousIndex;
      this.activationState = previousState;

      if (error instanceof CatalogRuntimeError) {
        throw new CatalogRuntimeError({
          endpoint: error.endpoint,
          revision: error.revision,
          message: error.message,
          status: error.status,
          recoverable: true,
          failedEntityId: error.failedEntityId,
          failedEntityKind: error.failedEntityKind,
          previousActiveRevision: previousRevision,
        });
      }
      throw new CatalogRuntimeError({
        endpoint: 'unknown',
        revision: undefined,
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
        previousActiveRevision: previousRevision,
      });
    }
  }

  // ------------------------------------------------------------------
  // Entity detail fetch
  // ------------------------------------------------------------------

  /**
   * Fetches a single entity detail by validated artifact path.
   */
  public async fetchEntity(
    catalogRevision: CatalogRevision,
    detailPath: string,
  ): Promise<{ data: EntityDetailResponse; catalogRevision: CatalogRevision }> {
    validateArtifactPath(detailPath);
    const endpoint = this.buildUrl(catalogRevision, detailPath);
    const response = await this.fetchWithStatus(endpoint);

    if (!response.ok) {
      throw new CatalogRuntimeError({
        endpoint,
        revision: catalogRevision,
        message: `Entity detail fetch failed with status ${response.status}`,
        status: response.status,
      });
    }

    const raw = await response.json();

    if (!isEntityDetailResponse(raw)) {
      throw new CatalogRuntimeError({
        endpoint,
        revision: catalogRevision,
        message: `Entity detail response failed structural validation for path ${detailPath}`,
      });
    }

    return { data: raw, catalogRevision };
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
  // Candidate preparation (Phase 1)
  // ------------------------------------------------------------------

  private async prepareCandidate(): Promise<CandidateState> {
    const revision = await this.fetchCurrentRevision();
    const manifest = await this.fetchManifestForRevision(revision);
    const sources = await this.fetchSourcesForRevision(revision);
    const index = await this.fetchIndexesForRevision(revision, manifest);
    return { revision, manifest, sources, index };
  }

  private async fetchCurrentRevision(): Promise<CatalogRevision> {
    const endpoint = this.buildUrl(undefined, 'current.json');
    const response = await this.fetchWithStatus(endpoint);

    if (!response.ok) {
      throw new CatalogRuntimeError({
        endpoint,
        revision: undefined,
        message: `Current revision fetch failed with status ${response.status}`,
        status: response.status,
      });
    }

    const raw = await response.json();

    if (!isCurrentRevision(raw)) {
      throw new CatalogRuntimeError({
        endpoint,
        revision: undefined,
        message: 'Current revision response failed structural validation',
      });
    }

    return createCatalogRevision(raw.currentRevision);
  }

  private async fetchManifestForRevision(revision: CatalogRevision): Promise<CatalogManifest> {
    const endpoint = this.buildUrl(revision, 'manifest.json');
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

    return raw;
  }

  private async fetchSourcesForRevision(revision: CatalogRevision): Promise<Record<string, CatalogSource>> {
    const endpoint = this.buildUrl(revision, 'sources.json');
    const response = await this.fetchWithStatus(endpoint);

    if (!response.ok) {
      throw new CatalogRuntimeError({
        endpoint,
        revision,
        message: `Sources fetch failed with status ${response.status}`,
        status: response.status,
      });
    }

    const raw = await response.json();

    if (!Array.isArray(raw)) {
      throw new CatalogRuntimeError({
        endpoint,
        revision,
        message: 'Sources response is not an array',
      });
    }

    const validated: Record<string, CatalogSource> = {};
    for (let i = 0; i < raw.length; i++) {
      if (!isCatalogSource(raw[i])) {
        throw new CatalogRuntimeError({
          endpoint,
          revision,
          message: `Source entry at index ${i} failed structural validation`,
        });
      }
      const sourceId = String(raw[i].id);
      validated[sourceId] = raw[i];
    }

    return validated;
  }

  private async fetchIndexesForRevision(
    revision: CatalogRevision,
    manifest: CatalogManifest,
  ): Promise<Record<string, CatalogEntitySummary[]>> {
    const validated: Record<string, CatalogEntitySummary[]> = {};

    for (const kind of manifest.entityKinds) {
      const indexFilename = KIND_INDEX_FILENAME[kind];
      const endpoint = this.buildUrl(revision, `indexes/${indexFilename}`);
      const response = await this.fetchWithStatus(endpoint);

      if (!response.ok) {
        throw new CatalogRuntimeError({
          endpoint,
          revision,
          message: `Index fetch failed for kind "${kind}" with status ${response.status}`,
          status: response.status,
        });
      }

      const raw = await response.json();

      if (!Array.isArray(raw)) {
        throw new CatalogRuntimeError({
          endpoint,
          revision,
          message: `Index response for kind "${kind}" is not an array`,
        });
      }

      for (let i = 0; i < raw.length; i++) {
        if (!isCatalogEntitySummary(raw[i])) {
          throw new CatalogRuntimeError({
            endpoint,
            revision,
            message: `Index entry "${kind}[${i}]" failed structural validation`,
            failedEntityKind: kind,
          });
        }
      }

      validated[kind] = raw;
    }

    return validated;
  }

  // ------------------------------------------------------------------
  // Candidate validation
  // ------------------------------------------------------------------

  private validateCandidate(candidate: CandidateState): void {
    // FR-001: Validate schema version compatibility
    const schemaError = validateSchemaVersion(candidate.manifest);
    if (schemaError !== null) {
      throw new CatalogRuntimeError({
        endpoint: this.buildUrl(candidate.revision, 'manifest.json'),
        revision: candidate.revision,
        message: schemaError,
      });
    }

    // FR-001: Validate required entity kinds
    const kindsError = validateRequiredEntityKinds(candidate.manifest);
    if (kindsError !== null) {
      throw new CatalogRuntimeError({
        endpoint: this.buildUrl(candidate.revision, 'manifest.json'),
        revision: candidate.revision,
        message: kindsError,
      });
    }

    // Verify manifest revision matches discovered revision
    if (candidate.manifest.catalogRevision !== candidate.revision) {
      throw new CatalogRuntimeError({
        endpoint: this.buildUrl(candidate.revision, 'manifest.json'),
        revision: candidate.revision,
        message: `Manifest revision mismatch: expected ${candidate.revision}, got ${candidate.manifest.catalogRevision}`,
      });
    }

    // Verify all entity kinds in manifest have index data
    for (const kind of candidate.manifest.entityKinds) {
      if (!candidate.index[kind]) {
        throw new CatalogRuntimeError({
          endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind]}`),
          revision: candidate.revision,
          message: `Missing index data for entity kind "${kind}" declared in manifest`,
          failedEntityKind: kind,
        });
      }
    }

    // Verify all source IDs referenced in index entries exist in sources
    for (const [kind, entries] of Object.entries(candidate.index)) {
      for (const entry of entries) {
        const sourceId = String(entry.sourceId);
        if (!candidate.sources[sourceId]) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, 'sources.json'),
            revision: candidate.revision,
            message: `Index entry "${entry.id}" (kind: ${kind}) references unknown source "${sourceId}"`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
      }
    }

    // Invariant: summary kind matches containing index kind
    for (const [kind, entries] of Object.entries(candidate.index)) {
      for (const entry of entries) {
        if (entry.kind !== kind) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind as keyof typeof KIND_INDEX_FILENAME]}`),
            revision: candidate.revision,
            message: `Index entry "${entry.id}" has kind "${entry.kind}" but is in index "${kind}"`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
      }
    }

    // Invariant: validate every detailPath during preparation
    for (const [kind, entries] of Object.entries(candidate.index)) {
      for (const entry of entries) {
        try {
          validateArtifactPath(entry.detailPath);
        } catch (pathError) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind as keyof typeof KIND_INDEX_FILENAME]}`),
            revision: candidate.revision,
            message: `Index entry "${entry.id}" has invalid detailPath "${entry.detailPath}": ${pathError instanceof Error ? pathError.message : String(pathError)}`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
      }
    }

    // Invariant: no duplicate entity IDs within one index
    for (const [kind, entries] of Object.entries(candidate.index)) {
      const seenIds = new Set<string>();
      for (const entry of entries) {
        if (seenIds.has(entry.id)) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind as keyof typeof KIND_INDEX_FILENAME]}`),
            revision: candidate.revision,
            message: `Duplicate entity ID "${entry.id}" within index "${kind}"`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
        seenIds.add(entry.id);
      }
    }

    // Invariant: no duplicate entity IDs across indexes
    const allIds = new Map<string, string>();
    for (const [kind, entries] of Object.entries(candidate.index)) {
      for (const entry of entries) {
        const existingKind = allIds.get(entry.id);
        if (existingKind !== undefined && existingKind !== kind) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind as keyof typeof KIND_INDEX_FILENAME]}`),
            revision: candidate.revision,
            message: `Entity ID "${entry.id}" exists in both index "${existingKind}" and "${kind}"`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
        if (!allIds.has(entry.id)) {
          allIds.set(entry.id, kind);
        }
      }
    }

    // Invariant: no detail path assigned to different entity IDs
    const pathToEntity = new Map<string, string>();
    for (const [kind, entries] of Object.entries(candidate.index)) {
      for (const entry of entries) {
        const existingEntityId = pathToEntity.get(entry.detailPath);
        if (existingEntityId !== undefined && existingEntityId !== entry.id) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, `indexes/${KIND_INDEX_FILENAME[kind as keyof typeof KIND_INDEX_FILENAME]}`),
            revision: candidate.revision,
            message: `Detail path "${entry.detailPath}" assigned to both entity "${existingEntityId}" and "${entry.id}"`,
            failedEntityId: entry.id,
            failedEntityKind: kind,
          });
        }
        if (!pathToEntity.has(entry.detailPath)) {
          pathToEntity.set(entry.detailPath, entry.id);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Candidate commit (Phase 2)
  // ------------------------------------------------------------------

  private commitCandidate(candidate: CandidateState): void {
    this.revision = candidate.revision;
    this.manifest = candidate.manifest;
    this.sources = candidate.sources;
    this.index = candidate.index;
    void this.cacheManager?.invalidateByRevision(candidate.revision);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
    * Construct a catalog artifact URL from the base URL, optional revision,
    * and artifact path.
    *
    * With revision: `{baseUrl}/revisions/{revision}/{artifact}`
    * Without revision: `{baseUrl}/{artifact}` (for current.json)
    */
  private buildUrl(
    revision: CatalogRevision | undefined,
    artifact: string,
  ): string {
    return buildCatalogArtifactUrl(this.baseUrl, revision, artifact);
  }

  private async fetchWithStatus(endpoint: string): Promise<Response> {
    return this.fetcher(endpoint);
  }
}
