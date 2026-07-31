import type { EntityId } from "@obsidian-dnd/domain";
import type {
  SpeciesRule,
  BackgroundRule,
  ClassRule,
  SubclassRule,
  ClassFeatureRule,
  SubclassFeatureRule,
} from "@obsidian-dnd/catalog-contract";
import type { NormalizedEntity } from "./reference-resolver";

/* ── Entity type guards ────────────────────────────────────────── */

export function isSpeciesRule(entity: NormalizedEntity): entity is SpeciesRule {
  return entity.kind === "species";
}

export function isBackgroundRule(entity: NormalizedEntity): entity is BackgroundRule {
  return entity.kind === "background";
}

export function isClassRule(entity: NormalizedEntity): entity is ClassRule {
  return entity.kind === "class";
}

export function isSubclassRule(entity: NormalizedEntity): entity is SubclassRule {
  return entity.kind === "subclass";
}

export function isClassFeatureRule(entity: NormalizedEntity): entity is ClassFeatureRule {
  return entity.kind === "class-feature";
}

export function isSubclassFeatureRule(entity: NormalizedEntity): entity is SubclassFeatureRule {
  return entity.kind === "subclass-feature";
}

/* ── Reference extraction per entity kind ─────────────────────────
   Each function extracts cross-entity EntityId references from the
   entity-specific fields. Common fields (dependencies, prerequisites)
   are handled in the main resolver.                                */

export function extractSpeciesReferences(
  entity: SpeciesRule,
): { field: string; targetId: EntityId }[] {
  const refs: { field: string; targetId: EntityId }[] = [];
  for (const langId of entity.languageIds) {
    refs.push({ field: "languageIds", targetId: langId });
  }
  return refs;
}

export function extractBackgroundReferences(
  entity: BackgroundRule,
): { field: string; targetId: EntityId }[] {
  const refs: { field: string; targetId: EntityId }[] = [];
  for (const skillId of entity.skillProficiencies) {
    refs.push({ field: "skillProficiencies", targetId: skillId });
  }
  if (entity.featureId !== undefined) {
    refs.push({ field: "featureId", targetId: entity.featureId });
  }
  return refs;
}

export function extractClassReferences(
  entity: ClassRule,
): { field: string; targetId: EntityId }[] {
  const refs: { field: string; targetId: EntityId }[] = [];
  for (const subclassId of entity.subclassIds) {
    refs.push({ field: "subclassIds", targetId: subclassId });
  }
  for (const levelDef of Object.values(entity.levels)) {
    for (const grant of levelDef.grants) {
      if (grant.type === "feature") {
        refs.push({ field: "levels[].featureId", targetId: grant.featureId });
      }
    }
  }
  return refs;
}

export function extractSubclassReferences(
  entity: SubclassRule,
): { field: string; targetId: EntityId }[] {
  const refs: { field: string; targetId: EntityId }[] = [];
  refs.push({ field: "parentId", targetId: entity.parentId });
  for (const featureId of entity.featureIds) {
    refs.push({ field: "featureIds", targetId: featureId });
  }
  return refs;
}

export function extractClassFeatureReferences(
  entity: ClassFeatureRule,
): { field: string; targetId: EntityId }[] {
  return [{ field: "parentId", targetId: entity.parentId }];
}

export function extractSubclassFeatureReferences(
  entity: SubclassFeatureRule,
): { field: string; targetId: EntityId }[] {
  return [{ field: "parentId", targetId: entity.parentId }];
}
