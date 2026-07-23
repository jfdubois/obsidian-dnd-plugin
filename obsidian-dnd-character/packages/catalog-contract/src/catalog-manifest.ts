import type { CatalogRevision } from "@obsidian-dnd/domain";
import {
  isCatalogRevision,
  isRuleset,
  isRuleEntityKind,
} from "@obsidian-dnd/domain";
import type { Ruleset, RuleEntityKind } from "@obsidian-dnd/domain";
import { CATALOG_API_VERSION } from "./schema-version";

/* ── Catalog manifest ───────────────────────────────────────────
   The manifest is the top-level descriptor for a published catalog
   revision. The plugin fetches current.json, reads the revision
   identifier, then fetches and validates the manifest before
   activating the revision.                                     */

export interface CatalogManifest {
  apiVersion: typeof CATALOG_API_VERSION;
  schemaVersion: number;
  catalogRevision: CatalogRevision;
  sourceRevision: string;
  builderVersion: string;
  generatedAt: string;
  rulesets: Ruleset[];
  entityKinds: RuleEntityKind[];
  checksums: Record<string, string>;
}

export function isCatalogManifest(value: unknown): value is CatalogManifest {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.apiVersion !== CATALOG_API_VERSION) return false;

  if (typeof obj.schemaVersion !== "number" || !Number.isInteger(obj.schemaVersion) || obj.schemaVersion < 1) {
    return false;
  }

  if (!isCatalogRevision(obj.catalogRevision)) return false;

  if (typeof obj.sourceRevision !== "string" || obj.sourceRevision.length === 0) return false;

  if (typeof obj.builderVersion !== "string" || obj.builderVersion.length === 0) return false;

  if (typeof obj.generatedAt !== "string" || obj.generatedAt.length === 0) return false;

  if (!Array.isArray(obj.rulesets)) return false;
  if (obj.rulesets.length === 0) return false;
  if (!obj.rulesets.every((r: unknown) => isRuleset(r))) return false;

  if (!Array.isArray(obj.entityKinds)) return false;
  if (obj.entityKinds.length === 0) return false;
  if (!obj.entityKinds.every((k: unknown) => isRuleEntityKind(k))) return false;

  if (typeof obj.checksums !== "object" || obj.checksums === null || Array.isArray(obj.checksums)) {
    return false;
  }
  for (const [key, val] of Object.entries(obj.checksums)) {
    if (typeof key !== "string" || key.length === 0) return false;
    if (typeof val !== "string" || val.length === 0) return false;
  }

  return true;
}

export function createCatalogManifest(
  props: {
    schemaVersion: number;
    catalogRevision: CatalogRevision;
    sourceRevision: string;
    builderVersion: string;
    generatedAt: string;
    rulesets: Ruleset[];
    entityKinds: RuleEntityKind[];
    checksums: Record<string, string>;
  },
): CatalogManifest {
  return {
    apiVersion: CATALOG_API_VERSION,
    schemaVersion: props.schemaVersion,
    catalogRevision: props.catalogRevision,
    sourceRevision: props.sourceRevision,
    builderVersion: props.builderVersion,
    generatedAt: props.generatedAt,
    rulesets: [...props.rulesets],
    entityKinds: [...props.entityKinds],
    checksums: { ...props.checksums },
  };
}
