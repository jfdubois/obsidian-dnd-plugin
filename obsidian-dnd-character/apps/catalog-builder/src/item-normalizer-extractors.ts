import type { RenderNode } from "@obsidian-dnd/catalog-contract";
import type { EquipmentCategory, EquipmentRarity, EquipmentBodySlot } from "@obsidian-dnd/catalog-contract";
import type { ItemCost } from "@obsidian-dnd/catalog-contract";

/* ── Content extraction ────────────────────────────────────────── */

export function extractItemContent(remaining: Record<string, unknown>): RenderNode[] {
  const content: RenderNode[] = [];

  // Try entries first (structured entries)
  const entries = remaining.entries;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      if (e.type === "paragraph" && typeof e.text === "string") {
        content.push({ type: "paragraph", text: e.text });
      } else if (e.type === "heading" && typeof e.text === "string") {
        const level = e.level;
        if (level === 2 || level === 3 || level === 4) {
          content.push({ type: "heading", level: level as 2 | 3 | 4, text: e.text });
        }
      } else if (e.type === "list" && Array.isArray(e.items)) {
        content.push({ type: "list", ordered: false, items: [] });
      } else {
        content.push({ type: "note", text: String(e.text ?? "") });
      }
    }
  }

  // Also check single entry field (some raw formats use "entry" singular)
  const entry = remaining.entry;
  if (typeof entry === "string" && entry.length > 0) {
    content.push({ type: "paragraph", text: entry });
  }

  // Fallback: description field
  const description = remaining.description;
  if (typeof description === "string" && description.length > 0) {
    content.push({ type: "paragraph", text: description });
  }

  return content;
}

/* ── Page extraction ───────────────────────────────────────────── */

export function extractItemPage(remaining: Record<string, unknown>): number | undefined {
  const page = remaining.page;
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return page;
  }
  return undefined;
}

/* ── Summary extraction ────────────────────────────────────────── */

export function extractItemSummary(remaining: Record<string, unknown>): string | undefined {
  const summary = remaining.summary;
  if (typeof summary === "string" && summary.length > 0) {
    return summary;
  }
  return undefined;
}

/* ── Category extraction ───────────────────────────────────────── */

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set([
  "weapon",
  "armor",
  "adventuring-gear",
  "consumable",
  "service",
  "other",
]);

export function extractItemCategory(remaining: Record<string, unknown>): EquipmentCategory {
  // Check "type" field first (common in 5eTools item data)
  const type = remaining.type;
  if (typeof type === "string") {
    const normalized = type.toLowerCase().trim().replace(/\s+/g, "-");
    if (KNOWN_CATEGORIES.has(normalized)) {
      return normalized as EquipmentCategory;
    }
  }

  // Check "category" field
  const category = remaining.category;
  if (typeof category === "string") {
    const normalized = category.toLowerCase().trim().replace(/\s+/g, "-");
    if (KNOWN_CATEGORIES.has(normalized)) {
      return normalized as EquipmentCategory;
    }
  }

  return "other";
}

/* ── Rarity extraction ─────────────────────────────────────────── */

const KNOWN_RARITIES: ReadonlySet<string> = new Set([
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
]);

export function extractItemRarity(remaining: Record<string, unknown>): EquipmentRarity | undefined {
  const rarity = remaining.rarity;
  if (typeof rarity === "string") {
    const normalized = rarity.toLowerCase().trim().replace(/\s+/g, "-");
    if (KNOWN_RARITIES.has(normalized)) {
      return normalized as EquipmentRarity;
    }
  }
  return undefined;
}

/* ── Cost extraction ───────────────────────────────────────────── */

export function extractItemCost(remaining: Record<string, unknown>): ItemCost | undefined {
  const cost = remaining.cost;

  // Structured cost: { amount: number, unit: string }
  if (typeof cost === "object" && cost !== null && !Array.isArray(cost)) {
    const c = cost as Record<string, unknown>;
    if (typeof c.amount === "number" && Number.isFinite(c.amount) && c.amount >= 0) {
      if (typeof c.unit === "string" && c.unit.length > 0) {
        return { amount: c.amount, unit: c.unit };
      }
    }
  }

  // String cost: "10 gp"
  if (typeof cost === "string" && cost.length > 0) {
    const parts = cost.trim().split(/\s+/);
    if (parts.length >= 2) {
      const amount = parseFloat(parts[0]!);
      if (!isNaN(amount) && amount >= 0) {
        return { amount, unit: parts.slice(1).join(" ") };
      }
    }
  }

  return undefined;
}

/* ── Weight extraction ─────────────────────────────────────────── */

export function extractItemWeight(remaining: Record<string, unknown>): number | undefined {
  const weight = remaining.weight;
  if (typeof weight === "number" && Number.isFinite(weight) && weight >= 0) {
    return weight;
  }
  return undefined;
}

/* ── Body slot extraction ──────────────────────────────────────── */

const KNOWN_BODY_SLOTS: ReadonlySet<string> = new Set([
  "amulet",
  "armor",
  "belt",
  "boots",
  "cloak",
  "eyes",
  "head",
  "hands",
  "ring",
  "shield",
  "weapon",
  "wings",
  "wrist",
]);

export function extractItemBodySlot(remaining: Record<string, unknown>): EquipmentBodySlot | undefined {
  const bodySlot = remaining.bodySlot;
  if (typeof bodySlot === "string") {
    const normalized = bodySlot.toLowerCase().trim().replace(/\s+/g, "-");
    if (KNOWN_BODY_SLOTS.has(normalized)) {
      return normalized as EquipmentBodySlot;
    }
  }
  return undefined;
}

/* ── Properties extraction ─────────────────────────────────────── */

export function extractItemProperties(remaining: Record<string, unknown>): string[] {
  const properties = remaining.properties;
  if (Array.isArray(properties)) {
    return properties
      .filter((p) => typeof p === "string" && p.length > 0)
      .map((p) => p as string);
  }
  if (typeof properties === "string" && properties.length > 0) {
    return [properties];
  }
  return [];
}

/* ── Attunement extraction ─────────────────────────────────────── */

export function extractRequiresAttunement(remaining: Record<string, unknown>): boolean {
  // Check requiresAttunement field first
  const requiresAttunement = remaining.requiresAttunement;
  if (typeof requiresAttunement === "boolean") {
    return requiresAttunement;
  }

  // Check attunement field (string or boolean)
  const attunement = remaining.attunement;
  if (typeof attunement === "boolean") {
    return attunement;
  }
  if (typeof attunement === "string") {
    const lower = attunement.toLowerCase().trim();
    if (lower === "yes" || lower === "true" || lower === "y") {
      return true;
    }
    if (lower === "no" || lower === "false" || lower === "n") {
      return false;
    }
  }

  return false;
}
