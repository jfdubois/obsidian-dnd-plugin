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
import type { RulePrerequisite } from "./prerequisite";
import { isRulePrerequisite } from "./prerequisite";
import type { RuleEffect } from "./effect";
import { isRuleEffect } from "./effect";
import type { ChoiceDefinition } from "./choice-definition";
import { isChoiceDefinition } from "./choice-definition";
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";

/* ── OptionalFeatureRule ─────────────────────────────────────────
    Optional-feature (variant rule) definition extending RuleEntity
    fields. Optional features represent variant rules, optional
    mechanics, and alternative systems that a DM may adopt or ignore.
    They carry narrative content and structured prerequisites but
    typically have no automated effects beyond display.              */

export interface OptionalFeatureRule {
  id: EntityId;
  kind: "optional-feature";
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
}

/* ── OptionalFeatureRule validator ─────────────────────────────── */

export function isOptionalFeatureRule(value: unknown): value is OptionalFeatureRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "optional-feature") return false;
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

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createOptionalFeatureRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
): OptionalFeatureRule {
  return {
    id,
    kind: "optional-feature",
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
  };
}
