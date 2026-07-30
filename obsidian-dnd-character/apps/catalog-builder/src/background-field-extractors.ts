import type { EntityId } from "@obsidian-dnd/domain";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

/* ── Content extraction ────────────────────────────────────────── */

export function extractContent(remaining: Record<string, unknown>): RenderNode[] {
  const content: RenderNode[] = [];

  const entries = remaining.entries;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry === "string" && entry.length > 0) {
        content.push({ type: "paragraph", text: entry });
      } else if (typeof entry === "object" && entry !== null) {
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
        } else if (typeof e.name === "string" && e.name.length > 0) {
          // Feature-like entry: { name: "Feature Name", entries: [...] }
          content.push({ type: "heading", level: 3, text: e.name });
          const nested = e.entries;
          if (Array.isArray(nested)) {
            for (const nestedEntry of nested) {
              if (typeof nestedEntry === "string" && nestedEntry.length > 0) {
                content.push({ type: "paragraph", text: nestedEntry });
              } else if (typeof nestedEntry === "object" && nestedEntry !== null) {
                const ne = nestedEntry as Record<string, unknown>;
                if (typeof ne.text === "string" && ne.text.length > 0) {
                  content.push({ type: "paragraph", text: ne.text });
                }
              }
            }
          }
        } else {
          content.push({ type: "note", text: String(e.text ?? "") });
        }
      }
    }
  }

  const description = remaining.description;
  if (typeof description === "string" && description.length > 0) {
    content.push({ type: "paragraph", text: description });
  }

  return content;
}

/* ── Skill proficiency extraction ──────────────────────────────── */

export interface SkillExtractResult {
  readonly skillIds: EntityId[];
  readonly unmapped: string[];
}

export function extractSkillProficiencies(
  remaining: Record<string, unknown>,
  ruleset: string,
  source: string,
): SkillExtractResult {
  const skillIds: EntityId[] = [];
  const unmapped: string[] = [];

  const rawSkills = remaining.skillProficiencies;
  if (!Array.isArray(rawSkills) || rawSkills.length === 0) {
    return { skillIds, unmapped };
  }

  for (const entry of rawSkills) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      unmapped.push(String(entry));
      continue;
    }

    const entryObj = entry as Record<string, unknown>;
    const keys = Object.keys(entryObj);
    if (keys.length !== 1) {
      unmapped.push(JSON.stringify(entryObj));
      continue;
    }

    const skillName = keys[0];
    if (skillName === undefined) {
      unmapped.push(JSON.stringify(entryObj));
      continue;
    }
    const value = entryObj[skillName];
    if (value !== true && value !== 1) {
      unmapped.push(`${skillName}=${String(value)}`);
      continue;
    }

    // Attempt to create canonical entity ID for the skill
    const idResult = createCanonicalEntityId({
      kind: "skill",
      ruleset: ruleset as "2014" | "2024",
      source,
      name: skillName,
    });

    if (idResult.ok) {
      skillIds.push(idResult.id);
    } else {
      unmapped.push(skillName);
    }
  }

  return { skillIds, unmapped };
}

/* ── Feature ID extraction ─────────────────────────────────────── */

export function extractFeatureId(
  remaining: Record<string, unknown>,
  ruleset: string,
  source: string,
): { readonly featureId?: EntityId; readonly unmapped: boolean } {
  // Check for a single feature string
  const feature = remaining.feature;
  if (typeof feature === "string" && feature.length > 0) {
    const idResult = createCanonicalEntityId({
      kind: "optional-feature",
      ruleset: ruleset as "2014" | "2024",
      source,
      name: feature,
    });
    if (idResult.ok) {
      return { featureId: idResult.id, unmapped: false };
    }
    return { featureId: undefined, unmapped: true };
  }

  // Check for features array with a single entry
  const features = remaining.features;
  if (Array.isArray(features) && features.length === 1) {
    const first = features[0];
    if (typeof first === "string" && first.length > 0) {
      const idResult = createCanonicalEntityId({
        kind: "optional-feature",
        ruleset: ruleset as "2014" | "2024",
        source,
        name: first,
      });
      if (idResult.ok) {
        return { featureId: idResult.id, unmapped: false };
      }
      return { featureId: undefined, unmapped: true };
    }
    if (typeof first === "object" && first !== null && !Array.isArray(first)) {
      const f = first as Record<string, unknown>;
      if (typeof f.name === "string" && f.name.length > 0) {
        const idResult = createCanonicalEntityId({
          kind: "optional-feature",
          ruleset: ruleset as "2014" | "2024",
          source,
          name: f.name,
        });
        if (idResult.ok) {
          return { featureId: idResult.id, unmapped: false };
        }
        return { featureId: undefined, unmapped: true };
      }
    }
  }

  return { featureId: undefined, unmapped: false };
}

/* ── Simple field extractors ───────────────────────────────────── */

export function extractPage(remaining: Record<string, unknown>): number | undefined {
  const page = remaining.page;
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return page;
  }
  return undefined;
}

export function extractSummary(remaining: Record<string, unknown>): string | undefined {
  const summary = remaining.summary;
  if (typeof summary === "string" && summary.length > 0) {
    return summary;
  }
  return undefined;
}
