import type { CopyModRawRecord } from "./mod-types";
import { classifySkillSourceScope, type SkillSourceScopeContext } from "./skill-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createSkillRule, type SkillRule } from "@obsidian-dnd/catalog-contract";
import type { Ability } from "@obsidian-dnd/domain";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

export type SkillNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID";

export interface SkillNormalizerDiagnostic {
  readonly code: SkillNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface SkillNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: SkillSourceScopeContext;
}

export interface SkillNormalizerResult {
  readonly skills: readonly SkillRule[];
  readonly diagnostics: readonly SkillNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: SkillSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: SkillNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): SkillNormalizerDiagnostic {
  const isError = code === "INVALID_SOURCE" || code === "INVALID_CANONICAL_ID";

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

  const entry = remaining.entry;
  if (typeof entry === "string" && entry.length > 0) {
    content.push({ type: "paragraph", text: entry });
  }

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

function extractAbilityScore(remaining: Record<string, unknown>): Ability | undefined {
  const validAbilities = new Set(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

  const ability = remaining.ability;
  if (typeof ability === "string" && validAbilities.has(ability)) {
    return ability as Ability;
  }

  const abilityScore = remaining.abilityScore;
  if (typeof abilityScore === "string" && validAbilities.has(abilityScore)) {
    return abilityScore as Ability;
  }

  return undefined;
}

type SingleResult =
  | { readonly ok: true; readonly skill: SkillRule; readonly diagnostics: readonly SkillNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SkillNormalizerDiagnostic[] };

function normalizeSingleSkill(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: SkillNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifySkillSourceScope(
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
    kind: "skill",
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
  const abilityScore = extractAbilityScore(remaining);

  // 4. Validate ability score is present
  if (abilityScore === undefined) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      `Skill "${record.name}" is missing an associated ability score.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 5. Build the skill rule
  const skill = createSkillRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    content,
    abilityScore,
    page,
    summary,
  );

  return { ok: true, skill, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeSkills(input: SkillNormalizerInput): SkillNormalizerResult {
  const skills: SkillRule[] = [];
  const diagnostics: SkillNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleSkill(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "skill",
      recordIndex: i,
    });

    if (result.ok) {
      skills.push(result.skill);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    skills: Object.freeze(skills),
    diagnostics: Object.freeze(diagnostics),
  });
}
