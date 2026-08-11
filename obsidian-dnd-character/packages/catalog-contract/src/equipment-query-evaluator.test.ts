import { describe, expect, it } from "vitest";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { createItemRule } from "./entity-item";
import { createEquipmentQuery } from "./query";
import { evaluateEquipmentQuery } from "./equipment-query-evaluator";

function item(id: string, groups: Parameters<typeof createItemRule>[20], source = "phb", access: "core" | "source" = "core") {
  return createItemRule(createEntityId(id), id, createSourceId(source), "2014", access, "adventuring-gear", [], false, [], [], [], [], [], false, undefined, undefined, undefined, undefined, undefined, undefined, groups);
}

describe("evaluateEquipmentQuery", () => {
  const artisan = item("item:2014:phb:artisan", ["artisan-tool"]);
  const instrument = item("item:2014:phb:lute", ["musical-instrument"]);
  const ungrouped = item("item:2014:phb:rope", []);
  it("preserves existing behavior when no group is supplied", () => expect(evaluateEquipmentQuery([artisan, instrument], createEquipmentQuery())).toHaveLength(2));
  it("matches a group and treats multiple requested groups as union", () => {
    expect(evaluateEquipmentQuery([artisan, instrument, ungrouped], createEquipmentQuery({ equipmentGroups: ["artisan-tool"] }))).toEqual([artisan]);
    expect(evaluateEquipmentQuery([artisan, instrument, ungrouped], createEquipmentQuery({ equipmentGroups: ["artisan-tool", "musical-instrument"] }))).toEqual([artisan, instrument]);
  });
  it("keeps source/access/category constraints conjunctive", () => {
    const sourceOnly = item("item:2014:xphb:artisan", ["artisan-tool"], "xphb", "source");
    expect(evaluateEquipmentQuery([artisan, sourceOnly], createEquipmentQuery({ equipmentGroups: ["artisan-tool"], sourceId: createSourceId("phb"), access: "core" }))).toEqual([artisan]);
  });
});
