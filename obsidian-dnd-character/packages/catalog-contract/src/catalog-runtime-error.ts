import type { CatalogRevision } from '@obsidian-dnd/domain';

/**
 * Error thrown during catalog API operations.
 *
 * Preserves the endpoint that failed, the revision being activated,
 * the HTTP status (if available), and the original message.
 */
export class CatalogRuntimeError extends Error {
  public readonly endpoint: string;
  public readonly revision: CatalogRevision;
  public readonly status: number | undefined;

  public constructor(options: {
    endpoint: string;
    revision: CatalogRevision;
    message: string;
    status?: number;
  }) {
    super(options.message);
    this.name = 'CatalogRuntimeError';
    this.endpoint = options.endpoint;
    this.revision = options.revision;
    this.status = options.status;
  }
}
