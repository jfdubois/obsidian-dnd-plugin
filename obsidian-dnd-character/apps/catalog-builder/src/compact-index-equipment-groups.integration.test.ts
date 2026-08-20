import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EquipmentQueryIndexCompatibilityError,
  evaluateEquipmentQueryIndex,
  isCatalogItemSummary,
  type CatalogEntitySummary,
  type EquipmentGroup,
  type ItemRule,
} from "@obsidian-dnd/catalog-contract";
import { entityToSummary } from "./compact-index-builder";

const revisionRoot = resolve(process.cwd(), "apps/catalog-server/catalog/v1/revisions/5etools-3c5d9d3-b4");

function detail(id: string): ItemRule {
  return JSON.parse(readFileSync(resolve(revisionRoot, "entities/item", `${id}.json`), "utf8")) as ItemRule;
}

function classDetail(id: string): unknown {
  return JSON.parse(readFileSync(resolve(revisionRoot, "entities/class", `${id}.json`), "utf8"));
}

function publishedItemIndex(): CatalogEntitySummary[] {
  return JSON.parse(readFileSync(resolve(revisionRoot, "indexes/items.json"), "utf8")) as CatalogEntitySummary[];
}

function equipmentQueries(value: unknown): Array<{ type: "equipment"; equipmentGroups?: EquipmentGroup[] }> {
  if (typeof value !== "object" || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(equipmentQueries);
  const record = value as Record<string, unknown>;
  const own = record.type === "equipment" && Array.isArray(record.equipmentGroups)
    ? [{ type: "equipment" as const, equipmentGroups: record.equipmentGroups as EquipmentGroup[] }]
    : [];
  return [...own, ...Object.values(record).flatMap(equipmentQueries)];
}

const representatives: ReadonlyArray<readonly [EquipmentGroup, string]> = [
  ["simple-weapon", "item:2014:phb:club"],
  ["simple-melee-weapon", "item:2014:phb:club"],
  ["martial-weapon", "item:2014:phb:battleaxe"],
  ["martial-melee-weapon", "item:2014:phb:battleaxe"],
  ["holy-spellcasting-focus", "item:2014:phb:amulet"],
  ["arcane-spellcasting-focus", "item:2014:phb:arcane-focus"],
  ["druidic-spellcasting-focus", "item:2014:phb:druidic-focus"],
  ["artisan-tool", "item:2014:phb:alchemist%27s-supplies"],
  ["musical-instrument", "item:2014:phb:bagpipes"],
  ["gaming-set", "item:2014:phb:dice-set"],
];

describe("compact item-index equipment-group projection", () => {
  it.each(representatives)("projects %s from the normalized item rule without reinterpretation", (group, id) => {
    const normalized = detail(id);
    const diagnostics: Parameters<typeof entityToSummary>[1] = [];
    const summary = entityToSummary(normalized, diagnostics);
    expect(diagnostics).toEqual([]);
    expect(isCatalogItemSummary(summary)).toBe(true);
    if (!isCatalogItemSummary(summary)) throw new Error("Expected item compact-index summary");
    expect(normalized.equipmentGroups).toContain(group);
    expect(summary.equipmentGroups).toEqual(normalized.equipmentGroups);
  });

  it("evaluates emitted Paladin and Monk query shapes from summaries alone", () => {
    const summaries = representatives.map(([, id]) => entityToSummary(detail(id), []));
    expect(summaries.every(isCatalogItemSummary)).toBe(true);
    const itemSummaries = summaries.filter(isCatalogItemSummary);
    const queries = [
      ...equipmentQueries(classDetail("class:2014:phb:paladin")),
      ...equipmentQueries(classDetail("class:2014:phb:monk")),
      ...equipmentQueries(classDetail("class:2024:xphb:monk")),
    ];
    expect(queries.map((query) => query.equipmentGroups)).toEqual(expect.arrayContaining([
      ["holy-spellcasting-focus"], ["simple-weapon"], ["musical-instrument", "artisan-tool"],
    ]));
    for (const query of queries) {
      expect(evaluateEquipmentQueryIndex(itemSummaries, query).length).toBeGreaterThan(0);
    }
  });

  it("returns the stable compatibility diagnostic for the immutable pre-v4 b4 item index", () => {
    const paladinQuery = equipmentQueries(classDetail("class:2014:phb:paladin"))[0];
    if (paladinQuery === undefined) throw new Error("Expected a Paladin equipment query");
    try {
      evaluateEquipmentQueryIndex(publishedItemIndex(), paladinQuery, { ruleset: "2014" });
      throw new Error("Expected compact-index compatibility diagnostic");
    } catch (error) {
      expect(error).toBeInstanceOf(EquipmentQueryIndexCompatibilityError);
      expect((error as EquipmentQueryIndexCompatibilityError).code).toBe("EQUIPMENT_QUERY_INDEX_METADATA_UNAVAILABLE");
    }
  });
});
