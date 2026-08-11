import type {
  Ability,
  EntityId,
  ChoiceDefinitionId,
  ResourceId,
  Ruleset,
  SourceId,
  ContentAccess,
} from "@obsidian-dnd/domain";
import {
  isAbility,
  isEntityId,
  isChoiceDefinitionId,
  isResourceId,
  isRuleset,
  isContentAccess,
} from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "./choice-definition";
import { isChoiceDefinition } from "./choice-definition";
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";
import type { RuleEffect, ValueFormula } from "./effect";
import { isRuleEffect, isValueFormula } from "./effect";
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";
import type { RuleGrant } from "./rule-grant";
import { isRuleGrant } from "./rule-grant";
import type { ExternalReference } from "./external-reference";
import { isExternalReferenceCollection } from "./external-reference";

/* ── LevelGrant discriminated union ──────────────────────────────
   Describes what a class grants at a given level. Each variant
   represents a distinct mechanical grant type.                   */

export type LevelGrant =
  | FeatureGrant
  | ChoiceGrant
  | SubclassChoiceGrant
  | AbilityScoreImprovementGrant
  | SpellProgressionGrant
  | ResourceProgressionGrant;

export interface FeatureGrant {
  type: "feature";
  featureId: EntityId;
}

export interface ChoiceGrant {
  type: "choice";
  choiceDefinitionId: ChoiceDefinitionId;
}

export interface SubclassChoiceGrant {
  type: "subclass-choice";
  choiceDefinitionId: ChoiceDefinitionId;
}

export interface AbilityScoreImprovementGrant {
  type: "ability-score-improvement";
  choiceDefinitionId: ChoiceDefinitionId;
}

export interface SpellProgressionGrant {
  type: "spell-progression";
  progression: SpellLevelGrant;
}

export interface ResourceProgressionGrant {
  type: "resource-progression";
  resourceId: ResourceId;
  maximum: ValueFormula;
}

/* ── SpellLevelGrant ─────────────────────────────────────────────
   Represents spell slot progression at a given spell level.       */

export interface SpellLevelGrant {
  spellLevel: number;
  slots: number;
  slotsPerRest?: { short: number; long: number };
}

/* ── SpellcastingProgression ─────────────────────────────────────
   Describes a class's spellcasting ability including caster level
   offset and spell level slot table.                              */

export interface SpellcastingProgression {
  casterLevel: number;
  spellLevels: Record<number, SpellLevelGrant>;
}

/* ── LevelDefinition ─────────────────────────────────────────────
   Describes all grants available at a specific character level
   within the class.                                               */

export interface LevelDefinition {
  level: number;
  grants: LevelGrant[];
}

/* ── ClassRule ───────────────────────────────────────────────────
   Complete class definition including progression table, proficiencies,
   and optional spellcasting data. Extends RuleEntity fields.      */

export interface ClassRule {
  id: EntityId;
  kind: "class";
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  page?: number;
  legacy: boolean;
  summary?: string;
  content: RenderNode[];
  prerequisites: RulePrerequisite[];
  effects: RuleEffect[];
  grants: RuleGrant[];
  choices: ChoiceDefinition[];
  dependencies: EntityId[];
  externalReferences?: ExternalReference[];
  hitDie: number;
  primaryAbilities: Ability[];
  savingThrowProficiencies: Ability[];
  startingChoices: ChoiceDefinition[];
  startingGrants: RuleGrant[];
  levels: Record<number, LevelDefinition>;
  subclassIds: EntityId[];
  spellcasting?: SpellcastingProgression;
}

/* ── LevelGrant validator ──────────────────────────────────────── */

export function isLevelGrant(value: unknown): value is LevelGrant {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "feature": {
      return isEntityId(obj.featureId);
    }
    case "choice": {
      return isChoiceDefinitionId(obj.choiceDefinitionId);
    }
    case "subclass-choice": {
      return isChoiceDefinitionId(obj.choiceDefinitionId);
    }
    case "ability-score-improvement": {
      return isChoiceDefinitionId(obj.choiceDefinitionId);
    }
    case "spell-progression": {
      return isSpellLevelGrant(obj.progression);
    }
    case "resource-progression": {
      if (!isResourceId(obj.resourceId)) return false;
      return isValueFormula(obj.maximum);
    }
    default: {
      return false;
    }
  }
}

