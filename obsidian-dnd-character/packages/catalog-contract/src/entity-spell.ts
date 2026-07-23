import type {
  EntityId,
  Ruleset,
  SourceId,
  ContentAccess,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isRuleset,
  isContentAccess,
} from "@obsidian-dnd/domain";
import type { ChoiceDefinition } from "./choice-definition";
import { isChoiceDefinition } from "./choice-definition";
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";
import type { RuleEffect } from "./effect";
import { isRuleEffect } from "./effect";
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";

/* ── SpellRule ───────────────────────────────────────────────────
    Complete spell definition extending RuleEntity fields with
    spell-specific metadata: school, level, casting time, range,
    duration, concentration flag, ritual flag, and higher-level
    effect descriptions.                                         */

export interface SpellRule {
  id: EntityId;
  kind: "spell";
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
  choices: ChoiceDefinition[];
  dependencies: EntityId[];
  school: string;
  level: number;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  higherLevelEffects?: RenderNode[];
}

/* ── SpellRule validator ───────────────────────────────────────── */

export function isSpellRule(value: unknown): value is SpellRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "spell") return false;
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

  if (!Array.isArray(obj.choices)) return false;
  if (!obj.choices.every((c: unknown) => isChoiceDefinition(c))) return false;

  if (!Array.isArray(obj.dependencies)) return false;
  if (!obj.dependencies.every((d: unknown) => isEntityId(d))) return false;

  if (typeof obj.school !== "string" || obj.school.length === 0) return false;

  if (typeof obj.level !== "number" || !Number.isInteger(obj.level)) return false;
  if (obj.level < 0) return false;

  if (typeof obj.castingTime !== "string" || obj.castingTime.length === 0) return false;

  if (typeof obj.range !== "string" || obj.range.length === 0) return false;

  if (typeof obj.duration !== "string" || obj.duration.length === 0) return false;

  if (typeof obj.concentration !== "boolean") return false;

  if (typeof obj.ritual !== "boolean") return false;

  if (obj.higherLevelEffects !== undefined) {
    if (!Array.isArray(obj.higherLevelEffects)) return false;
    if (!obj.higherLevelEffects.every((n: unknown) => isRenderNode(n))) return false;
  }

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createSpellRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  school: string,
  level: number,
  castingTime: string,
  range: string,
  duration: string,
  concentration: boolean,
  ritual: boolean,
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
  higherLevelEffects?: RenderNode[],
): SpellRule {
  return {
    id,
    kind: "spell",
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
    choices: [...choices],
    dependencies: [...dependencies],
    school,
    level,
    castingTime,
    range,
    duration,
    concentration,
    ritual,
    higherLevelEffects: higherLevelEffects ? [...higherLevelEffects] : undefined,
  };
}
