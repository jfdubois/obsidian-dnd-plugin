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

/* ── TraitDefinition ─────────────────────────────────────────────
    A named trait with renderable content. Used by SpeciesRule to
    describe species-specific traits that are not fully normalized
    into RuleEffect structures.                                  */

export interface TraitDefinition {
  name: string;
  content: RenderNode[];
}

/* ── SpeciesRule ─────────────────────────────────────────────────
    Complete species definition extending RuleEntity fields with
    species-specific mechanical data: size, speed, darkvision,
    languages, and named trait definitions.                      */

export interface SpeciesRule {
  id: EntityId;
  kind: "species";
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
  size: string;
  speed: number;
  darkvision: boolean;
  darkvisionRange?: number;
  languageIds: EntityId[];
  traitDefs: TraitDefinition[];
}

/* ── TraitDefinition validator ─────────────────────────────────── */

export function isTraitDefinition(value: unknown): value is TraitDefinition {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) return false;

  if (!Array.isArray(obj.content)) return false;
  if (!obj.content.every((n: unknown) => isRenderNode(n))) return false;

  return true;
}

/* ── SpeciesRule validator ─────────────────────────────────────── */

export function isSpeciesRule(value: unknown): value is SpeciesRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "species") return false;
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

  if (typeof obj.size !== "string" || obj.size.length === 0) return false;

  if (typeof obj.speed !== "number" || !Number.isInteger(obj.speed)) return false;
  if (obj.speed < 0) return false;

  if (typeof obj.darkvision !== "boolean") return false;

  if (obj.darkvisionRange !== undefined) {
    if (typeof obj.darkvisionRange !== "number" || !Number.isInteger(obj.darkvisionRange)) return false;
    if (obj.darkvisionRange < 0) return false;
  }

  if (!Array.isArray(obj.languageIds)) return false;
  if (!obj.languageIds.every((l: unknown) => isEntityId(l))) return false;

  if (!Array.isArray(obj.traitDefs)) return false;
  if (!obj.traitDefs.every((t: unknown) => isTraitDefinition(t))) return false;

  return true;
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createTraitDefinition(
  name: string,
  content: RenderNode[],
): TraitDefinition {
  return { name, content: [...content] };
}

export function createSpeciesRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  size: string,
  speed: number,
  darkvision: boolean,
  languageIds: EntityId[],
  traitDefs: TraitDefinition[],
  content: RenderNode[],
  prerequisites: RulePrerequisite[],
  effects: RuleEffect[],
  choices: ChoiceDefinition[],
  dependencies: EntityId[],
  legacy: boolean,
  page?: number,
  summary?: string,
  darkvisionRange?: number,
): SpeciesRule {
  return {
    id,
    kind: "species",
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
    size,
    speed,
    darkvision,
    darkvisionRange,
    languageIds: [...languageIds],
    traitDefs: traitDefs.map((t) => createTraitDefinition(t.name, t.content)),
  };
}
