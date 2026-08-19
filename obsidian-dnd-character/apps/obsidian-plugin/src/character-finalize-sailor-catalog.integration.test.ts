import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CatalogEntitySummary, EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CatalogService } from "./catalog/catalog-service";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { finalizeCharacterWithCatalogResult } from "./character-finalize";
import { loadCreatorConsequenceReadModel } from "./creator-consequence-read-model";

const catalogRoot = new URL("../../catalog-server/catalog/v1/revisions/5etools-3c5d9d3-b3/", import.meta.url);
const silkRopeId = "item:2014:phb:silk-rope-%2850-feet%29";
const revision = "5etools-3c5d9d3-b3" as never;

function entity(kind: string, id: string): EntityDetailResponse {
  return JSON.parse(readFileSync(new URL(`entities/${kind}/${id.replaceAll("%", "%25")}.json`, catalogRoot), "utf8")) as EntityDetailResponse;
}

function itemSummary(id: string): CatalogEntitySummary {
  return (JSON.parse(readFileSync(new URL("indexes/items.json", catalogRoot), "utf8")) as CatalogEntitySummary[])
    .find((summary) => summary.id === id)!;
}

function completedSailorDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2014";
  draft.identity.name = "Sailor";
  draft.identity.playerName = "Player";
  draft.identity.pronouns = "they/them";
  draft.identity.alignment = "neutral";
  draft.species.speciesId = "species:2014:phb:tiefling" as never;
  draft.background.backgroundId = "background:2014:phb:sailor" as never;
  draft.class.classId = "class:2014:phb:paladin" as never;
  draft.abilities.scores = { STR: 15, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 14 };
  for (const step of ALL_DRAFT_STEPS) markStepResolved(draft, step);
  return draft;
}

function origins(): EntityDetailResponse[] {
  return [
    entity("species", "species:2014:phb:tiefling"),
    entity("background", "background:2014:phb:sailor"),
    entity("class", "class:2014:phb:paladin"),
    entity("item", "item:2014:phb:club"),
    entity("item", "item:2014:phb:trinket"),
    entity("item", "item:2014:phb:common-clothes"),
    entity("item", "item:2014:phb:pouch"),
  ];
}

const sailorItemIds = [
  "item:2014:phb:club",
  silkRopeId,
  "item:2014:phb:trinket",
  "item:2014:phb:common-clothes",
  "item:2014:phb:pouch",
];

function catalogForItem(includeSilkRope = true, cachedSilkRope = false) {
  let networkLoads = 0;
  const fetchEntity = vi.fn(async (_revision: unknown, id: string) => {
    if (id === silkRopeId && !cachedSilkRope) networkLoads += 1;
    return { catalogRevision: revision, data: entity("item", id), cacheStatus: "fresh" };
  });
  const catalog = {
    fetchIndex: vi.fn(async (_revision: unknown, kind: string) => kind === "item"
      ? sailorItemIds.filter((id) => includeSilkRope || id !== silkRopeId).map(itemSummary)
      : []),
    fetchEntity,
  } as unknown as CatalogService;
  return { catalog, fetchEntity, networkLoads: () => networkLoads };
}

describe("catalog-backed finalization dependency hydration", () => {
  it("lazy-loads uncached Silk Rope from the active index before strict Sailor finalization", async () => {
    const summary = itemSummary(silkRopeId);
    const fixture = catalogForItem();
    const loaded = await loadCreatorConsequenceReadModel(completedSailorDraft(), fixture.catalog, revision, origins());
    const result = finalizeCharacterWithCatalogResult(completedSailorDraft(), loaded.entities, revision);

    expect(fixture.fetchEntity).toHaveBeenCalledWith(revision, silkRopeId, summary.detailPath);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.character.inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "catalog-item", itemId: silkRopeId, quantity: 1 }),
    ]));
    expect(JSON.stringify(result.character)).not.toContain("detailPath");
  });

  it("uses the catalog service's compatible cached detail without a correctness difference", async () => {
    const fixture = catalogForItem(true, true);
    const loaded = await loadCreatorConsequenceReadModel(completedSailorDraft(), fixture.catalog, revision, origins());

    expect(fixture.networkLoads()).toBe(0);
    expect(finalizeCharacterWithCatalogResult(completedSailorDraft(), loaded.entities, revision).status).toBe("success");
  });

  it("rejects an item grant genuinely absent from the active item index", async () => {
    const fixture = catalogForItem(false);

    await expect(loadCreatorConsequenceReadModel(completedSailorDraft(), fixture.catalog, revision, origins()))
      .rejects.toMatchObject({ entityId: silkRopeId, reason: "missing-from-index" });
    expect(fixture.fetchEntity).not.toHaveBeenCalled();
  });

  it("does not silently omit a required item when detail retrieval fails", async () => {
    const fixture = catalogForItem();
    fixture.fetchEntity.mockImplementation(async (_revision: unknown, id: string) => {
      if (id === silkRopeId) throw new Error("unavailable");
      return { catalogRevision: revision, data: entity("item", id), cacheStatus: "fresh" };
    });

    await expect(loadCreatorConsequenceReadModel(completedSailorDraft(), fixture.catalog, revision, origins()))
      .rejects.toMatchObject({ entityId: silkRopeId, reason: "detail-unavailable" });
  });

  it("rejects an invalid required item detail before strict finalization", async () => {
    const fixture = catalogForItem();
    fixture.fetchEntity.mockImplementation(async (_revision: unknown, id: string) => ({
      catalogRevision: revision,
      data: id === silkRopeId ? entity("background", "background:2014:phb:sailor") : entity("item", id),
      cacheStatus: "fresh",
    }));

    await expect(loadCreatorConsequenceReadModel(completedSailorDraft(), fixture.catalog, revision, origins()))
      .rejects.toMatchObject({ entityId: silkRopeId, reason: "invalid-item-detail" });
  });
});
