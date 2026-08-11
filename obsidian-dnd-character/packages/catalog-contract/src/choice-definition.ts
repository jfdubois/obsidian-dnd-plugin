import type { Ability, ChoiceDefinitionId, ChoiceOptionId } from "@obsidian-dnd/domain";
import { isAbility, isChoiceDefinitionId, isChoiceOptionId } from "@obsidian-dnd/domain";
import type { CatalogQuery } from "./query";
import { isCatalogQuery } from "./query";
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";
import type { RuleGrant } from "./rule-grant";
import { isRuleGrant } from "./rule-grant";

export type QueryChoiceDefinitionType =
  | "entity"
  | "skill-proficiency"
  | "tool-proficiency"
  | "language"
  | "equipment"
  | "spell"
  | "feature";

export type ChoiceDefinitionType = QueryChoiceDefinitionType | "ability-allocation" | "closed-option";

export const CHOICE_DEFINITION_TYPES: ReadonlyArray<ChoiceDefinitionType> = [
  "entity", "skill-proficiency", "tool-proficiency", "language", "equipment", "spell", "feature",
  "ability-allocation", "closed-option",
];

const QUERY_CHOICE_DEFINITION_TYPES: ReadonlyArray<QueryChoiceDefinitionType> = [
  "entity", "skill-proficiency", "tool-proficiency", "language", "equipment", "spell", "feature",
];

export function isChoiceDefinitionType(value: unknown): value is ChoiceDefinitionType {
  return CHOICE_DEFINITION_TYPES.includes(value as ChoiceDefinitionType);
}

export interface ChoiceDefinitionBase {
  id: ChoiceDefinitionId;
  label: string;
  prerequisites: RulePrerequisite[];
}

export interface QueryChoiceDefinition extends ChoiceDefinitionBase {
  type: QueryChoiceDefinitionType;
  minimum: number;
  maximum: number;
  repeatable: boolean;
  optionQuery: CatalogQuery;
}

export interface AbilityAllocationDistribution {
  bonuses: number[];
}

export interface AbilityAllocationChoiceDefinition extends ChoiceDefinitionBase {
  type: "ability-allocation";
  eligibleAbilities: Ability[];
  distributions: AbilityAllocationDistribution[];
}

export interface ChoiceOption {
  id: ChoiceOptionId;
  label: string;
  grants: RuleGrant[];
  choices: ChoiceDefinition[];
}

export interface ClosedOptionChoiceDefinition extends ChoiceDefinitionBase {
  type: "closed-option";
  minimum: number;
  maximum: number;
  repeatable: boolean;
  options: ChoiceOption[];
}

export type ChoiceDefinition = QueryChoiceDefinition | AbilityAllocationChoiceDefinition | ClosedOptionChoiceDefinition;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSelectionBounds(value: Record<string, unknown>): boolean {
  return typeof value.minimum === "number" && Number.isInteger(value.minimum) && value.minimum >= 0
    && typeof value.maximum === "number" && Number.isInteger(value.maximum) && value.maximum >= 1
    && value.minimum <= value.maximum && typeof value.repeatable === "boolean";
}

function isAbilityAllocationDistribution(value: unknown): value is AbilityAllocationDistribution {
  return typeof value === "object" && value !== null && Array.isArray((value as Record<string, unknown>).bonuses)
    && ((value as Record<string, unknown>).bonuses as unknown[]).length > 0
    && ((value as Record<string, unknown>).bonuses as unknown[]).every((bonus) => typeof bonus === "number" && Number.isInteger(bonus) && bonus > 0);
}

function distributionsAreDistinct(distributions: AbilityAllocationDistribution[]): boolean {
  const seen = new Set<string>();
  return distributions.every((distribution) => {
    const key = distribution.bonuses.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isChoiceOption(value: unknown, depth: number): value is ChoiceOption {
  if (depth > 32 || typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isChoiceOptionId(obj.id) && isNonEmptyString(obj.label)
    && Array.isArray(obj.grants) && obj.grants.every(isRuleGrant)
    && Array.isArray(obj.choices) && obj.choices.every((choice) => isChoiceDefinitionAtDepth(choice, depth + 1));
}

function isChoiceDefinitionAtDepth(value: unknown, depth: number): value is ChoiceDefinition {
  if (depth > 32 || typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isChoiceDefinitionId(obj.id) || !isNonEmptyString(obj.label) || !Array.isArray(obj.prerequisites)
    || !obj.prerequisites.every(isRulePrerequisite)) return false;
  if (QUERY_CHOICE_DEFINITION_TYPES.includes(obj.type as QueryChoiceDefinitionType)) {
    return isSelectionBounds(obj) && isCatalogQuery(obj.optionQuery);
  }
  if (obj.type === "ability-allocation") {
    return Array.isArray(obj.eligibleAbilities) && obj.eligibleAbilities.length > 0
      && obj.eligibleAbilities.every(isAbility) && new Set(obj.eligibleAbilities).size === obj.eligibleAbilities.length
      && Array.isArray(obj.distributions) && obj.distributions.length > 0
      && obj.distributions.every(isAbilityAllocationDistribution)
      && distributionsAreDistinct(obj.distributions as AbilityAllocationDistribution[]);
  }
  if (obj.type === "closed-option") {
    return isSelectionBounds(obj) && Array.isArray(obj.options)
      && obj.options.every((option) => isChoiceOption(option, depth + 1))
      && new Set((obj.options as ChoiceOption[]).map((option) => option.id)).size === obj.options.length;
  }
  return false;
}

export function isChoiceDefinition(value: unknown): value is ChoiceDefinition {
  return isChoiceDefinitionAtDepth(value, 0);
}

export function createChoiceDefinition(
  id: ChoiceDefinitionId, label: string, type: QueryChoiceDefinitionType, minimum: number, maximum: number,
  repeatable: boolean, optionQuery: CatalogQuery, prerequisites: RulePrerequisite[],
): QueryChoiceDefinition {
  return { id, label, type, minimum, maximum, repeatable, optionQuery, prerequisites: [...prerequisites] };
}

export function createAbilityAllocationChoiceDefinition(
  id: ChoiceDefinitionId, label: string, eligibleAbilities: Ability[], distributions: AbilityAllocationDistribution[],
  prerequisites: RulePrerequisite[],
): AbilityAllocationChoiceDefinition {
  return { id, label, type: "ability-allocation", eligibleAbilities: [...eligibleAbilities], distributions: distributions.map((distribution) => ({ bonuses: [...distribution.bonuses] })), prerequisites: [...prerequisites] };
}

export function createClosedOptionChoiceDefinition(
  id: ChoiceDefinitionId, label: string, minimum: number, maximum: number, repeatable: boolean,
  options: ChoiceOption[], prerequisites: RulePrerequisite[],
): ClosedOptionChoiceDefinition {
  return { id, label, type: "closed-option", minimum, maximum, repeatable, options: [...options], prerequisites: [...prerequisites] };
}
