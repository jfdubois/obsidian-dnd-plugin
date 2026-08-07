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

/**
 * Maps 5eTools item type abbreviations (from parser.js ITM_TYP_ABV__*)
 * to catalog EquipmentCategory values.
 *
 * Source: external/5etools-src/js/parser.js
 * - M = Melee Weapon
 * - R = Ranged Weapon
 * - A = Ammunition
 * - AF = Ammunition Futuristic
 * - LA = Light Armor
 * - MA = Medium Armor
 * - HA = Heavy Armor
 * - S = Shield
 * - G = Adventuring Gear
 * - T = Tool
 * - AT = Artisan Tool
 * - INS = Instrument
 * - GS = Gaming Set
 * - TAH = Tack and Harness
 * - TG = Trade Good
 * - P = Potion
 * - SC = Scroll
 * - FD = Food and Drink
 * - EXP = Explosive
 * - IDG = Illegal Drug
 * - SCF = Spellcasting Focus
 * - RD = Rod
 * - RG = Ring
 * - WD = Wand
 * - $ = Treasure
 * - $A = Treasure Art Object
 * - $C = Treasure Coinage
 * - $G = Treasure Gemstone
 * - OTH = Other
 * - GV = Generic Variant
 * - TB = Trade Bar
 * - MNT = Mount
 * - VEH = Vehicle Land
 * - AIR = Vehicle Air
 * - SHP = Vehicle Water
 * - SPC = Vehicle Space
 */
const ITEM_TYPE_TO_CATEGORY: ReadonlyMap<string, EquipmentCategory> = Object.freeze(
  new Map<string, EquipmentCategory>([
    // Weapons
    ["M", "weapon"],
    ["R", "weapon"],
    ["A", "weapon"],
    ["AF", "weapon"],
    // Armor
    ["LA", "armor"],
    ["MA", "armor"],
    ["HA", "armor"],
    ["S", "armor"],
    // Adventuring gear
    ["G", "adventuring-gear"],
    ["T", "adventuring-gear"],
    ["AT", "adventuring-gear"],
    ["INS", "adventuring-gear"],
    ["GS", "adventuring-gear"],
    ["TAH", "adventuring-gear"],
    ["TG", "adventuring-gear"],
    // Consumables
    ["P", "consumable"],
    ["SC", "consumable"],
    ["FD", "consumable"],
    ["EXP", "consumable"],
    ["IDG", "consumable"],
    // Other (magic item types, treasure, vehicles, mounts, etc.)
    ["SCF", "other"],
    ["RD", "other"],
    ["RG", "other"],
    ["WD", "other"],
    ["$", "other"],
    ["$A", "other"],
    ["$C", "other"],
    ["$G", "other"],
    ["OTH", "other"],
    ["GV", "other"],
    ["TB", "other"],
    ["MNT", "other"],
    ["VEH", "other"],
    ["AIR", "other"],
    ["SHP", "other"],
    ["SPC", "other"],
  ]),
);

/**
 * Strips the 2024 pipe-notation suffix from a type code.
 * e.g., "S|XPHB" -> "S", "MA|XDMG" -> "MA", "G" -> "G"
 */
function stripTypeSourceSuffix(typeCode: string): string {
  const pipeIndex = typeCode.indexOf("|");
  if (pipeIndex !== -1) {
    return typeCode.substring(0, pipeIndex);
  }
  return typeCode;
}

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set([
  "weapon",
  "armor",
  "adventuring-gear",
  "consumable",
  "service",
  "other",
]);

export function extractItemCategory(remaining: Record<string, unknown>): EquipmentCategory {
  // Check "type" field first (5eTools item data uses type abbreviations)
  const type = remaining.type;
  if (typeof type === "string" && type.length > 0) {
    // Strip 2024 pipe-notation suffix (e.g., "S|XPHB" -> "S")
    const baseType = stripTypeSourceSuffix(type);

    // Look up in the 5eTools type-to-category mapping
    const mapped = ITEM_TYPE_TO_CATEGORY.get(baseType);
    if (mapped !== undefined) {
      return mapped;
    }

    // Fallback: check if the type is already a normalized category name
    const normalized = type.toLowerCase().trim().replace(/\s+/g, "-");
    if (KNOWN_CATEGORIES.has(normalized)) {
      return normalized as EquipmentCategory;
    }
  }

  // Check "category" field (some formats use explicit category)
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