/* ── SpellLevelGrant validator ─────────────────────────────────── */

export function isSpellLevelGrant(value: unknown): value is SpellLevelGrant {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.spellLevel !== "number" || !Number.isInteger(obj.spellLevel)) return false;
  if (obj.spellLevel < 0) return false;

  if (typeof obj.slots !== "number" || !Number.isInteger(obj.slots)) return false;
  if (obj.slots < 0) return false;

  if (obj.slotsPerRest !== undefined) {
    if (!isSlotsPerRest(obj.slotsPerRest)) return false;
  }

  return true;
}

function isSlotsPerRest(value: unknown): value is { short: number; long: number } {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.short !== "number" || !Number.isInteger(obj.short)) return false;
  if (obj.short < 0) return false;

  if (typeof obj.long !== "number" || !Number.isInteger(obj.long)) return false;
  if (obj.long < 0) return false;

  return true;
}

/* ── SpellcastingProgression validator ─────────────────────────── */

export function isSpellcastingProgression(value: unknown): value is SpellcastingProgression {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.casterLevel !== "number" || !Number.isInteger(obj.casterLevel)) return false;
  if (obj.casterLevel < 0) return false;

  if (typeof obj.spellLevels !== "object" || obj.spellLevels === null || Array.isArray(obj.spellLevels)) return false;

  const spellLevels = obj.spellLevels as Record<string, unknown>;
  for (const key of Object.keys(spellLevels)) {
    const numKey = Number(key);
    if (!Number.isInteger(numKey) || numKey < 0) return false;
    if (!isSpellLevelGrant(spellLevels[key])) return false;
  }

  return true;
}

/* ── LevelDefinition validator ─────────────────────────────────── */

export function isLevelDefinition(value: unknown): value is LevelDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.level !== "number" || !Number.isInteger(obj.level)) return false;
  if (obj.level < 1) return false;

  if (!Array.isArray(obj.grants)) return false;
  if (!obj.grants.every((g: unknown) => isLevelGrant(g))) return false;

  return true;
}

/* ── ClassRule validator ───────────────────────────────────────── */

export function isClassRule(value: unknown): value is ClassRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "class") return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isEntityId(obj.sourceId)) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (!isContentAccess(obj.access)) return false;

  if (obj.page !== undefined) {
    if (typeof obj.page !== "number" || !Number.isInteger(obj.page)) return false;
    if (obj.page < 1) return false;
  }

  if (typeof obj.legacy !== "boolean") return false;

  if (obj.summary !== undefined && typeof obj.summary !== "string") return false;

  if (!Array.isArray(obj.content)) return false;
  if (!obj.content.every((n: unknown) => isRenderNode(n))) return false;

  if (!Array.isArray(obj.prerequisites)) return false;
  if (!obj.prerequisites.every((p: unknown) => isRulePrerequisite(p))) return false;

  if (!Array.isArray(obj.effects)) return false;
  if (!obj.effects.every((e: unknown) => isRuleEffect(e))) return false;

  if (!Array.isArray(obj.grants) || !obj.grants.every((grant: unknown) => isRuleGrant(grant))) return false;

  if (!Array.isArray(obj.choices)) return false;
  if (!obj.choices.every((c: unknown) => isChoiceDefinition(c))) return false;

  if (!Array.isArray(obj.dependencies)) return false;
  if (!obj.dependencies.every((d: unknown) => isEntityId(d))) return false;
  if (obj.externalReferences !== undefined && !isExternalReferenceCollection(obj.externalReferences)) return false;

  if (typeof obj.hitDie !== "number" || !Number.isInteger(obj.hitDie)) return false;
  if (obj.hitDie < 1) return false;

  if (!Array.isArray(obj.primaryAbilities)) return false;
  if (!obj.primaryAbilities.every((a: unknown) => isAbility(a))) return false;
  if (obj.primaryAbilities.length === 0) return false;

  if (!Array.isArray(obj.savingThrowProficiencies)) return false;
  if (!obj.savingThrowProficiencies.every((a: unknown) => isAbility(a))) return false;

  if (!Array.isArray(obj.startingChoices)) return false;
  if (!obj.startingChoices.every((c: unknown) => isChoiceDefinition(c))) return false;

  if (!Array.isArray(obj.startingGrants) || !obj.startingGrants.every((grant: unknown) => isRuleGrant(grant))) return false;

  if (typeof obj.levels !== "object" || obj.levels === null || Array.isArray(obj.levels)) return false;
  const levels = obj.levels as Record<string, unknown>;
  for (const key of Object.keys(levels)) {
    const numKey = Number(key);
    if (!Number.isInteger(numKey) || numKey < 1) return false;
    if (!isLevelDefinition(levels[key])) return false;
  }

  if (!Array.isArray(obj.subclassIds)) return false;
  if (!obj.subclassIds.every((s: unknown) => isEntityId(s))) return false;

  if (obj.spellcasting !== undefined && !isSpellcastingProgression(obj.spellcasting)) return false;

  return true;
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createFeatureGrant(featureId: EntityId): FeatureGrant {
  return { type: "feature", featureId };
}

