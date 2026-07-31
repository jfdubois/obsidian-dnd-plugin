import {
  createSpeciesRule,
  createBackgroundRule,
  createClassRule,
  createSubclassRule,
  createFeatRule,
  createSpellRule,
  createItemRule,
  createOptionalFeatureRule,
  createSkillRule,
  createLanguageRule,
  createRenderParagraph,
  createTraitDefinition,
} from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";

export const testSourceId = createSourceId("PHB");

export function makeSpecies(
  id: string,
  name: string,
  traitNames: string[],
  darkvision: boolean = false,
) {
  return createSpeciesRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    "Medium",
    30,
    darkvision,
    [],
    traitNames.map((n) => createTraitDefinition(n, [createRenderParagraph(n)])),
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
  );
}

export function makeBackground(id: string, name: string, featureId?: string) {
  return createBackgroundRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    [],
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
    undefined,
    undefined,
    featureId ? createEntityId(featureId) : undefined,
  );
}

export function makeClass(id: string, name: string, primary: string[], saves: string[]) {
  return createClassRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    10,
    primary as ("STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA")[],
    saves as ("STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA")[],
    [],
    {},
    [],
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
  );
}

export function makeSubclass(id: string, name: string, parentId: string) {
  return createSubclassRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    createEntityId(parentId),
    3,
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    [],
    false,
  );
}

export function makeFeat(id: string, name: string, ability?: string) {
  return createFeatRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
    undefined,
    undefined,
    ability ? (ability as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA") : undefined,
    undefined,
  );
}

export function makeSpell(
  id: string,
  name: string,
  school: string,
  level: number,
  ritual: boolean = false,
  concentration: boolean = false,
) {
  return createSpellRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    school,
    level,
    "1 action",
    "Self",
    "1 minute",
    concentration,
    ritual,
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
  );
}

export function makeItem(
  id: string,
  name: string,
  category: string,
  rarity?: string,
  bodySlot?: string,
) {
  return createItemRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    category as "weapon" | "armor" | "adventuring-gear" | "consumable" | "service" | "other",
    [],
    false,
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
    undefined,
    undefined,
    rarity ? (rarity as "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "artifact") : undefined,
    undefined,
    undefined,
    bodySlot ? (bodySlot as "amulet" | "armor" | "belt" | "boots" | "cloak" | "eyes" | "head" | "hands" | "ring" | "shield" | "weapon" | "wings" | "wrist") : undefined,
  );
}

export function makeOptionalFeature(id: string, name: string) {
  return createOptionalFeatureRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    [createRenderParagraph(name)],
    [],
    [],
    [],
    [],
    false,
  );
}

export function makeSkill(id: string, name: string, ability: string) {
  return createSkillRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    [createRenderParagraph(name)],
    ability as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
  );
}

export function makeLanguage(id: string, name: string, type: "language" | "script") {
  return createLanguageRule(
    createEntityId(id),
    name,
    testSourceId,
    "2024",
    "core",
    [createRenderParagraph(name)],
    type,
  );
}
