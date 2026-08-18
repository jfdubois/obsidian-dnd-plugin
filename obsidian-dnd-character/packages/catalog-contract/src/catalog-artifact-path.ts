/**
 * Canonical artifact path composition for the catalog system.
 *
 * All revision-scoped artifacts follow the pattern:
 *   {baseUrl}/revisions/{revision}/{artifact}
 *
 * The revision-independent current.json pointer uses:
 *   {baseUrl}/current.json
 *
 * This module provides the single shared implementation consumed
 * by the runtime service, plugin client, and any future consumers.
 */

import type { CatalogRevision } from '@obsidian-dnd/domain';
import { catalogRevisionStr } from '@obsidian-dnd/domain';

/**
 * Convert a literal published catalog artifact path into its HTTP request
 * representation. Path separators remain structural; each filename segment
 * is encoded independently so literal percent characters survive one
 * server-side URL decode.
 */
export function encodeCatalogArtifactPathForRequest(artifact: string): string {
  return artifact.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

/**
 * Construct a catalog artifact URL from the base URL, optional revision,
 * and artifact path.
 *
 * With revision: `{baseUrl}/revisions/{revision}/{artifact}`
 * Without revision: `{baseUrl}/{artifact}` (for current.json)
 */
export function buildCatalogArtifactUrl(
  baseUrl: string,
  revision: CatalogRevision | undefined,
  artifact: string,
): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');

  if (revision !== undefined) {
    const revisionStr = catalogRevisionStr(revision);
    return `${normalizedBase}/revisions/${revisionStr}/${encodeCatalogArtifactPathForRequest(artifact)}`;
  }
  return `${normalizedBase}/${encodeCatalogArtifactPathForRequest(artifact)}`;
}
