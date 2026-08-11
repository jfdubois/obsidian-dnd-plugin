import { describe, expect, it } from "vitest";
import { extractItemEquipmentGroups } from "./item-equipment-groups";
import { mapRawEquipmentType, mapRawEquipmentTypes } from "./equipment-group-mapping";

describe("creator equipment groups", () => {
  it("maps every supported raw creator token without leaking it", () => {
    expect(mapRawEquipmentType("toolArtisan")).toBe("artisan-tool");
    expect(mapRawEquipmentType("weaponMartialMelee")).toBe("martial-melee-weapon");
    expect(mapRawEquipmentType("focusSpellcastingDruidic")).toBe("druidic-spellcasting-focus");
    expect(mapRawEquipmentType("unknown-group")).toBeUndefined();
    expect(mapRawEquipmentTypes(["instrumentMusical", "toolArtisan"])).toEqual(["musical-instrument", "artisan-tool"]);
    expect(mapRawEquipmentTypes(["toolArtisan", "unknown-group"])).toBeUndefined();
  });

  it("classifies structured item fields without using names", () => {
    expect(extractItemEquipmentGroups({ type: "AT" })).toEqual(["artisan-tool"]);
    expect(extractItemEquipmentGroups({ type: "M", weaponCategory: "simple" }))
      .toEqual(["simple-weapon", "simple-melee-weapon"]);
    expect(extractItemEquipmentGroups({ type: "SCF", scfType: "holy" }))
      .toEqual(["holy-spellcasting-focus"]);
    expect(extractItemEquipmentGroups({ type: "G", name: "Musical Instrument" })).toEqual([]);
  });
});
