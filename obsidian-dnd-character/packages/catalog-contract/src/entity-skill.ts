import type {
  Ability,
  EntityId,
  Ruleset,
  SourceId,
  ContentAccess,
} from "@obsidian-dnd/domain";
import {
  isAbility,
  isEntityId,
  isRuleset,
  isContentAccess,
} from "@obsidian-dnd/domain";
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";

/* ── SkillRule ───────────────────────────────────────────────────
    Complete skill definition extending RuleEntity fields with
    skill-specific data: the associated ability score that governs
    the skill's proficiency bonus.                                */

export interface SkillRule {
  id: EntityId;
  kind: "skill";
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  page?: number;
  summary?: string;
  content: RenderNode[];
  abilityScore: Ability;
}

/* ── SkillRule validator ───────────────────────────────────────── */

export function isSkillRule(value: unknown): value is SkillRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "skill") return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isEntityId(obj.sourceId)) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (!isContentAccess(obj.access)) return false;

  if (obj.page !== undefined) {
    if (typeof obj.page !== "number" || !Number.isInteger(obj.page)) return false;
    if (obj.page < 1) return false;
  }

  if (obj.summary !== undefined && typeof obj.summary !== "string") return false;

  if (!Array.isArray(obj.content)) return false;
  if (!obj.content.every((n: unknown) => isRenderNode(n))) return false;

  if (!isAbility(obj.abilityScore)) return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createSkillRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  content: RenderNode[],
  abilityScore: Ability,
  page?: number,
  summary?: string,
): SkillRule {
  return {
    id,
    kind: "skill",
    name,
    sourceId,
    ruleset,
    access,
    page,
    summary,
    content: [...content],
    abilityScore,
  };
}
