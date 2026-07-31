import type { CopyModRawRecord } from "./mod-types";
import { classifyClassSourceScope, type ClassSourceScopeContext } from "./class-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createSubclassFeatureRule, type SubclassFeatureRule } from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

export type SubclassFeatureNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "MISSING_CLASS_NAME"
  | "MISSING_SUBCLASS_NAME"
  | "MISSING_LEVEL"
  | "INVALID_LEVEL"
  | "INVALID_PARENT_ID";

export interface SubclassFeatureNormalizerDiagnostic {
  readonly code: SubclassFeatureNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface SubclassFeatureNormalizerInput {
  readonly records: readonly CopyModRawRecord[];
  readonly context: ClassSourceScopeContext;
}

export interface SubclassFeatureNormalizerResult {
  readonly features: readonly SubclassFeatureRule[];
  readonly diagnostics: readonly SubclassFeatureNormalizerDiagnostic[];
}

interface NormalizerOptions {
  readonly context: ClassSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: SubclassFeatureNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): SubclassFeatureNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
    "MISSING_CLASS_NAME",
    "MISSING_SUBCLASS_NAME",
    "MISSING_LEVEL",
    "INVALID_LEVEL",
    "INVALID_PARENT_ID",
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

function extractLevel(remaining: Record<string, unknown>): number | undefined {
  const level = remaining.level;
  if (typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 20) {
    return level;
  }
  return undefined;
}

function extractClassName(remaining: Record<string, unknown>): string | undefined {
  const className = remaining.className;
  if (typeof className === "string" && className.length > 0 && className === className.trim()) {
    return className;
  }
  return undefined;
}

function extractSubclassName(remaining: Record<string, unknown>): string | undefined {
  const subclassName = remaining.subclassShortName;
  if (typeof subclassName === "string" && subclassName.length > 0 && subclassName === subclassName.trim()) {
    return subclassName;
  }
  return undefined;
}

type SingleResult =
  | { readonly ok: true; readonly feature: SubclassFeatureRule; readonly diagnostics: readonly SubclassFeatureNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SubclassFeatureNormalizerDiagnostic[] };

function normalizeSingleSubclassFeature(
  record: CopyModRawRecord,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: SubclassFeatureNormalizerDiagnostic[] = [];
  const remaining = record.remaining;

  const scopeResult = classifyClassSourceScope(
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

  const className = extractClassName(remaining);
  if (className === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_CLASS_NAME",
      `Subclass feature "${record.name}" is missing a valid className reference.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const subclassName = extractSubclassName(remaining);
  if (subclassName === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_SUBCLASS_NAME",
      `Subclass feature "${record.name}" is missing a valid subclassShortName reference.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const level = extractLevel(remaining);
  if (level === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_LEVEL",
      `Subclass feature "${record.name}" is missing a valid level.`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const idResult = createCanonicalEntityId({
    kind: "subclass-feature",
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

  const parentIdResult = createCanonicalEntityId({
    kind: "subclass",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: subclassName,
  });

  if (!parentIdResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_PARENT_ID",
      `Subclass feature "${record.name}" has an invalid parent subclass reference "${subclassName}": ${parentIdResult.diagnostic.message}`,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  const content = extractContent(remaining);
  const page = extractPage(remaining);
  const summary = extractSummary(remaining);

  const feature = createSubclassFeatureRule(
    idResult.id,
    record.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    parentIdResult.id,
    className,
    level,
    content,
    [],
    [],
    [],
    [parentIdResult.id],
    false,
    page,
    summary,
  );

  return { ok: true, feature, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeSubclassFeatures(input: SubclassFeatureNormalizerInput): SubclassFeatureNormalizerResult {
  const features: SubclassFeatureRule[] = [];
  const diagnostics: SubclassFeatureNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.records.length; i++) {
    const record = input.records[i];
    if (record === undefined) continue;
    const result = normalizeSingleSubclassFeature(record, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "subclass-feature",
      recordIndex: i,
    });

    if (result.ok) {
      features.push(result.feature);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    features: Object.freeze(features),
    diagnostics: Object.freeze(diagnostics),
  });
}
