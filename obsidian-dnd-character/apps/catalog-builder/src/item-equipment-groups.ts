import type { EquipmentGroup } from "@obsidian-dnd/catalog-contract";

function baseType(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.split("|")[0];
}

/** Classifies only structured 5eTools item fields; names are deliberately unused. */
export function extractItemEquipmentGroups(record: Record<string, unknown>): EquipmentGroup[] {
  const groups = new Set<EquipmentGroup>();
  const type = baseType(record.type);
  if (type === "AT") groups.add("artisan-tool");
  if (type === "INS") groups.add("musical-instrument");
  if (type === "GS") groups.add("gaming-set");

  const weaponCategory = typeof record.weaponCategory === "string" ? record.weaponCategory.toLowerCase() : undefined;
  const weaponType = baseType(record.type);
  const melee = weaponType === "M";
  if (weaponCategory === "simple") {
    groups.add("simple-weapon");
    if (melee) groups.add("simple-melee-weapon");
  }
  if (weaponCategory === "martial") {
    groups.add("martial-weapon");
    if (melee) groups.add("martial-melee-weapon");
  }

  if (type === "SCF") {
    const focus = typeof record.scfType === "string" ? record.scfType.toLowerCase() : "";
    if (focus === "arcane") groups.add("arcane-spellcasting-focus");
    if (focus === "holy") groups.add("holy-spellcasting-focus");
    if (focus === "druid" || focus === "druidic") groups.add("druidic-spellcasting-focus");
  }
  return [...groups];
}
