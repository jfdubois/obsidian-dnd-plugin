import type { CatalogRevision, RuleEntityKind } from "@obsidian-dnd/domain";
import { isItemRule, type EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { deriveDraftConsequences } from "./creator-draft-commands";
import type { SelectionConsequenceModel } from "./creator-consequence-service";

export class RequiredCatalogEntityLoadError extends Error {
  constructor(
    readonly entityId: string,
    readonly reason: "missing-from-index" | "detail-unavailable" | "invalid-item-detail",
  ) {
    super(reason === "missing-from-index"
      ? `The required catalog item ${entityId} is not present in the active item index.`
      : reason === "invalid-item-detail"
        ? `The required catalog item ${entityId} was invalid in the active catalog.`
        : `The required catalog item ${entityId} could not be loaded from the active catalog.`);
    this.name = "RequiredCatalogEntityLoadError";
  }
}

/**
 * Loads details needed by the active consequence definitions, then derives one
 * presentation model. Index access here discovers catalog records only; query
 * eligibility is evaluated exclusively by the consequence service.
 */
export async function loadCreatorConsequenceReadModel(
  draft: CharacterDraft,
  catalog: CatalogService,
  revision: CatalogRevision,
  origins: readonly EntityDetailResponse[],
): Promise<{ model: SelectionConsequenceModel; entities: EntityDetailResponse[] }> {
  const preliminary = deriveDraftConsequences(draft, origins);
  const kinds = new Set<RuleEntityKind>();
  for (const choice of preliminary.origins.flatMap((origin) => origin.choices)) {
    if (choice.definition.type === "ability-allocation" || choice.definition.type === "closed-option") continue;
    const query = choice.definition.optionQuery;
    if (query.type === "entity") kinds.add(query.kind);
    else if (query.type === "spell") kinds.add("spell");
    else if (query.type === "proficiency") kinds.add(query.kind === "skill" || query.kind === "saving-throw" ? "skill" : "item");
    else kinds.add("item");
  }
  const summaries = (await Promise.all([...kinds].map(async (kind) => catalog.fetchIndex(revision, kind)))).flat();
  const originIds = new Set(origins.map((origin) => origin.id));
  const details = await Promise.all(summaries
    .filter((summary) => !originIds.has(summary.id))
    .map(async (summary) => {
      try { return (await catalog.fetchEntity(revision, summary.id, summary.detailPath)).data; }
      catch { return undefined; }
    }));
  const entities = [...origins, ...details.filter((detail): detail is EntityDetailResponse => detail !== undefined)];
  const model = deriveDraftConsequences(draft, entities);
  const itemIds = new Set(model.origins.flatMap((origin) => origin.grants)
    .filter((consequence) => consequence.grant.type === "item")
    .map((consequence) => consequence.grant.type === "item" ? consequence.grant.itemId : undefined)
    .filter((id): id is NonNullable<typeof id> => id !== undefined));
  if (itemIds.size === 0) return { model, entities };
  const itemIndex = await catalog.fetchIndex(revision, "item");
  const itemSummaries = new Map(itemIndex.map((summary) => [summary.id, summary]));
  const requiredItems = [...itemIds].map((itemId) => {
    const summary = itemSummaries.get(itemId);
    if (summary === undefined) throw new RequiredCatalogEntityLoadError(String(itemId), "missing-from-index");
    return summary;
  });
  const itemDetails = await Promise.all(requiredItems.map(async (summary) => {
    let detail: EntityDetailResponse;
    try {
      detail = (await catalog.fetchEntity(revision, summary.id, summary.detailPath)).data;
    } catch {
      throw new RequiredCatalogEntityLoadError(summary.id, "detail-unavailable");
    }
    if (!isItemRule(detail) || detail.id !== summary.id) {
      throw new RequiredCatalogEntityLoadError(summary.id, "invalid-item-detail");
    }
    return detail;
  }));
  const completeEntities = [...entities, ...itemDetails];
  return { model: deriveDraftConsequences(draft, completeEntities), entities: completeEntities };
}
