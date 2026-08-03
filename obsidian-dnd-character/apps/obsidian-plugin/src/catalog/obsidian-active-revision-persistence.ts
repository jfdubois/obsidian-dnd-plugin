/**
 * Obsidian adapter for {@link ActiveRevisionPersistence}.
 *
 * Stores the active catalog revision pointer in the plugin's
 * data.json under a dedicated key, separate from cache envelopes
 * and settings. Uses the same loadData / saveData API as
 * {@link PersistentCatalogCacheStore} to ensure atomic writes.
 *
 * The pointer value is stored as a plain string. On load, the
 * raw value is returned as `unknown` to enforce boundary
 * validation in the runtime service.
 */

import type { Plugin } from "obsidian";
import type { ActiveRevisionPersistence } from "@obsidian-dnd/catalog-contract";
import type { CatalogRevision } from "@obsidian-dnd/domain";
import { catalogRevisionStr } from "@obsidian-dnd/domain";

/** Key in plugin data.json for the active revision pointer. */
const ACTIVE_REVISION_KEY = "catalogActiveRevision";

/**
 * Active revision persistence backed by Obsidian Plugin
 * loadData / saveData API.
 */
export class ObsidianActiveRevisionPersistence
  implements ActiveRevisionPersistence
{
  private plugin: Plugin;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  /**
   * Load the persisted active revision pointer from disk.
   * Returns `unknown` at the untrusted boundary so the
   * runtime service can validate the shape.
   */
  async load(): Promise<unknown> {
    const raw = await this.plugin.loadData();
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      ACTIVE_REVISION_KEY in raw
    ) {
      const data = raw as Record<string, unknown>;
      return data[ACTIVE_REVISION_KEY];
    }
    return null;
  }

  /**
   * Persist the active revision pointer to disk.
   * Merges with existing plugin data to preserve settings
   * and cache entries.
   */
  async save(revision: CatalogRevision): Promise<void> {
    const raw = await this.plugin.loadData();
    const updated = {
      ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
      [ACTIVE_REVISION_KEY]: catalogRevisionStr(revision),
    };
    await this.plugin.saveData(updated);
  }

  /**
   * Clear the persisted active revision pointer.
   * Removes the key from plugin data without affecting
   * settings or cache entries.
   */
  async clear(): Promise<void> {
    const raw = await this.plugin.loadData();
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      ACTIVE_REVISION_KEY in raw
    ) {
      const data = raw as Record<string, unknown>;
      delete data[ACTIVE_REVISION_KEY];
      await this.plugin.saveData(data);
    }
  }
}
