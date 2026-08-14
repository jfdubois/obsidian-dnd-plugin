import type { Character } from "@obsidian-dnd/character-contract";
import type {
  BackgroundRule,
  ClassFeatureRule,
  ClassRule,
  EntityDetailResponse,
  FeatRule,
  ItemRule,
  OptionalFeatureRule,
  SkillRule,
  SpeciesRule,
  SpellRule,
  SubclassFeatureRule,
  SubclassRule,
} from "@obsidian-dnd/catalog-contract";
import type { EntityId } from "@obsidian-dnd/domain";
import {
  buildCharacterSheetProjection,
  type CatalogLookup,
  type CharacterSheetProjection,
} from "@obsidian-dnd/rules-engine";

/**
 * Builds the smallest catalog lookup needed by the deterministic rules
 * engine from already validated creator catalog details. It is disposable
 * and never copied to a character document.
 */
export function createCreatorCatalogLookup(
  entities: readonly EntityDetailResponse[],
): CatalogLookup {
  const species = new Map<EntityId, SpeciesRule>();
  const backgrounds = new Map<EntityId, BackgroundRule>();
  const classes = new Map<EntityId, ClassRule>();
  const classFeatures = new Map<EntityId, ClassFeatureRule>();
  const subclasses = new Map<EntityId, SubclassRule>();
  const subclassFeatures = new Map<EntityId, SubclassFeatureRule>();
  const feats = new Map<EntityId, FeatRule>();
  const spells = new Map<EntityId, SpellRule>();
  const items = new Map<EntityId, ItemRule>();
  const optionalFeatures = new Map<EntityId, OptionalFeatureRule>();
  const skills = new Map<EntityId, SkillRule>();

  for (const entity of entities) {
    switch (entity.kind) {
      case "species": species.set(entity.id, entity); break;
      case "background": backgrounds.set(entity.id, entity); break;
      case "class": classes.set(entity.id, entity); break;
      case "class-feature": classFeatures.set(entity.id, entity); break;
      case "subclass": subclasses.set(entity.id, entity); break;
      case "subclass-feature": subclassFeatures.set(entity.id, entity); break;
      case "feat": feats.set(entity.id, entity); break;
      case "spell": spells.set(entity.id, entity); break;
      case "item": items.set(entity.id, entity); break;
      case "optional-feature": optionalFeatures.set(entity.id, entity); break;
      case "skill": skills.set(entity.id, entity); break;
      case "language": break;
    }
  }

  return {
    getSpecies: (id) => species.get(id),
    getBackground: (id) => backgrounds.get(id),
    getClass: (id) => classes.get(id),
    getClassFeature: (id) => classFeatures.get(id),
    getSubclass: (id) => subclasses.get(id),
    getSubclassFeature: (id) => subclassFeatures.get(id),
    getFeat: (id) => feats.get(id),
    getSpell: (id) => spells.get(id),
    getItem: (id) => items.get(id),
    getOptionalFeature: (id) => optionalFeatures.get(id),
    getSkill: (id) => skills.get(id),
  };
}

/** Runs the one production rules-engine path shared by creator review/save. */
export function deriveCreatorCharacterState(
  character: Character,
  entities: readonly EntityDetailResponse[],
): CharacterSheetProjection {
  return buildCharacterSheetProjection(character, createCreatorCatalogLookup(entities));
}
