import type { RulePrerequisite } from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import {
  createSpeciesRule,
  createBackgroundRule,
  createClassRule,
  createSubclassRule,
  createClassFeatureRule,
  createSubclassFeatureRule,
  createFeatRule,
  createSpellRule,
  createSkillRule,
  createLanguageRule,
  createLevelDefinition,
  createFeatureGrant,
} from "@obsidian-dnd/catalog-contract";

const eid = createEntityId;
const sid = createSourceId;

const PHB = sid("phb");
const R24 = "2024" as const;
const CORE = "core" as const;
const EMPTY = [] as never[];

export { eid, sid, EMPTY };

export function makeSpecies(
  id: string,
  name: string,
  languageIds: string[] = EMPTY,
  depIds: string[] = EMPTY,
  prereqs: RulePrerequisite[] = [],
) {
  return createSpeciesRule(
    eid(id), name, PHB, R24, CORE,
    "Medium", 30, false,
    languageIds.map(eid), EMPTY,
    EMPTY, prereqs, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeBackground(
  id: string,
  name: string,
  skillProficiencies: string[] = EMPTY,
  featureId: string | undefined = undefined,
  depIds: string[] = EMPTY,
) {
  return createBackgroundRule(
    eid(id), name, PHB, R24, CORE,
    skillProficiencies.map(eid),
    EMPTY, EMPTY, EMPTY, EMPTY,
    depIds.map(eid), false,
    undefined, undefined, featureId ? eid(featureId) : undefined,
  );
}

export function makeClass(
  id: string,
  name: string,
  subclassIds: string[] = EMPTY,
  levelFeatureGrants: { level: number; featureId: string }[] = EMPTY,
  depIds: string[] = EMPTY,
) {
  const levels: Record<number, ReturnType<typeof createLevelDefinition>> = {};
  for (const grant of levelFeatureGrants) {
    levels[grant.level] = createLevelDefinition(
      grant.level,
      [createFeatureGrant(eid(grant.featureId))],
    );
  }
  return createClassRule(
    eid(id), name, PHB, R24, CORE,
    8, ["STR"], EMPTY, EMPTY,
    levels, subclassIds.map(eid),
    EMPTY, EMPTY, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeSubclass(
  id: string,
  name: string,
  parentId: string,
  featureIds: string[] = EMPTY,
  depIds: string[] = EMPTY,
) {
  return createSubclassRule(
    eid(id), name, PHB, R24, CORE,
    eid(parentId), 3,
    EMPTY, EMPTY, EMPTY, EMPTY,
    depIds.map(eid), featureIds.map(eid),
    false,
  );
}

export function makeClassFeature(
  id: string,
  name: string,
  parentId: string,
  depIds: string[] = EMPTY,
) {
  return createClassFeatureRule(
    eid(id), name, PHB, R24, CORE,
    eid(parentId), 1,
    EMPTY, EMPTY, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeSubclassFeature(
  id: string,
  name: string,
  parentId: string,
  depIds: string[] = EMPTY,
) {
  return createSubclassFeatureRule(
    eid(id), name, PHB, R24, CORE,
    eid(parentId), "Fighter", 1,
    EMPTY, EMPTY, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeFeat(
  id: string,
  name: string,
  depIds: string[] = EMPTY,
  prereqs: RulePrerequisite[] = [],
) {
  return createFeatRule(
    eid(id), name, PHB, R24, CORE,
    EMPTY, prereqs, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeSpell(
  id: string,
  name: string,
  depIds: string[] = EMPTY,
  prereqs: RulePrerequisite[] = [],
) {
  return createSpellRule(
    eid(id), name, PHB, R24, CORE,
    "evocation", 1, "1 action", "60 feet", "1 minute",
    false, false, EMPTY, prereqs, EMPTY, EMPTY,
    depIds.map(eid), false,
  );
}

export function makeSkill(id: string, name: string) {
  return createSkillRule(
    eid(id), name, PHB, R24, CORE,
    EMPTY, "STR",
  );
}

export function makeLanguage(id: string, name: string) {
  return createLanguageRule(
    eid(id), name, PHB, R24, CORE,
    EMPTY, "language",
  );
}
