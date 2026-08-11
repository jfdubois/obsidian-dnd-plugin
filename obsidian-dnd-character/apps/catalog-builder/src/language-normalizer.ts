import type { CopyModRawRecord } from "./mod-types";
import { classifyLanguageSourceScope, type LanguageSourceScopeContext } from "./language-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createLanguageRule, type LanguageRule, type LanguageType, isLanguageType } from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

export type LanguageNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID";

export interface LanguageNormalizerDiagnostic {
  readonly code: LanguageNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface LanguageNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: LanguageSourceScopeContext;
}

export interface LanguageNormalizerResult {
  readonly languages: readonly LanguageRule[];
  readonly diagnostics: readonly LanguageNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: LanguageSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: LanguageNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): LanguageNormalizerDiagnostic {
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

function extractLanguageType(remaining: Record<string, unknown>): LanguageType | undefined {
  const langType = remaining.type;
  if (typeof langType === "string" && isLanguageType(langType)) {
    return langType;
  }

  // 5eTools distinguishes language categories (standard, exotic, rare, and
  // secret), while the normalized catalog distinguishes language from script.
  if (langType === "standard" || langType === "exotic" || langType === "rare" || langType === "secret") {
    return "language";
  }

  return undefined;
}

function extractSpeakerType(remaining: Record<string, unknown>): string | undefined {
  const speakerType = remaining.speakerType;
  if (typeof speakerType === "string" && speakerType.length > 0) {
    return speakerType;
  }
  return undefined;
}

type SingleResult =
  | { readonly ok: true; readonly language: LanguageRule; readonly diagnostics: readonly LanguageNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly LanguageNormalizerDiagnostic[] };

function normalizeSingleLanguage(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: LanguageNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyLanguageSourceScope(
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
    kind: "language",
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
  const langType = extractLanguageType(remaining);
  const speakerType = extractSpeakerType(remaining);

  // 4. Validate language type is present
  if (langType === undefined) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      `Language "${record.name}" is missing a valid type (language or script).`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 5. Build the language rule
  const language = createLanguageRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    content,
    langType,
    page,
    summary,
    speakerType,
  );

  return { ok: true, language, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeLanguages(input: LanguageNormalizerInput): LanguageNormalizerResult {
  const languages: LanguageRule[] = [];
  const diagnostics: LanguageNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleLanguage(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "language",
      recordIndex: i,
    });

    if (result.ok) {
      languages.push(result.language);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    languages: Object.freeze(languages),
    diagnostics: Object.freeze(diagnostics),
  });
}
