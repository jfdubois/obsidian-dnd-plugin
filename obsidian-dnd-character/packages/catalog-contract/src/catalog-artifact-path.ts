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
    return `${normalizedBase}/revisions/${revisionStr}/${artifact}`;
  }
  return `${normalizedBase}/${artifact}`;
}
