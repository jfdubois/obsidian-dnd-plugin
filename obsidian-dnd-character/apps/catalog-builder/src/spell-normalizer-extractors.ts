import type { RenderNode } from "@obsidian-dnd/catalog-contract";

/* ── School code mapping ───────────────────────────────────────── */

const SCHOOL_CODE_MAP: ReadonlyMap<string, string> = new Map([
  ["A", "abjuration"],
  ["C", "conjuration"],
  ["D", "divination"],
  ["E", "enchantment"],
  ["I", "illusion"],
  ["N", "necromancy"],
  ["T", "transmutation"],
  ["V", "evocation"],
]);

export function mapSchoolCode(code: string): string | undefined {
  return SCHOOL_CODE_MAP.get(code);
}

/* ── Casting time extraction ───────────────────────────────────── */

export function extractCastingTime(remaining: Record<string, unknown>): string | undefined {
  const time = remaining.time;
  if (!Array.isArray(time) || time.length === 0) {
    return undefined;
  }

  const first = time[0];
  if (typeof first !== "object" || first === null) {
    return undefined;
  }

  const t = first as Record<string, unknown>;

  // Handle special casting times (e.g., "reaction")
  if (t.type === "special" && typeof t.text === "string") {
    return t.text;
  }

  // Handle standard casting times
  if (typeof t.number === "number" && typeof t.unit === "string") {
    let unit = t.unit;
    // Map "bonus" to "bonus action" (5eTools shorthand)
    if (unit === "bonus") {
      unit = "bonus action";
    }
    let result = `${t.number} ${unit}`;
    // Append condition text for reaction spells
    if (unit === "reaction" && typeof t.condition === "string" && t.condition.length > 0) {
      result += ` (${t.condition})`;
    }
    return result;
  }

  return undefined;
}

/* ── Range extraction ──────────────────────────────────────────── */

export function extractRange(remaining: Record<string, unknown>): string | undefined {
  const range = remaining.range;
  if (typeof range !== "object" || range === null) {
    return undefined;
  }

  const r = range as Record<string, unknown>;

  // Handle self range
  if (r.type === "self") {
    return "Self";
  }

  // Handle touch range
  if (r.type === "touch") {
    return "Touch";
  }

  // Handle point/other ranges with distance
  if (typeof r.type === "string" && r.distance !== undefined) {
    const distance = r.distance;
    if (typeof distance === "object" && distance !== null) {
      const d = distance as Record<string, unknown>;

      // Handle self range inside distance object (e.g., Detect Magic PHB)
      if (d.type === "self") {
        return "Self";
      }

      // Handle touch range inside distance object (e.g., Tongues PHB)
      if (d.type === "touch") {
        return "Touch";
      }

      // Handle numeric distance (e.g., "150 feet")
      if (typeof d.amount === "number" && typeof d.type === "string") {
        return `${d.amount} ${d.type}`;
      }
    }
  }

  return undefined;
}

/* ── Duration extraction ───────────────────────────────────────── */

export function extractDuration(remaining: Record<string, unknown>): string | undefined {
  const duration = remaining.duration;
  if (!Array.isArray(duration) || duration.length === 0) {
    return undefined;
  }

  const first = duration[0];
  if (typeof first !== "object" || first === null) {
    return undefined;
  }

  const d = first as Record<string, unknown>;

  // Handle instantaneous
  if (d.type === "instant") {
    return "Instantaneous";
  }

  // Handle permanent
  if (d.type === "permanent") {
    return "Until dispelled";
  }

  // Handle special duration
  if (d.type === "special" && typeof d.text === "string") {
    return d.text;
  }

  // Handle timed duration
  if (d.type === "timed" && d.duration !== undefined) {
    const timed = d.duration;
    if (typeof timed === "object" && timed !== null) {
      const td = timed as Record<string, unknown>;
      if (typeof td.amount === "number" && typeof td.type === "string") {
        // Pluralize if amount > 1
        const unit = td.amount === 1 ? td.type : `${td.type}s`;
        return `${td.amount} ${unit}`;
      }
    }
  }

  return undefined;
}

/* ── Concentration detection ───────────────────────────────────── */

export function extractConcentration(remaining: Record<string, unknown>): boolean {
  const duration = remaining.duration;
  if (!Array.isArray(duration) || duration.length === 0) {
    return false;
  }

  const first = duration[0];
  if (typeof first !== "object" || first === null) {
    return false;
  }

  const d = first as Record<string, unknown>;
  return d.concentration === true;
}

/* ── Ritual detection ──────────────────────────────────────────── */

export function extractRitual(remaining: Record<string, unknown>): boolean {
  const meta = remaining.meta;
  if (typeof meta !== "object" || meta === null) {
    return false;
  }

  const m = meta as Record<string, unknown>;
  return m.ritual === true;
}

/* ── Content extraction ────────────────────────────────────────── */

export function extractContent(remaining: Record<string, unknown>): RenderNode[] {
  const content: RenderNode[] = [];

  // Extract from entries (array of strings or objects in spell data)
  const entries = remaining.entries;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry === "string" && entry.length > 0) {
        content.push({ type: "paragraph", text: entry });
      } else if (typeof entry === "object" && entry !== null) {
        const e = entry as Record<string, unknown>;
        // Handle "entries" type objects (e.g., "Aquatic Adaptation" subsections)
        if (e.type === "entries" && typeof e.name === "string") {
          content.push({ type: "heading", level: 3, text: e.name });
          // Process nested entries
          if (Array.isArray(e.entries)) {
            for (const nested of e.entries) {
              if (typeof nested === "string" && nested.length > 0) {
                content.push({ type: "paragraph", text: nested });
              }
            }
          }
        } else if (e.type === "paragraph" && typeof e.text === "string") {
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

/* ── Higher-level effects extraction ───────────────────────────── */

export function extractHigherLevelEffects(remaining: Record<string, unknown>): RenderNode[] | undefined {
  const entriesHigherLevel = remaining.entriesHigherLevel;
  if (!Array.isArray(entriesHigherLevel) || entriesHigherLevel.length === 0) {
    return undefined;
  }

  const effects: RenderNode[] = [];

  for (const entry of entriesHigherLevel) {
    if (typeof entry === "string" && entry.length > 0) {
      effects.push({ type: "paragraph", text: entry });
    } else if (typeof entry === "object" && entry !== null) {
      const e = entry as Record<string, unknown>;
      // Handle heading first
      if (typeof e.name === "string" && e.name.length > 0) {
        effects.push({ type: "heading", level: 3, text: e.name });
      }
      // Then handle nested entries structure
      if (Array.isArray(e.entries)) {
        for (const nested of e.entries) {
          if (typeof nested === "string" && nested.length > 0) {
            effects.push({ type: "paragraph", text: nested });
          }
        }
      }
    }
  }

  return effects.length > 0 ? effects : undefined;
}

/* ── Page extraction ───────────────────────────────────────────── */

export function extractPage(remaining: Record<string, unknown>): number | undefined {
  const page = remaining.page;
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return page;
  }
  return undefined;
}

/* ── Summary extraction ────────────────────────────────────────── */

export function extractSummary(remaining: Record<string, unknown>): string | undefined {
  const summary = remaining.summary;
  if (typeof summary === "string" && summary.length > 0) {
    return summary;
  }
  return undefined;
}

/* ── Level extraction ──────────────────────────────────────────── */

export function extractLevel(remaining: Record<string, unknown>): number | undefined {
  const level = remaining.level;
  if (typeof level === "number" && Number.isInteger(level) && level >= 0) {
    return level;
  }
  return undefined;
}
