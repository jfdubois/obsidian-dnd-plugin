import type { ActiveRevisionPersistence } from './active-revision-persistence';
import type { CatalogRevision, EntityId, RuleEntityKind } from '@obsidian-dnd/domain';
import { createCatalogRevision, isEntityId, isRuleEntityKind } from '@obsidian-dnd/domain';
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
import {
  CACHE_SCHEMA_VERSION,
  createCacheEnvelope,
  createNoExpiryExpiration,
  isCacheEnvelope,
  isCacheValid,
} from './cache-envelope';
import {
  buildManifestCacheKey,
  buildSourcesCacheKey,
  buildIndexCacheKey,
  buildEntityCacheKey,
} from './cache-keys';

/**
 * Activation state machine for the catalog runtime service.
 */
export type CatalogActivationState = 'inactive' | 'fetching' | 'active';

/**
 * A reference to a required catalog entity that must be validated
 * before activation can complete.
 */
export interface RequiredCatalogReference {
  entityId: EntityId;
  kind: RuleEntityKind;
}

/**
 * Validate that an unknown value is a well-formed required catalog
 * reference.
 */
export function isRequiredCatalogReference(value: unknown): value is RequiredCatalogReference {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isEntityId(obj.entityId)) return false;
  if (!isRuleEntityKind(obj.kind)) return false;
  return true;
}

/**
 * Options for the {@link CatalogRuntimeService.activate} method.
 */
export interface ActivateOptions {
  /**
   * Entities that must be present and valid in the candidate catalog
   * before activation completes. An empty array or omission skips
   * required-entity validation.
   */
  requiredReferences?: RequiredCatalogReference[];
}

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
 * Result of a cache restoration attempt.
 *
 * Discriminated union that provides specific failure reasons
 * instead of a bare boolean.
 */
export type CatalogRestoreResult =
  | { success: true; revision: CatalogRevision }
  | {
      success: false;
      reason:
        | 'no-persistence'
        | 'no-cache-manager'
        | 'invalid-pointer'
        | 'manifest-missing'
        | 'manifest-envelope-invalid'
        | 'manifest-envelope-version-mismatch'
        | 'manifest-envelope-revision-mismatch'
        | 'manifest-malformed'
        | 'schema-incompatible'
        | 'missing-entity-kinds'
        | 'manifest-revision-mismatch'
        | 'sources-missing'
        | 'sources-envelope-invalid'
        | 'sources-envelope-version-mismatch'
        | 'sources-envelope-revision-mismatch'
        | 'sources-malformed'
        | 'index-missing'
        | 'index-envelope-invalid'
        | 'index-envelope-version-mismatch'
        | 'index-envelope-revision-mismatch'
        | 'index-malformed'
        | 'index-invariants-violated'
        | 'detail-path-invalid';
    };

/**
 * Internal candidate state for two-stage activation.
 */
