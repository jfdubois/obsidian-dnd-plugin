import { describe, expect, it } from "vitest";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { createCatalogItemSummary, type CatalogEntitySummary, type CatalogItemSummary } from "./entity-summary";
import { EquipmentQueryIndexCompatibilityError, evaluateEquipmentQueryIndex } from "./equipment-query-evaluator";
import { createEquipmentQuery } from "./query";

function item(
  id: string,
  groups: readonly ("artisan-tool" | "musical-instrument" | "simple-weapon")[],
  overrides: Partial<Pick<CatalogItemSummary, "ruleset" | "sourceId" | "access">> = {},
): CatalogItemSummary {
  return createCatalogItemSummary({
    id: createEntityId(id), kind: "item", name: id, sourceId: overrides.sourceId ?? createSourceId("phb"), ruleset: overrides.ruleset ?? "2014",
    access: overrides.access ?? "core", legacy: true, tags: ["other"], detailPath: `entities/item/${id}.json`, equipmentGroups: [...groups],
  });
}

describe("evaluateEquipmentQueryIndex", () => {
  const artisan = item("item:2014:phb:artisan-tools", ["artisan-tool"]);
  const instrument = item("item:2014:phb:lute", ["musical-instrument"]);
  const weapon = item("item:2014:phb:club", ["simple-weapon"]);

  it("filters normalized item index metadata without accepting item details", () => {
    const result = evaluateEquipmentQueryIndex(
      [artisan, instrument, weapon],
      createEquipmentQuery({ equipmentGroups: ["artisan-tool", "musical-instrument"] }),
      { ruleset: "2014" },
    );
    expect(result.map((entry) => entry.id)).toEqual([artisan.id, instrument.id]);
  });

  it("rejects an old item index without equipment groups instead of falling back to details", () => {
    const { equipmentGroups: _equipmentGroups, ...legacyItem } = artisan as CatalogEntitySummary & { equipmentGroups: string[] };
    try {
      evaluateEquipmentQueryIndex([legacyItem], createEquipmentQuery({ equipmentGroups: ["artisan-tool"] }));
      throw new Error("Expected compact-index compatibility diagnostic");
    } catch (error) {
      expect(error).toBeInstanceOf(EquipmentQueryIndexCompatibilityError);
      expect((error as EquipmentQueryIndexCompatibilityError).code).toBe("EQUIPMENT_QUERY_INDEX_METADATA_UNAVAILABLE");
    }
  });

  it("rejects EquipmentQuery fields not represented by the compact item index", () => {
    try {
      evaluateEquipmentQueryIndex([artisan], createEquipmentQuery({ category: "weapon" }));
      throw new Error("Expected compact-index compatibility diagnostic");
    } catch (error) {
      expect(error).toBeInstanceOf(EquipmentQueryIndexCompatibilityError);
      expect((error as EquipmentQueryIndexCompatibilityError).code).toBe("EQUIPMENT_QUERY_INDEX_METADATA_UNAVAILABLE");
    }
  });

  it("applies ruleset, optional-source, core-access, and group filters conjunctively", () => {
    const from2024 = item("item:2024:xphb:artisan-tools", ["artisan-tool"], { ruleset: "2024", sourceId: createSourceId("xphb") });
    const disabledSource = item("item:2014:dmg:artisan-tools", ["artisan-tool"], { sourceId: createSourceId("dmg"), access: "source" });
    const coreWithoutSourceEnablement = item("item:2014:phb:core-tools", ["artisan-tool"]);
    const query = createEquipmentQuery({ equipmentGroups: ["artisan-tool"] });
    expect(evaluateEquipmentQueryIndex([artisan, from2024, disabledSource, coreWithoutSourceEnablement], query, { ruleset: "2014" }))
      .toEqual([artisan, coreWithoutSourceEnablement]);
    expect(evaluateEquipmentQueryIndex([artisan, from2024], query, { ruleset: "2024" }))
      .toEqual([from2024]);
    expect(evaluateEquipmentQueryIndex([disabledSource], query, { ruleset: "2014", enabledSourceIds: [createSourceId("dmg")] }))
      .toEqual([disabledSource]);
  });

  it("returns zero candidates for valid metadata rather than a compatibility diagnostic", () => {
    expect(evaluateEquipmentQueryIndex([artisan], createEquipmentQuery({ equipmentGroups: ["simple-weapon"] }))).toEqual([]);
  });

  it("has no detail-loader input or detail-fetch fallback", () => {
    const result = evaluateEquipmentQueryIndex([artisan], createEquipmentQuery({ equipmentGroups: ["artisan-tool"] }));
    expect(result).toEqual([artisan]);
    expect(Object.keys(result[0]!).sort()).toEqual(["access", "detailPath", "equipmentGroups", "id", "kind", "legacy", "name", "ruleset", "sourceId", "tags"]);
  });
});
