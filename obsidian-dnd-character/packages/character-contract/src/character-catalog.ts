import type { CatalogRevision } from "@obsidian-dnd/domain";
import { isCatalogRevision } from "@obsidian-dnd/domain";

/* ── Character catalog reference ─────────────────────────────────
   Tracks which catalog revision the character was created with and
   last validated against. Used for migration readiness.           */

export interface CharacterCatalogReference {
  catalogSchemaVersion: number;
  createdWithRevision: CatalogRevision;
  lastValidatedRevision: CatalogRevision;
}

export function isCharacterCatalogReference(value: unknown): value is CharacterCatalogReference {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.catalogSchemaVersion !== "number" || !Number.isInteger(obj.catalogSchemaVersion) || obj.catalogSchemaVersion < 1) {
    return false;
  }

  if (!isCatalogRevision(obj.createdWithRevision)) return false;
  if (!isCatalogRevision(obj.lastValidatedRevision)) return false;

  return true;
}

export function createCharacterCatalogReference(
  props: {
    catalogSchemaVersion: number;
    createdWithRevision: CatalogRevision;
    lastValidatedRevision: CatalogRevision;
  },
): CharacterCatalogReference {
  return {
    catalogSchemaVersion: props.catalogSchemaVersion,
    createdWithRevision: props.createdWithRevision,
    lastValidatedRevision: props.lastValidatedRevision,
  };
}
