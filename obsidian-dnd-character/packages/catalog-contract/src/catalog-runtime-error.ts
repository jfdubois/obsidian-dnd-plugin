import type { CatalogRevision } from '@obsidian-dnd/domain';

export type CatalogRuntimeErrorOperation =
  | 'cache-write'
  | 'active-revision-save'
  | 'entity-resolution';

export type CatalogRuntimeErrorArtifact =
  | 'manifest'
  | 'sources'
  | 'index'
  | 'entity'
  | 'active-pointer';

export type CatalogRuntimeErrorStage =
  | 'cache-staging'
  | 'active-revision-save';

export type CatalogRuntimeErrorResultingState = 'inactive' | 'active';

/**
 * Error thrown during catalog API operations.
 *
 * Preserves the endpoint that failed, the revision being activated,
 * the HTTP status (if available), and the original message.
 * Also preserves recoverability, failed entity diagnostics, and
 * the previous active revision for rollback reporting.
 */
export class CatalogRuntimeError extends Error {
  public readonly code: 'ENTITY_UNRESOLVED' | undefined;
  public readonly endpoint: string;
  public readonly revision: CatalogRevision | undefined;
  public readonly status: number | undefined;
  public readonly recoverable: boolean;
  public readonly failedEntityId: string | undefined;
  public readonly failedEntityKind: string | undefined;
  public readonly previousActiveRevision: CatalogRevision | undefined;
  public readonly cause: unknown;
  public readonly operation: CatalogRuntimeErrorOperation | undefined;
  public readonly artifact: CatalogRuntimeErrorArtifact | undefined;
  public readonly artifactKey: string | undefined;
  public readonly candidateRevision: CatalogRevision | undefined;
  public readonly stage: CatalogRuntimeErrorStage | undefined;
  public readonly resultingActivationState: CatalogRuntimeErrorResultingState | undefined;
  public readonly cacheOperation: 'cache-read' | undefined;
  public readonly cacheKey: string | undefined;
  public readonly cacheFailureReason: string | undefined;
  public readonly networkOperation: 'entity-fetch' | undefined;
  public readonly networkEndpoint: string | undefined;
  public readonly offlineOrUnavailable: boolean | undefined;

  public constructor(options: {
    endpoint: string;
    revision?: CatalogRevision;
    message: string;
    status?: number;
    recoverable?: boolean;
    failedEntityId?: string;
    failedEntityKind?: string;
    previousActiveRevision?: CatalogRevision;
    cause?: unknown;
    operation?: CatalogRuntimeErrorOperation;
    artifact?: CatalogRuntimeErrorArtifact;
    artifactKey?: string;
    candidateRevision?: CatalogRevision;
    stage?: CatalogRuntimeErrorStage;
    resultingActivationState?: CatalogRuntimeErrorResultingState;
    code?: 'ENTITY_UNRESOLVED';
    cacheOperation?: 'cache-read';
    cacheKey?: string;
    cacheFailureReason?: string;
    networkOperation?: 'entity-fetch';
    networkEndpoint?: string;
    offlineOrUnavailable?: boolean;
  }) {
    super(options.message);
    this.name = 'CatalogRuntimeError';
    this.code = options.code;
    this.endpoint = options.endpoint;
    this.revision = options.revision;
    this.status = options.status;
    this.recoverable = options.recoverable ?? false;
    this.failedEntityId = options.failedEntityId;
    this.failedEntityKind = options.failedEntityKind;
    this.previousActiveRevision = options.previousActiveRevision;
    this.cause = options.cause;
    this.operation = options.operation;
    this.artifact = options.artifact;
    this.artifactKey = options.artifactKey;
    this.candidateRevision = options.candidateRevision ?? options.revision;
    this.stage = options.stage;
    this.resultingActivationState = options.resultingActivationState;
    this.cacheOperation = options.cacheOperation;
    this.cacheKey = options.cacheKey;
    this.cacheFailureReason = options.cacheFailureReason;
    this.networkOperation = options.networkOperation;
    this.networkEndpoint = options.networkEndpoint;
    this.offlineOrUnavailable = options.offlineOrUnavailable;
  }
}
