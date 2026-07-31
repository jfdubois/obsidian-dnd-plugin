import type {
  SpeciesRule,
  BackgroundRule,
  ClassRule,
  SubclassRule,
  FeatRule,
  SpellRule,
  ItemRule,
  OptionalFeatureRule,
  SkillRule,
  LanguageRule,
} from "@obsidian-dnd/catalog-contract";

/* ── Union type for all catalogable entity kinds ────────────────── */

export type CatalogableEntity =
  | SpeciesRule
  | BackgroundRule
  | ClassRule
  | SubclassRule
  | FeatRule
  | SpellRule
  | ItemRule
  | OptionalFeatureRule
  | SkillRule
  | LanguageRule;

/* ── Tag generators ────────────────────────────────────────────── */

export function generateSpeciesTags(entity: SpeciesRule): string[] {
  const tags: string[] = [];

  for (const trait of entity.traitDefs) {
    const tag = trait.name.toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  if (entity.darkvision) {
    tags.push("darkvision");
  }

  return tags;
}

export function generateBackgroundTags(entity: BackgroundRule): string[] {
  const tags: string[] = [];

  if (entity.featureId) {
    tags.push(entity.featureId.toLowerCase());
  }

  return tags;
}

export function generateClassTags(entity: ClassRule): string[] {
  const tags: string[] = [];

  for (const ability of entity.primaryAbilities) {
    tags.push(ability.toLowerCase());
  }

  for (const ability of entity.savingThrowProficiencies) {
    tags.push(`${ability.toLowerCase()}-save`);
  }

  return tags;
}

export function generateSubclassTags(entity: SubclassRule): string[] {
  const tags: string[] = [];

  tags.push(entity.parentId.toLowerCase());

  return tags;
}

export function generateFeatTags(entity: FeatRule): string[] {
  const tags: string[] = [];

  if (entity.abilityScorePrerequisite) {
    tags.push(entity.abilityScorePrerequisite.toLowerCase());
  }

  return tags;
}

export function generateSpellTags(entity: SpellRule): string[] {
  const tags: string[] = [];

  if (entity.school) {
    tags.push(entity.school.toLowerCase());
  }

  if (entity.level === 0) {
    tags.push("cantrip");
  } else {
    const ordinals = ["", "1st", "2nd", "3rd", "4th", "5th"];
    const ordinal = ordinals[entity.level] ?? `${entity.level}th`;
    tags.push(`${ordinal}-level`);
  }

  if (entity.ritual) {
    tags.push("ritual");
  }

  if (entity.concentration) {
    tags.push("concentration");
  }

  return tags;
}

export function generateItemTags(entity: ItemRule): string[] {
  const tags: string[] = [];

  if (entity.category) {
    tags.push(entity.category.toLowerCase());
  }

  if (entity.rarity) {
    tags.push(entity.rarity.toLowerCase());
  }

  if (entity.bodySlot) {
    tags.push(entity.bodySlot.toLowerCase());
  }

  return tags;
}

export function generateOptionalFeatureTags(_entity: OptionalFeatureRule): string[] {
  return [];
}

export function generateSkillTags(entity: SkillRule): string[] {
  const tags: string[] = [];

  tags.push(entity.abilityScore.toLowerCase());

  return tags;
}

export function generateLanguageTags(entity: LanguageRule): string[] {
  const tags: string[] = [];

  tags.push(entity.type.toLowerCase());

  return tags;
}

/* ── Tag generation dispatcher ─────────────────────────────────── */

export function generateTags(entity: CatalogableEntity): string[] {
  switch (entity.kind) {
    case "species":
      return generateSpeciesTags(entity);
    case "background":
      return generateBackgroundTags(entity);
    case "class":
      return generateClassTags(entity);
    case "subclass":
      return generateSubclassTags(entity);
    case "feat":
      return generateFeatTags(entity);
    case "spell":
      return generateSpellTags(entity);
    case "item":
      return generateItemTags(entity);
    case "optional-feature":
      return generateOptionalFeatureTags(entity);
    case "skill":
      return generateSkillTags(entity);
    case "language":
      return generateLanguageTags(entity);
    default:
      return [];
  }
}