export function createChoiceGrant(choiceDefinitionId: ChoiceDefinitionId): ChoiceGrant {
  return { type: "choice", choiceDefinitionId };
}

export function createSubclassChoiceGrant(choiceDefinitionId: ChoiceDefinitionId): SubclassChoiceGrant {
  return { type: "subclass-choice", choiceDefinitionId };
}

export function createAbilityScoreImprovementGrant(choiceDefinitionId: ChoiceDefinitionId): AbilityScoreImprovementGrant {
  return { type: "ability-score-improvement", choiceDefinitionId };
}

export function createSpellProgressionGrant(progression: SpellLevelGrant): SpellProgressionGrant {
  return { type: "spell-progression", progression };
}

export function createResourceProgressionGrant(resourceId: ResourceId, maximum: ValueFormula): ResourceProgressionGrant {
  return { type: "resource-progression", resourceId, maximum };
}

export function createSpellLevelGrant(
  spellLevel: number,
  slots: number,
  slotsPerRest?: { short: number; long: number },
): SpellLevelGrant {
  return { spellLevel, slots, slotsPerRest };
}

export function createSpellcastingProgression(
  casterLevel: number,
  spellLevels: Record<number, SpellLevelGrant>,
): SpellcastingProgression {
  return { casterLevel, spellLevels };
}

export function createLevelDefinition(
  level: number,
  grants: LevelGrant[],
): LevelDefinition {
  return { level, grants: [...grants] };
}

export function createClassRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  hitDie: number,
  primaryAbilities: Ability[],
  savingThrowProficiencies: Ability[],
  startingChoices: ChoiceDefinition[],
  levels: Record<number, LevelDefinition>,
  subclassIds: EntityId[],
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
  spellcasting?: SpellcastingProgression,
  grants: RuleGrant[] = [],
  startingGrants: RuleGrant[] = [],
  externalReferences?: ExternalReference[],
): ClassRule {
  return {
    id,
    kind: "class",
    name,
    sourceId,
    ruleset,
    access,
    page,
    legacy,
    summary,
    content: [...content],
    prerequisites: [...prerequisites],
    effects: [...effects],
    grants: [...grants],
    choices: [...choices],
    dependencies: [...dependencies],
    externalReferences: externalReferences === undefined ? undefined : [...externalReferences],
    hitDie,
    primaryAbilities: [...primaryAbilities],
    savingThrowProficiencies: [...savingThrowProficiencies],
    startingChoices: [...startingChoices],
    startingGrants: [...startingGrants],
    levels,
    subclassIds: [...subclassIds],
    spellcasting,
  };
}
