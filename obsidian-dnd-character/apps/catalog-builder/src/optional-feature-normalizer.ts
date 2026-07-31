import type { CopyModRawRecord } from "./mod-types";
import { classifyOptionalFeatureSourceScope, type OptionalFeatureSourceScopeContext } from "./optional-feature-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createOptionalFeatureRule, type OptionalFeatureRule } from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

export type OptionalFeatureNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID";

export interface OptionalFeatureNormalizerDiagnostic {
  readonly code: OptionalFeatureNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface OptionalFeatureNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: OptionalFeatureSourceScopeContext;
}

export interface OptionalFeatureNormalizerResult {
  readonly optionalFeatures: readonly OptionalFeatureRule[];
  readonly diagnostics: readonly OptionalFeatureNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: OptionalFeatureSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: OptionalFeatureNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): OptionalFeatureNormalizerDiagnostic {
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

type SingleResult =
  | { readonly ok: true; readonly optionalFeature: OptionalFeatureRule; readonly diagnostics: readonly OptionalFeatureNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly OptionalFeatureNormalizerDiagnostic[] };

function normalizeSingleOptionalFeature(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: OptionalFeatureNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  // 1. Classify source scope
  const scopeResult = classifyOptionalFeatureSourceScope(
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
    kind: "optional-feature",
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

  // 4. Build the optional-feature rule
  const optionalFeature = Object.freeze(createOptionalFeatureRule(
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
  ));

  return { ok: true, optionalFeature, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeOptionalFeatures(input: OptionalFeatureNormalizerInput): OptionalFeatureNormalizerResult {
  const optionalFeatures: OptionalFeatureRule[] = [];
  const diagnostics: OptionalFeatureNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleOptionalFeature(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "optional-feature",
      recordIndex: i,
    });

    if (result.ok) {
      optionalFeatures.push(result.optionalFeature);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    optionalFeatures: Object.freeze(optionalFeatures),
    diagnostics: Object.freeze(diagnostics),
  });
}
