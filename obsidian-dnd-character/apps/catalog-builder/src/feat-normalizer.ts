import type { CopyModRawRecord } from "./mod-types";
import { classifyFeatSourceScope, type FeatSourceScopeContext } from "./feat-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createFeatRule, type FeatRule } from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

export type FeatNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID";

export interface FeatNormalizerDiagnostic {
  readonly code: FeatNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface FeatNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: FeatSourceScopeContext;
}

export interface FeatNormalizerResult {
  readonly feats: readonly FeatRule[];
  readonly diagnostics: readonly FeatNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: FeatSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: FeatNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): FeatNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
  ].includes(code);

  return Object.freeze({
    code,
    severity: isError ? "error" : "warning",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

function extractContent(remaining: Record<string, unknown>): RenderNode[] {
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

function extractPage(remaining: Record<string, unknown>): number | undefined {
  const page = remaining.page;
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return page;
  }
  return undefined;
}

function extractSummary(remaining: Record<string, unknown>): string | undefined {
  const summary = remaining.summary;
  if (typeof summary === "string" && summary.length > 0) {
    return summary;
  }
  return undefined;
}

/**
 * Extract ability score prerequisite from feat raw record.
 * Feats may declare a minimum ability score requirement.
 */
function extractAbilityPrerequisite(
  remaining: Record<string, unknown>,
): { abilityScorePrerequisite?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"; abilityMinScore?: number } {
  const validAbilities = new Set(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

  // Check for prerequisites field (structured prerequisite list)
  const prerequisites = remaining.prerequisites;
  if (Array.isArray(prerequisites) && prerequisites.length > 0) {
    for (const prereq of prerequisites) {
      if (typeof prereq !== "object" || prereq === null) continue;
      const p = prereq as Record<string, unknown>;

      // Handle structured prerequisite with ability and minScore
      if (typeof p.ability === "string" && validAbilities.has(p.ability)) {
        const ability = p.ability as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
        let minScore: number | undefined;
        if (typeof p.minScore === "number" && Number.isInteger(p.minScore) && p.minScore >= 1) {
          minScore = p.minScore;
        }
        return { abilityScorePrerequisite: ability, abilityMinScore: minScore };
      }

      // Handle alternative shape: abilityScore and abilityMin
      if (typeof p.abilityScore === "string" && validAbilities.has(p.abilityScore)) {
        const ability = p.abilityScore as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
        let minScore: number | undefined;
        if (typeof p.abilityMin === "number" && Number.isInteger(p.abilityMin) && p.abilityMin >= 1) {
          minScore = p.abilityMin;
        }
        return { abilityScorePrerequisite: ability, abilityMinScore: minScore };
      }
    }
  }

  // Direct abilityScorePrerequisite field on the remaining record
  const directAbility = remaining.abilityScorePrerequisite;
  if (typeof directAbility === "string" && validAbilities.has(directAbility)) {
    const ability = directAbility as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
    let minScore: number | undefined;
    const directMin = remaining.abilityMinScore;
    if (typeof directMin === "number" && Number.isInteger(directMin) && directMin >= 1) {
      minScore = directMin;
    }
    return { abilityScorePrerequisite: ability, abilityMinScore: minScore };
  }

  return {};
}

type SingleResult =
  | { readonly ok: true; readonly feat: FeatRule; readonly diagnostics: readonly FeatNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly FeatNormalizerDiagnostic[] };

function normalizeSingleFeat(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: FeatNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyFeatSourceScope(
    {
      record,
      sourcePath: opts.sourcePath,
      entityKind: opts.entityKind,
      recordIndex: opts.recordIndex,
    },
    opts.context,
  );

  if (!scopeResult.ok) {
    const code = scopeResult.diagnostic.code === "INVALID_SOURCE"
      ? "INVALID_SOURCE"
      : scopeResult.diagnostic.code === "UNKNOWN_SOURCE"
        ? "UNKNOWN_SOURCE"
        : "EXCLUDED_SOURCE";
    diagnostics.push(makeDiagnostic(
      code,
      scopeResult.diagnostic.message,
      record.name,
      opts,
      scopeResult.diagnostic.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Generate canonical entity ID
  const idResult = createCanonicalEntityId({
    kind: "feat",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      idResult.diagnostic.message,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Extract content and metadata
  const content = extractContent(remaining);
  const page = extractPage(remaining);
  const summary = extractSummary(remaining);
  const abilityPrereq = extractAbilityPrerequisite(remaining);

  // 4. Build the feat rule
  const feat = createFeatRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    content,
    [],
    [],
    [],
    [],
    false,
    page,
    summary,
    abilityPrereq.abilityScorePrerequisite,
    abilityPrereq.abilityMinScore,
  );

  return { ok: true, feat, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeFeats(input: FeatNormalizerInput): FeatNormalizerResult {
  const feats: FeatRule[] = [];
  const diagnostics: FeatNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleFeat(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "feat",
      recordIndex: i,
    });

    if (result.ok) {
      feats.push(result.feat);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    feats: Object.freeze(feats),
    diagnostics: Object.freeze(diagnostics),
  });
}
