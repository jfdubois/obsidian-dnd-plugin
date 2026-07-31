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
import type { RenderNode } from "./render-node";
import { isRenderNode } from "./render-node";

/* ── LanguageType ──────────────────────────────────────────────── */

export type LanguageType = "language" | "script";

export const LANGUAGE_TYPES: ReadonlyArray<LanguageType> = ["language", "script"];

export function isLanguageType(value: unknown): value is LanguageType {
  return value === "language" || value === "script";
}

/* ── LanguageRule ────────────────────────────────────────────────
    Complete language definition extending RuleEntity fields with
    language-specific data: type (language or script) and optional
    speaker type descriptor.                                      */

export interface LanguageRule {
  id: EntityId;
  kind: "language";
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  page?: number;
  summary?: string;
  content: RenderNode[];
  type: LanguageType;
  speakerType?: string;
}

/* ── LanguageRule validator ────────────────────────────────────── */

export function isLanguageRule(value: unknown): value is LanguageRule {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (obj.kind !== "language") return false;
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

  if (!isLanguageType(obj.type)) return false;

  if (obj.speakerType !== undefined && typeof obj.speakerType !== "string") return false;

  return true;
}

/* ── Factory ───────────────────────────────────────────────────── */

export function createLanguageRule(
  id: EntityId,
  name: string,
  sourceId: SourceId,
  ruleset: Ruleset,
  access: ContentAccess,
  content: RenderNode[],
  type: LanguageType,
  page?: number,
  summary?: string,
  speakerType?: string,
): LanguageRule {
  return {
    id,
    kind: "language",
    name,
    sourceId,
    ruleset,
    access,
    page,
    summary,
    content: [...content],
    type,
    speakerType,
  };
}
