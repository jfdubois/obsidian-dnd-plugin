import type { EntityId, SourceId, Ruleset, RuleEntityKind, ContentAccess } from "@obsidian-dnd/domain";
import { isEntityId, isSourceId, isRuleset, isRuleEntityKind, isContentAccess } from "@obsidian-dnd/domain";
import type { EquipmentGroup } from "./query";
import { isEquipmentGroup } from "./query";

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

/**
 * Item-specific compact-index data needed to evaluate EquipmentQuery without
 * loading ItemRule detail documents. This refinement deliberately does not
 * add equipment metadata to other entity kinds.
 */
export interface CatalogItemSummary extends CatalogEntitySummary {
  kind: "item";
  equipmentGroups: EquipmentGroup[];
}

type CatalogSummaryBaseProps = {
  id: EntityId;
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  legacy: boolean;
  tags: string[];
  detailPath: string;
};

type CatalogEntitySummaryProps = CatalogSummaryBaseProps & {
  kind: Exclude<RuleEntityKind, "item">;
};

type CatalogItemSummaryProps = CatalogSummaryBaseProps & {
  kind: "item";
  equipmentGroups: EquipmentGroup[];
};

export function isCatalogEntitySummary(value: unknown): value is CatalogEntitySummary {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as unknown as Record<string, unknown>;

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
  if (obj.kind !== "item" && "equipmentGroups" in obj) return false;

  return true;
}

/** Strict validator for the item-index contract introduced in schema v4. */
export function isCatalogItemSummary(value: unknown): value is CatalogItemSummary {
  if (!isCatalogEntitySummary(value)) return false;
  const obj = value as unknown as Record<string, unknown>;
  return obj.kind === "item"
    && Array.isArray(obj.equipmentGroups)
    && obj.equipmentGroups.every(isEquipmentGroup);
}

export function createCatalogEntitySummary(
  props: CatalogEntitySummaryProps,
): CatalogEntitySummary {
  return {
    ...createCatalogSummaryBase(props),
    kind: props.kind,
  };
}

function createCatalogSummaryBase(props: CatalogSummaryBaseProps) {
  return {
    id: props.id,
    name: props.name,
    sourceId: props.sourceId,
    ruleset: props.ruleset,
    access: props.access,
    legacy: props.legacy,
    tags: [...props.tags],
    detailPath: props.detailPath,
  };
}

/** Creates the schema-v4 compact-index representation for an item. */
export function createCatalogItemSummary(props: CatalogItemSummaryProps): CatalogItemSummary {
  return {
    ...createCatalogSummaryBase(props),
    kind: "item",
    equipmentGroups: [...props.equipmentGroups],
  };
}