type CandidateState = {
  revision: CatalogRevision;
  manifest: CatalogManifest;
  sources: Record<string, CatalogSource>;
  index: Record<string, CatalogEntitySummary[]>;
  requiredEntities: Map<EntityId, EntityDetailResponse>;
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
  public requiredEntities: Map<EntityId, EntityDetailResponse> = new Map();

  private readonly fetcher: Fetcher;
  private readonly cacheManager: CatalogCacheManager | undefined;
  private readonly activeRevisionPersistence: ActiveRevisionPersistence | undefined;

  public constructor(options: {
    baseUrl: string;
    fetcher: Fetcher;
    cacheManager?: CatalogCacheManager;
    activeRevisionPersistence?: ActiveRevisionPersistence;
  }) {
    this.baseUrl = options.baseUrl;
    this.fetcher = options.fetcher;
    this.cacheManager = options.cacheManager;
    this.activeRevisionPersistence = options.activeRevisionPersistence;
  }

  // ------------------------------------------------------------------
  // Activation (two-phase: prepare → commit)
  // ------------------------------------------------------------------

  /**
   * Activates the catalog by discovering the current revision from
   * `current.json`, then preparing and committing a candidate.
   *
   * Optionally validates required entity references before commit.
   * On success sets `activationState` to `'active'`.
   * On failure preserves former active state and throws
   * {@link CatalogRuntimeError} with recoverability diagnostics.
   */
  public async activate(options?: ActivateOptions): Promise<void> {
    const previousRevision = this.revision;
    const previousManifest = this.manifest;
    const previousSources = this.sources;
    const previousIndex = this.index;
    const previousState = this.activationState;
    const previousRequiredEntities = this.requiredEntities;
    this.activationState = 'fetching';

    try {
      const candidate = await this.prepareCandidate();
      this.validateCandidate(candidate);
      await this.validateRequiredEntities(candidate, options?.requiredReferences);
      await this.stageCandidateToCache(candidate);
      await this.persistActiveRevision(candidate.revision);
      this.commitCandidate(candidate);
      this.activationState = 'active';
    } catch (error) {
      this.revision = previousRevision;
      this.manifest = previousManifest;
      this.sources = previousSources;
      this.index = previousIndex;
      this.activationState = previousState;
      this.requiredEntities = previousRequiredEntities;

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
  // Required entity validation
  // ------------------------------------------------------------------

  /**
   * Validates all required catalog entity references against the
   * candidate indexes and fetched entity artifacts.
   *
   * For each reference:
   * 1. Locate its summary across prepared indexes.
   * 2. Require exact ID match.
   * 3. Require exact kind match.
   * 4. Use the already-validated detailPath.
   * 5. Fetch the immutable entity artifact.
   * 6. Runtime-validate it as a normalized entity.
   * 7. Require returned entity ID to match.
   * 8. Require returned entity kind to match.
   * 9. Retain the validated entity in candidate state.
   *
   * Fails preparation before activation when any required entity
   * is unresolved or invalid.
   */
  private async validateRequiredEntities(
    candidate: CandidateState,
    references?: RequiredCatalogReference[],
  ): Promise<void> {
    if (!references || references.length === 0) return;

    // Deduplicate by entity ID while detecting kind conflicts
    const deduped = new Map<string, RequiredCatalogReference>();
    for (const ref of references) {
      const key = String(ref.entityId);
      const existing = deduped.get(key);
      if (existing) {
        if (existing.kind !== ref.kind) {
          throw new CatalogRuntimeError({
            endpoint: this.buildUrl(candidate.revision, 'indexes'),
            revision: candidate.revision,
            message: `Required entity "${key}" referenced with conflicting kinds: "${existing.kind}" and "${ref.kind}"`,
            recoverable: true,
            failedEntityId: key,
            failedEntityKind: ref.kind,
          });
        }
        // Same ID and kind — skip duplicate
        continue;
      }
      deduped.set(key, ref);
    }

    const validatedEntities = new Map<EntityId, EntityDetailResponse>();

    for (const ref of deduped.values()) {
      const entityIdStr = String(ref.entityId);

      // 1. Locate summary across prepared indexes
      const summary = this.findSummaryInIndex(candidate.index, ref.entityId, ref.kind);
      if (!summary) {
        throw new CatalogRuntimeError({
          endpoint: this.buildUrl(candidate.revision, 'indexes'),
          revision: candidate.revision,
          message: `Required entity "${entityIdStr}" (kind: "${ref.kind}") not found in candidate indexes`,
          recoverable: true,
          failedEntityId: entityIdStr,
          failedEntityKind: ref.kind,
        });
      }

      // 2-3. Exact ID and kind match (already enforced by findSummaryInIndex)

      // 4. Use already-validated detailPath from summary
      const detailPath = summary.detailPath;

      // 5. Fetch the immutable entity artifact
      const endpoint = this.buildUrl(candidate.revision, detailPath);
      const response = await this.fetchWithStatus(endpoint);

      if (!response.ok) {
        throw new CatalogRuntimeError({
          endpoint,
          revision: candidate.revision,
          message: `Required entity "${entityIdStr}" fetch failed with status ${response.status}`,
          status: response.status,
          recoverable: true,
          failedEntityId: entityIdStr,
          failedEntityKind: ref.kind,
        });
      }

      const raw = await response.json();

      // 6. Runtime-validate as normalized entity
      if (!isEntityDetailResponse(raw)) {
        throw new CatalogRuntimeError({
          endpoint,
          revision: candidate.revision,
          message: `Required entity "${entityIdStr}" failed structural validation`,
          recoverable: true,
          failedEntityId: entityIdStr,
          failedEntityKind: ref.kind,
        });
      }

      // 7. Require returned entity ID to match
      if (raw.id !== ref.entityId) {
        throw new CatalogRuntimeError({
          endpoint,
          revision: candidate.revision,
          message: `Required entity ID mismatch: expected "${entityIdStr}", got "${raw.id}"`,
          recoverable: true,
          failedEntityId: entityIdStr,
          failedEntityKind: ref.kind,
        });
      }

      // 8. Require returned entity kind to match
      if (raw.kind !== ref.kind) {
        throw new CatalogRuntimeError({
          endpoint,
          revision: candidate.revision,
          message: `Required entity kind mismatch: expected "${ref.kind}", got "${raw.kind}"`,
          recoverable: true,
          failedEntityId: entityIdStr,
          failedEntityKind: ref.kind,
        });
      }

      // 9. Retain validated entity in candidate state
      validatedEntities.set(ref.entityId, raw);
    }

    candidate.requiredEntities = validatedEntities;
  }

  /**
   * Searches all prepared indexes for a summary matching the given
   * entity ID and kind. Returns the first match or undefined.
   */
  private findSummaryInIndex(
    index: Record<string, CatalogEntitySummary[]>,
    entityId: EntityId,
    kind: RuleEntityKind,
  ): CatalogEntitySummary | undefined {
    const entries = index[kind];
    if (!entries) return undefined;
    return entries.find((entry) => entry.id === entityId);
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
    this.requiredEntities = new Map();
  }

  // ------------------------------------------------------------------
  // Cache restoration (offline startup)
  // ------------------------------------------------------------------

  /**
   * Attempts to restore the active catalog from the persistent cache
   * without making any network calls.
   *
   * Restoration flow:
   * 1. Load persisted active-revision pointer (untrusted, validate).
   * 2. Validate the pointer is a non-empty string.
   * 3. Convert via branded revision factory.
   * 4. Load cached manifest for that revision.
   * 5. Validate manifest envelope metadata (schema version, revision, hash).
   * 6. Validate manifest structural integrity and compatibility.
   * 7. Require manifest revision equals persisted revision.
   * 8. Load cached sources for that revision.
   * 9. Validate sources envelope metadata.
   * 10. Load cached per-kind indexes for that revision.
   * 11. Validate each index envelope metadata.
   * 12. Reapply index invariants via candidate validation.
   * 13. Restore snapshot into active state.
   * 14. Set activationState to 'active'.
   *
   * @returns CatalogRestoreResult with success/failure and specific reason.
   */
  public async restoreFromCache(): Promise<CatalogRestoreResult> {
    // Require both persistence store and cache manager
    const store = this.activeRevisionPersistence;
    const cm = this.cacheManager;
    if (!store) return { success: false, reason: 'no-persistence' };
    if (!cm) return { success: false, reason: 'no-cache-manager' };

    // 1. Load persisted pointer (untrusted boundary)
    const rawPointer = await store.load();
    // 2. Validate pointer is a non-empty string
    if (typeof rawPointer !== 'string' || rawPointer.length === 0) {
      return { success: false, reason: 'invalid-pointer' };
    }

    // 3. Convert via branded revision factory
    const revision = createCatalogRevision(rawPointer);

    // 4. Load cached manifest
    const manifestEnvelope = await cm.getCached<CatalogManifest>(
      buildManifestCacheKey(revision),
    );
    if (!manifestEnvelope) {
      return { success: false, reason: 'manifest-missing' };
    }

    // Validate manifest envelope structure
    if (!isCacheEnvelope(manifestEnvelope)) {
      return { success: false, reason: 'manifest-envelope-invalid' };
    }

    // Validate manifest structural integrity (need value before inputHash check)
    if (!isCatalogManifest(manifestEnvelope.value)) {
      return { success: false, reason: 'manifest-malformed' };
    }
    const manifest = manifestEnvelope.value;

    // Validate manifest envelope metadata (including inputHash)
    if (!isCacheValid(manifestEnvelope, revision, manifest.sourceRevision)) {
      return { success: false, reason: 'manifest-envelope-invalid' };
    }

    // 5. Validate manifest compatibility
    const schemaError = validateSchemaVersion(manifest);
    if (schemaError !== null) {
      return { success: false, reason: 'schema-incompatible' };
    }

    const kindsError = validateRequiredEntityKinds(manifest);
    if (kindsError !== null) {
      return { success: false, reason: 'missing-entity-kinds' };
    }

    // 6. Require manifest revision equals persisted revision
    if (manifest.catalogRevision !== revision) {
      return { success: false, reason: 'manifest-revision-mismatch' };
    }

    // 7. Load cached sources
    const sourcesEnvelope = await cm.getCached<Record<string, CatalogSource>>(
      buildSourcesCacheKey(revision),
    );
    if (!sourcesEnvelope) {
      return { success: false, reason: 'sources-missing' };
    }

    // Validate sources envelope metadata (including inputHash)
    if (!isCacheEnvelope(sourcesEnvelope)) {
      return { success: false, reason: 'sources-envelope-invalid' };
    }
    if (!isCacheValid(sourcesEnvelope, revision, manifest.sourceRevision)) {
      return { success: false, reason: 'sources-envelope-invalid' };
    }

    // Validate sources structural integrity
    if (typeof sourcesEnvelope.value !== 'object' || sourcesEnvelope.value === null) {
      return { success: false, reason: 'sources-malformed' };
    }
    const sources = sourcesEnvelope.value as Record<string, CatalogSource>;
    for (const source of Object.values(sources)) {
      if (!isCatalogSource(source)) {
        return { success: false, reason: 'sources-malformed' };
      }
    }

    // 8. Load cached per-kind indexes
    const index: Record<string, CatalogEntitySummary[]> = {};
    for (const kind of manifest.entityKinds) {
      const indexEnvelope = await cm.getCached<CatalogEntitySummary[]>(
        buildIndexCacheKey(revision, kind),
      );
      if (!indexEnvelope) {
        return { success: false, reason: 'index-missing' };
      }

      // Validate index envelope metadata (including inputHash)
      if (!isCacheEnvelope(indexEnvelope)) {
        return { success: false, reason: 'index-envelope-invalid' };
      }
      const expectedIndexHash = `${manifest.sourceRevision}:${kind}`;
      if (!isCacheValid(indexEnvelope, revision, expectedIndexHash)) {
        return { success: false, reason: 'index-envelope-invalid' };
      }

      if (!Array.isArray(indexEnvelope.value)) {
        return { success: false, reason: 'index-malformed' };
      }
      for (const entry of indexEnvelope.value) {
        if (!isCatalogEntitySummary(entry)) {
          return { success: false, reason: 'index-malformed' };
        }
      }
      index[kind] = indexEnvelope.value;
    }

    // 9. Reapply index invariants via candidate validation
    const candidate: CandidateState = {
      revision,
      manifest,
      sources,
      index,
      requiredEntities: new Map(),
    };

    try {
      this.validateCandidate(candidate);
    } catch {
      return { success: false, reason: 'index-invariants-violated' };
    }

    // 10. Restore snapshot into active state
    this.commitCandidate(candidate);

    // 11. Set activationState to 'active'
    this.activationState = 'active';

    return { success: true, revision };
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
    return { revision, manifest, sources, index, requiredEntities: new Map() };
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
  // Candidate cache staging
  // ------------------------------------------------------------------

  /**
   * Stages all validated candidate artifacts into revision-specific
   * cache namespaces before active-pointer persistence.
   *
   * Writes manifest, sources, per-kind indexes, and any required
   * entities fetched during validation. Uses canonical cache keys
   * and validated cache envelopes with no-expiry expiration.
   *
   * If a cache manager is not configured, staging is a no-op.
   * Any write failure throws and aborts activation, preserving
   * the former active state and cache.
   */
  private async stageCandidateToCache(candidate: CandidateState): Promise<void> {
    const cm = this.cacheManager;
    if (!cm) return;

    const { revision, manifest, sources, index, requiredEntities } = candidate;
    const expiration = createNoExpiryExpiration();
    const createdAt = new Date().toISOString();
    const inputHash = manifest.sourceRevision;

    // Stage manifest
    await cm.set(buildManifestCacheKey(revision), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: revision,
      inputHash,
      createdAt,
      expiration,
      value: manifest,
    }));

    // Stage sources
    await cm.set(buildSourcesCacheKey(revision), createCacheEnvelope({
      cacheSchemaVersion: CACHE_SCHEMA_VERSION,
      catalogRevision: revision,
      inputHash,
      createdAt,
      expiration,
      value: sources,
    }));

    // Stage per-kind indexes
    for (const kind of manifest.entityKinds) {
      const entries = index[kind];
      if (!entries) continue;
      await cm.set(buildIndexCacheKey(revision, kind), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: revision,
        inputHash: `${inputHash}:${kind}`,
        createdAt,
        expiration,
        value: entries,
      }));
    }

    // Stage required entities
    for (const [entityId, entity] of requiredEntities) {
      const summary = this.findSummaryInIndex(index, entityId, entity.kind);
      if (!summary) continue;
      await cm.set(buildEntityCacheKey(revision, entityId), createCacheEnvelope({
        cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        catalogRevision: revision,
        inputHash: `${inputHash}:${entityId}`,
        createdAt,
        expiration,
        value: entity,
      }));
    }
  }

  /**
   * Persist the active revision pointer to the injected persistence
   * store before swapping the in-memory active snapshot.
   *
   * If no persistence store is configured, this is a no-op.
   * On failure, throws and aborts activation, preserving the former
   * active state. The diagnostic identifies the operation as
   * 'active-revision-persistence'.
   */
  private async persistActiveRevision(revision: CatalogRevision): Promise<void> {
    const store = this.activeRevisionPersistence;
    if (!store) return;

    try {
      await store.save(revision);
    } catch (error) {
      throw new CatalogRuntimeError({
        endpoint: 'active-revision-persistence',
        revision,
        message: error instanceof Error
          ? `Failed to persist active revision pointer: ${error.message}`
          : 'Failed to persist active revision pointer',
        recoverable: true,
      });
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
    this.requiredEntities = candidate.requiredEntities;
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
