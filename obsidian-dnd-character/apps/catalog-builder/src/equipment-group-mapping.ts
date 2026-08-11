import type { EquipmentGroup } from "@obsidian-dnd/catalog-contract";

const RAW_EQUIPMENT_TYPE_GROUPS: Readonly<Record<string, EquipmentGroup>> = Object.freeze({
  toolArtisan: "artisan-tool",
  instrumentMusical: "musical-instrument",
  setGaming: "gaming-set",
  weaponSimple: "simple-weapon",
  weaponSimpleMelee: "simple-melee-weapon",
  weaponMartial: "martial-weapon",
  weaponMartialMelee: "martial-melee-weapon",
  focusSpellcastingArcane: "arcane-spellcasting-focus",
  focusSpellcastingHoly: "holy-spellcasting-focus",
  focusSpellcastingDruidic: "druidic-spellcasting-focus",
});

export function mapRawEquipmentType(value: unknown): EquipmentGroup | undefined {
  return typeof value === "string" ? RAW_EQUIPMENT_TYPE_GROUPS[value] : undefined;
}

export function mapRawEquipmentTypes(value: unknown): EquipmentGroup[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const groups = value.map(mapRawEquipmentType);
  return groups.every((group): group is EquipmentGroup => group !== undefined) ? groups : undefined;
}
