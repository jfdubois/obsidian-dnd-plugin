import type { EntityId, SourceId, Ruleset, RuleEntityKind, ContentAccess } from "@obsidian-dnd/domain";
import { isEntityId, isSourceId, isRuleset, isRuleEntityKind, isContentAccess } from "@obsidian-dnd/domain";

/* ── Entity summary ─────────────────────────────────────────────
   The lightweight index record for a catalog entity. The plugin
   fetches index files (one per entity kind) to populate search
   and selection lists before lazy-loading full details.         */

export interface CatalogEntitySummary {
  id: EntityId;
  kind: RuleEntityKind;
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  legacy: boolean;
  tags: string[];
  detailPath: string;
}

export function isCatalogEntitySummary(value: unknown): value is CatalogEntitySummary {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (!isRuleEntityKind(obj.kind)) return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isSourceId(obj.sourceId)) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (!isContentAccess(obj.access)) return false;
  if (typeof obj.legacy !== "boolean") return false;
  if (!Array.isArray(obj.tags)) return false;
  if (!obj.tags.every((t: unknown) => typeof t === "string" && t.length > 0)) return false;
  if (typeof obj.detailPath !== "string" || obj.detailPath.length === 0) return false;

  return true;
}

export function createCatalogEntitySummary(
  props: {
    id: EntityId;
    kind: RuleEntityKind;
    name: string;
    sourceId: SourceId;
    ruleset: Ruleset;
    access: ContentAccess;
    legacy: boolean;
    tags: string[];
    detailPath: string;
  },
): CatalogEntitySummary {
  return {
    id: props.id,
    kind: props.kind,
    name: props.name,
    sourceId: props.sourceId,
    ruleset: props.ruleset,
    access: props.access,
    legacy: props.legacy,
    tags: [...props.tags],
    detailPath: props.detailPath,
  };
}
