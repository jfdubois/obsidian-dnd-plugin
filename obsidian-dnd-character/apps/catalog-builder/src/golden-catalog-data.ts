import type { EntityId, SourceId, Ruleset, ContentAccess } from "@obsidian-dnd/domain";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type {
  SpeciesRule,
  BackgroundRule,
  ClassRule,
  SubclassRule,
  ClassFeatureRule,
  SubclassFeatureRule,
  FeatRule,
  SpellRule,
  ItemRule,
  OptionalFeatureRule,
  SkillRule,
  LanguageRule,
  RuleEffect,
  RuleEffectMetadata,
  TraitDefinition,
  LevelDefinition,
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import {
  createSpeciesRule,
  createBackgroundRule,
  createClassRule,
  createSubclassRule,
  createClassFeatureRule,
  createSubclassFeatureRule,
  createFeatRule,
  createSpellRule,
  createItemRule,
  createOptionalFeatureRule,
  createSkillRule,
  createLanguageRule,
  createTraitDefinition,
  createLevelDefinition,
  createFeatureGrant,
  createRuleEffectMetadata,
  createAddAbilityEffect,
  createSetMovementEffect,
  createEffectPresentation,
  createEffectOrigin,
  createRenderParagraph,
  createCatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import type { CatalogableEntity } from "./compact-index-tag-generator.js";

/* ── Effect metadata factory ───────────────────────────────────── */

function createEffectMeta(
  entityId: EntityId,
  sourceId: SourceId,
  status: "full" | "partial" | "display-only" | "manual-adjudication" = "full",
  primary: "species-traits" | "class-features" | "feats" | "features-and-traits" = "features-and-traits",
  secondary: ("armor-class" | "initiative" | "movement" | "senses" | "abilities"
    | "saving-throws" | "skills" | "defenses" | "proficiencies"
    | "actions" | "attacks" | "spellcasting" | "resources" | "inventory"
    | "conditions" | "species-traits" | "class-features" | "feats" | "features-and-traits")[] = [],
): RuleEffectMetadata {
  return createRuleEffectMetadata(
    status,
    createEffectPresentation(primary, secondary),
    createEffectOrigin(entityId, sourceId, "structured"),
  );
}

/* ── Entity factories ──────────────────────────────────────────── */

export function createGoldenSpecies(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): SpeciesRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  const meta = createEffectMeta(entityId, sourceId, "full", "species-traits");
  const effects: RuleEffect[] = [
    createAddAbilityEffect(meta, "CON", 2),
    createSetMovementEffect(meta, "walk", 30),
  ];
  const traits: TraitDefinition[] = [
    createTraitDefinition("Ageless", [createRenderParagraph("You do not age.")]),
  ];
  return createSpeciesRule(
    entityId, name, sourceId, ruleset, access,
    "Medium", 30, false, [], traits,
    [createRenderParagraph(name)], [], effects, [], [], false,
  );
}

export function createGoldenBackground(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): BackgroundRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createBackgroundRule(
    entityId, name, sourceId, ruleset, access,
    [], [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenClass(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): ClassRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  const levels: Record<number, LevelDefinition> = {
    1: createLevelDefinition(1, [createFeatureGrant(createEntityId("fighter-feature-1"))]),
  };
  return createClassRule(
    entityId, name, sourceId, ruleset, access,
    10, ["STR"], ["STR", "CON"], [], levels, [],
    [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenSubclass(
  id: string,
  name: string,
  parentId: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): SubclassRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createSubclassRule(
    entityId, name, sourceId, ruleset, access,
    createEntityId(parentId), 3,
    [createRenderParagraph(name)], [], [], [], [], [], false,
  );
}

export function createGoldenClassFeature(
  id: string,
  name: string,
  parentId: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): ClassFeatureRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createClassFeatureRule(
    entityId, name, sourceId, ruleset, access, createEntityId(parentId),
    2, [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenSubclassFeature(
  id: string,
  name: string,
  parentId: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): SubclassFeatureRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createSubclassFeatureRule(
    entityId, name, sourceId, ruleset, access, createEntityId(parentId),
    name, 1, [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenFeat(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): FeatRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  const meta = createEffectMeta(entityId, sourceId, "full", "feats");
  const effects: RuleEffect[] = [
    createAddAbilityEffect(meta, "STR", 1),
  ];
  return createFeatRule(
    entityId, name, sourceId, ruleset, access,
    [createRenderParagraph(name)], [], effects, [], [], false,
  );
}

export function createGoldenSpell(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
  level: number = 1,
): SpellRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createSpellRule(
    entityId, name, sourceId, ruleset, access,
    "evocation", level, "1 action", "Self", "Instantaneous",
    false, false,
    [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenItem(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): ItemRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createItemRule(
    entityId, name, sourceId, ruleset, access,
    "weapon", [], false,
    [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenOptionalFeature(
  id: string,
  name: string,
  source: string,
  ruleset: Ruleset,
  access: ContentAccess = "core",
): OptionalFeatureRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createOptionalFeatureRule(
    entityId, name, sourceId, ruleset, access,
    [createRenderParagraph(name)], [], [], [], [], false,
  );
}

export function createGoldenSkill(
  id: string,
  name: string,
  source: string,
  abilityScore: string,
  ruleset: Ruleset = "2024",
  access: ContentAccess = "core",
): SkillRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createSkillRule(
    entityId, name, sourceId, ruleset, access,
    [createRenderParagraph(name)],
    abilityScore as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
  );
}

export function createGoldenLanguage(
  id: string,
  name: string,
  source: string,
  type: "language" | "script",
  ruleset: Ruleset = "2024",
  access: ContentAccess = "core",
): LanguageRule {
  const entityId = createEntityId(id);
  const sourceId = createSourceId(source);
  return createLanguageRule(
    entityId, name, sourceId, ruleset, access,
    [createRenderParagraph(name)],
    type,
  );
}

/* ── Full golden dataset ───────────────────────────────────────── */

export function createGoldenEntities(): CatalogableEntity[] {
  const entities: CatalogableEntity[] = [] as CatalogableEntity[];

  // Species (2024)
  entities.push(createGoldenSpecies("human-2024-phb", "Human", "PHB", "2024"));
  entities.push(createGoldenSpecies("elf-2024-phb", "Elf", "PHB", "2024"));

  // Species (2014)
  entities.push(createGoldenSpecies("human-2014-phb", "Human", "PHB", "2014"));
  entities.push(createGoldenSpecies("dwarf-2014-phb", "Dwarf", "PHB", "2014"));

  // Backgrounds
  entities.push(createGoldenBackground("soldier-2024-phb", "Soldier", "PHB", "2024"));
  entities.push(createGoldenBackground("soldier-2014-phb", "Soldier", "PHB", "2014"));

  // Classes
  entities.push(createGoldenClass("fighter-2024-phb", "Fighter", "PHB", "2024"));
  entities.push(createGoldenClass("fighter-2014-phb", "Fighter", "PHB", "2014"));

  // Subclasses
  entities.push(createGoldenSubclass("champion-2024-phb", "Champion", "fighter-2024-phb", "PHB", "2024"));

  // Class features
  entities.push(createGoldenClassFeature("fighter-feature-1-2024-phb", "Second Wind", "fighter-2024-phb", "PHB", "2024"));

  // Subclass features
  entities.push(createGoldenSubclassFeature("champion-feature-1-2024-phb", "Improved Critical", "champion-2024-phb", "PHB", "2024"));

  // Feats
  entities.push(createGoldenFeat("tough-2024-phb", "Tough", "PHB", "2024"));
  entities.push(createGoldenFeat("tough-2014-phb", "Tough", "PHB", "2014"));

  // Spells
  entities.push(createGoldenSpell("firebolt-2024-phb", "Fire Bolt", "PHB", "2024", "core", 0) as CatalogableEntity);
  entities.push(createGoldenSpell("fireball-2024-phb", "Fireball", "PHB", "2024", "core", 3) as CatalogableEntity);

  // Items
  entities.push(createGoldenItem("longsword-2024-phb", "Longsword", "PHB", "2024"));

  // Optional features
  entities.push(createGoldenOptionalFeature("variant-human-2024-phb", "Variant Human", "PHB", "2024"));

  // Skills
  entities.push(createGoldenSkill("athletics-2024-phb", "Athletics", "PHB", "STR"));
  entities.push(createGoldenSkill("stealth-2024-phb", "Stealth", "PHB", "DEX"));

  // Languages
  entities.push(createGoldenLanguage("common-2024-phb", "Common", "PHB", "language"));
  entities.push(createGoldenLanguage("dwarvish-2024-phb", "Dwarvish", "PHB", "language"));

  return entities;
}

/* ── Summary factory for golden entities ───────────────────────── */

export function createGoldenSummary(entity: CatalogableEntity, tags: string[], detailPath: string): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    sourceId: entity.sourceId,
    ruleset: entity.ruleset,
    access: entity.access,
    legacy: "legacy" in entity ? entity.legacy : false,
    tags,
    detailPath,
  });
}
