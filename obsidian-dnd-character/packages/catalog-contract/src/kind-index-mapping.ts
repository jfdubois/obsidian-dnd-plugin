/**
 * Shared mapping from RuleEntityKind to the index filename
 * the catalog publisher writes under the `indexes/` directory.
 *
 * This single source of truth is consumed by:
 * - catalog-builder (publisher writes)
 * - catalog-runtime-service (runtime reads)
 * - request-url-client (plugin client reads)
 */

import type { RuleEntityKind } from '@obsidian-dnd/domain';

export const KIND_INDEX_FILENAME: Readonly<Record<RuleEntityKind, string>> = Object.freeze({
  'species': 'species.json',
  'background': 'backgrounds.json',
  'class': 'classes.json',
  'subclass': 'subclasses.json',
  'class-feature': 'class-features.json',
  'subclass-feature': 'subclass-features.json',
  'feat': 'feats.json',
  'spell': 'spells.json',
  'item': 'items.json',
  'optional-feature': 'optional-features.json',
  'skill': 'skills.json',
  'language': 'languages.json',
});
