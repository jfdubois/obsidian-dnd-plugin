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
import type { RuleGrant } from "./rule-grant";
import { isRuleGrant } from "./rule-grant";
import type { ExternalReference } from "./external-reference";
import { isExternalReferenceCollection } from "./external-reference";

/* ── BackgroundRule ──────────────────────────────────────────────
    Complete background definition extending RuleEntity fields with
    background-specific data: skill proficiencies granted and an
    optional background feature entity reference.                 */

export interface BackgroundRule {
  id: EntityId;
  kind: "background";
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
  skillProficiencies: EntityId[];
  featureId?: EntityId;
}

/* ── BackgroundRule validator ──────────────────────────────────── */

export function isBackgroundRule(value: unknown): value is BackgroundRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "background") return false;
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

  if (!Array.isArray(obj.skillProficiencies)) return false;
  if (!obj.skillProficiencies.every((s: unknown) => isEntityId(s))) return false;

  if (obj.featureId !== undefined && !isEntityId(obj.featureId)) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createBackgroundRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  skillProficiencies: EntityId[],
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
  featureId?: EntityId,
  grants: RuleGrant[] = [],
  externalReferences?: ExternalReference[],
): BackgroundRule {
  return {
    id,
    kind: "background",
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
    skillProficiencies: [...skillProficiencies],
    featureId,
  };
}
