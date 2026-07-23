import type { ChoiceDefinitionId } from "@obsidian-dnd/domain";
import { isChoiceDefinitionId } from "@obsidian-dnd/domain";
import type { CatalogQuery } from "./query";
import { isCatalogQuery } from "./query";
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";

/* ── Choice-definition type ──────────────────────────────────────
   Describes how a character selects options during creation or
   level-up. The optionQuery field determines candidate entities;
   the plugin evaluates it against QueryContext at runtime.        */

export type ChoiceDefinitionType =
  | "entity"
  | "ability"
  | "skill-proficiency"
  | "tool-proficiency"
  | "language"
  | "equipment"
  | "spell"
  | "feature";

export const CHOICE_DEFINITION_TYPES: ReadonlyArray<ChoiceDefinitionType> = [
  "entity",
  "ability",
  "skill-proficiency",
  "tool-proficiency",
  "language",
  "equipment",
  "spell",
  "feature",
];

export function isChoiceDefinitionType(value: unknown): value is ChoiceDefinitionType {
  return CHOICE_DEFINITION_TYPES.includes(value as ChoiceDefinitionType);
}

export interface ChoiceDefinition {
  id: ChoiceDefinitionId;
  label: string;
  type: ChoiceDefinitionType;
  minimum: number;
  maximum: number;
  repeatable: boolean;
  optionQuery: CatalogQuery;
  prerequisites: RulePrerequisite[];
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isChoiceDefinition(value: unknown): value is ChoiceDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isChoiceDefinitionId(obj.id)) return false;
  if (typeof obj.label !== "string" || obj.label.length === 0) return false;
  if (!isChoiceDefinitionType(obj.type)) return false;

  if (typeof obj.minimum !== "number") return false;
  if (!Number.isFinite(obj.minimum)) return false;
  if (obj.minimum < 0) return false;

  if (typeof obj.maximum !== "number") return false;
  if (!Number.isFinite(obj.maximum)) return false;
  if (obj.maximum < 1) return false;

  if (obj.minimum > obj.maximum) return false;

  if (typeof obj.repeatable !== "boolean") return false;

  if (!isCatalogQuery(obj.optionQuery)) return false;

  if (!Array.isArray(obj.prerequisites)) return false;
  if (!obj.prerequisites.every((p: unknown) => isRulePrerequisite(p))) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createChoiceDefinition(
  id: ChoiceDefinitionId,
  label: string,
  type: ChoiceDefinitionType,
  minimum: number,
  maximum: number,
  repeatable: boolean,
  optionQuery: CatalogQuery,
  prerequisites: RulePrerequisite[],
): ChoiceDefinition {
  return {
    id,
    label,
    type,
    minimum,
    maximum,
    repeatable,
    optionQuery,
    prerequisites: [...prerequisites],
  };
}
