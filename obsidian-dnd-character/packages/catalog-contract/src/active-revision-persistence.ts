/**
 * Active revision pointer persistence interface.
 *
 * Dependency-injected persistence layer for the authoritative
 * active catalog revision pointer. Allows the plugin adapter
 * to plug in any storage backend (Obsidian data, localStorage,
 * IndexedDB, etc.) while keeping the catalog-contract package
 * free of Obsidian imports.
 *
 * The pointer is persisted _after_ candidate cache staging and
 * _before_ the in-memory active snapshot swap, ensuring that
 * no candidate state becomes externally active before the
 * persistent pointer succeeds.
 */

import type { CatalogRevision } from '@obsidian-dnd/domain';

/**
 * Persistence interface for the active catalog revision pointer.
 *
 * Implementations must be idempotent and safe to call multiple
 * times. The `load` method returns `null` when no pointer has
 * been persisted yet.
 */
export interface ActiveRevisionPersistence {
  /**
   * Load the currently persisted active revision pointer.
   *
   * @returns The persisted revision, or `null` if no pointer exists.
   */
  load(): Promise<CatalogRevision | null>;

  /**
   * Persist the active revision pointer.
   *
   * Must throw on failure so the caller can abort the activation
   * and preserve the former active state.
   *
   * @param revision - The catalog revision to persist as active.
   */
  save(revision: CatalogRevision): Promise<void>;

  /**
   * Clear the persisted active revision pointer.
   *
   * Used during reset or when the pointer must be invalidated.
   */
  clear(): Promise<void>;
}
