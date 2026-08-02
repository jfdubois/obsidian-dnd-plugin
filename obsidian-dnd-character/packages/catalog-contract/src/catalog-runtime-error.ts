import type { CatalogRevision } from '@obsidian-dnd/domain';

/**
 * Error thrown during catalog API operations.
 *
 * Preserves the endpoint that failed, the revision being activated,
 * the HTTP status (if available), and the original message.
 * Also preserves recoverability, failed entity diagnostics, and
 * the previous active revision for rollback reporting.
 */
export class CatalogRuntimeError extends Error {
  public readonly endpoint: string;
  public readonly revision: CatalogRevision;
  public readonly status: number | undefined;
  public readonly recoverable: boolean;
  public readonly failedEntityId: string | undefined;
  public readonly failedEntityKind: string | undefined;
  public readonly previousActiveRevision: CatalogRevision | undefined;

  public constructor(options: {
    endpoint: string;
    revision: CatalogRevision;
    message: string;
    status?: number;
    recoverable?: boolean;
    failedEntityId?: string;
    failedEntityKind?: string;
    previousActiveRevision?: CatalogRevision;
  }) {
    super(options.message);
    this.name = 'CatalogRuntimeError';
    this.endpoint = options.endpoint;
    this.revision = options.revision;
    this.status = options.status;
    this.recoverable = options.recoverable ?? false;
    this.failedEntityId = options.failedEntityId;
    this.failedEntityKind = options.failedEntityKind;
    this.previousActiveRevision = options.previousActiveRevision;
  }
}
