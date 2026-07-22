import type { EntityId } from "@obsidian-dnd/domain";
import { isEntityId } from "@obsidian-dnd/domain";

/* ── Safe render nodes ──────────────────────────────────────────
   Normalized content structures that carry no raw 5eTools data
   and accept no arbitrary HTML or script. The catalog builder
   converts source entry arrays into these safe structures.       */

export type RenderNode =
  | RenderParagraphNode
  | RenderHeadingNode
  | RenderListNode
  | RenderTableNode
  | RenderReferenceNode
  | RenderDiceNode
  | RenderNoteNode;

export interface RenderParagraphNode {
  type: "paragraph";
  text: string;
}

export interface RenderHeadingNode {
  type: "heading";
  level: 2 | 3 | 4;
  text: string;
}

export interface RenderListNode {
  type: "list";
  ordered: boolean;
  items: RenderNode[][];
}

export interface RenderTableNode {
  type: "table";
  columns: string[];
  rows: string[][];
}

export interface RenderReferenceNode {
  type: "reference";
  entityId: EntityId;
  label: string;
}

export interface RenderDiceNode {
  type: "dice";
  expression: string;
  label?: string;
}

export interface RenderNoteNode {
  type: "note";
  text: string;
}

/* ── Validator ─────────────────────────────────────────────────── */

export function isRenderNode(value: unknown): value is RenderNode {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;

  if (typeof type !== "string") return false;

  switch (type) {
    case "paragraph": {
      if (typeof obj.text !== "string") return false;
      return true;
    }
    case "heading": {
      if (obj.level !== 2 && obj.level !== 3 && obj.level !== 4) return false;
      if (typeof obj.text !== "string" || obj.text.length === 0) return false;
      return true;
    }
    case "list": {
      if (typeof obj.ordered !== "boolean") return false;
      if (!Array.isArray(obj.items)) return false;
      if (!obj.items.every((item: unknown) => Array.isArray(item))) return false;
      if (!obj.items.every((item: unknown[]) => item.every((n: unknown) => isRenderNode(n)))) return false;
      return true;
    }
    case "table": {
      if (!Array.isArray(obj.columns)) return false;
      if (!obj.columns.every((c: unknown) => typeof c === "string")) return false;
      if (!Array.isArray(obj.rows)) return false;
      if (!obj.rows.every((row: unknown) => Array.isArray(row))) return false;
      if (!obj.rows.every((row: unknown[]) => row.every((c: unknown) => typeof c === "string"))) return false;
      return true;
    }
    case "reference": {
      if (!isEntityId(obj.entityId)) return false;
      if (typeof obj.label !== "string" || obj.label.length === 0) return false;
      return true;
    }
    case "dice": {
      if (typeof obj.expression !== "string" || obj.expression.length === 0) return false;
      if (obj.label !== undefined && typeof obj.label !== "string") return false;
      return true;
    }
    case "note": {
      if (typeof obj.text !== "string") return false;
      return true;
    }
    default: {
      return false;
    }
  }
}

/* ── Factories ─────────────────────────────────────────────────── */

export function createRenderParagraph(text: string): RenderParagraphNode {
  return { type: "paragraph", text };
}

export function createRenderHeading(level: 2 | 3 | 4, text: string): RenderHeadingNode {
  return { type: "heading", level, text };
}

export function createRenderListNode(ordered: boolean, items: RenderNode[][]): RenderListNode {
  return { type: "list", ordered, items: items.map((group) => [...group]) };
}

export function createRenderTableNode(columns: string[], rows: string[][]): RenderTableNode {
  return {
    type: "table",
    columns: [...columns],
    rows: rows.map((row) => [...row]),
  };
}

export function createRenderReferenceNode(entityId: EntityId, label: string): RenderReferenceNode {
  return { type: "reference", entityId, label };
}

export function createRenderDiceNode(expression: string, label?: string): RenderDiceNode {
  return { type: "dice", expression, label };
}

export function createRenderNote(text: string): RenderNoteNode {
  return { type: "note", text };
}
