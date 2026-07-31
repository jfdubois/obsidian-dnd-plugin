import type { IndexedClassEntry } from "./class-index-types";
import { classifyClassSourceScope, type ClassSourceScopeContext } from "./class-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { createSubclassRule, type SubclassRule } from "@obsidian-dnd/catalog-contract";
import type { RenderNode } from "@obsidian-dnd/catalog-contract";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type SubclassNormalizerDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "INVALID_CANONICAL_ID"
  | "MISSING_PARENT_ID"
  | "INVALID_PARENT_ID"
  | "BASE_CLASS_MISDIRECTED";

export interface SubclassNormalizerDiagnostic {
  readonly code: SubclassNormalizerDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

/* ── Input / Output ────────────────────────────────────────────── */

export interface SubclassNormalizerInput {
  readonly entries: readonly IndexedClassEntry[];
  readonly context: ClassSourceScopeContext;
}

export interface SubclassNormalizerResult {
  readonly subclasses: readonly SubclassRule[];
  readonly diagnostics: readonly SubclassNormalizerDiagnostic[];
}

/* ── Internal helpers ──────────────────────────────────────────── */

interface NormalizerOptions {
  readonly context: ClassSourceScopeContext;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

function makeDiagnostic(
  code: SubclassNormalizerDiagnosticCode,
  message: string,
  recordName: string,
  opts: NormalizerOptions,
  source?: string,
): SubclassNormalizerDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "INVALID_CANONICAL_ID",
    "MISSING_PARENT_ID",
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

/**
 * Extracts narrative content from the indexed entry's resolved record.
 * Preserves narrative content as safe render nodes.
 */
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

/**
 * Extracts the page number from the record's remaining fields.
 */
function extractPage(remaining: Record<string, unknown>): number | undefined {
  const page = remaining.page;
  if (typeof page === "number" && Number.isInteger(page) && page >= 1) {
    return page;
  }
  return undefined;
}

/**
 * Extracts the summary text from the record's remaining fields.
 */
function extractSummary(remaining: Record<string, unknown>): string | undefined {
  const summary = remaining.summary;
  if (typeof summary === "string" && summary.length > 0) {
    return summary;
  }
  return undefined;
}

type SingleResult =
  | { readonly ok: true; readonly subclass: SubclassRule; readonly diagnostics: readonly SubclassNormalizerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly SubclassNormalizerDiagnostic[] };

function normalizeSingleSubclass(
  entry: IndexedClassEntry,
  opts: NormalizerOptions,
): SingleResult {
  const diagnostics: SubclassNormalizerDiagnostic[] = [];
  const remaining = entry.record.remaining;

  // 1. Guard: base classes must go to class-normalizer, not here
  if (!entry.isSubclass) {
    diagnostics.push(makeDiagnostic(
      "BASE_CLASS_MISDIRECTED",
      `Class "${entry.name}" is a base class, not a subclass. It should be processed by the class normalizer.`,
      entry.name,
      opts,
      entry.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Classify source scope (PHB / XPHB only)
  const scopeResult = classifyClassSourceScope(
    {
      record: entry.record,
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
      entry.name,
      opts,
      scopeResult.diagnostic.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 3. Generate canonical ID for the subclass
  const idResult = createCanonicalEntityId({
    kind: "subclass",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: entry.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      idResult.diagnostic.message,
      entry.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 4. Resolve parent class ID
  const parentId = entry.parentId;
  if (!parentId || parentId.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_PARENT_ID",
      `Subclass "${entry.name}" is missing a parent class reference.`,
      entry.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // Construct parent canonical ID using the same source and ruleset as the subclass
  const parentIdResult = createCanonicalEntityId({
    kind: "class",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: parentId,
  });

  if (!parentIdResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_PARENT_ID",
      `Subclass "${entry.name}" has an invalid parent class reference "${parentId}": ${parentIdResult.diagnostic.message}`,
      entry.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 5. Extract content
  const content = extractContent(remaining);

  // 6. Extract page
  const page = extractPage(remaining);

  // 7. Extract summary
  const summary = extractSummary(remaining);

  // 8. Assemble SubclassRule
  //    - levelRequirement defaults to 3 (standard PHB/XPHB subclass level)
  //    - featureIds is empty (deferred to P4-T011)
  //    - effects, choices, prerequisites are empty (deferred)
  const subclass = createSubclassRule(
    idResult.id,
    entry.name,
    idResult.sourceId,
    scopeResult.ruleset,
    "core",
    parentIdResult.id,
    3,
    content,
    [], // prerequisites (deferred)
    [], // effects (deferred)
    [], // choices (deferred)
    [parentIdResult.id], // dependencies: the parent class
    [], // featureIds (deferred to P4-T011)
    false, // legacy
    page,
    summary,
  );

  return { ok: true, subclass, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeSubclasses(input: SubclassNormalizerInput): SubclassNormalizerResult {
  const subclasses: SubclassRule[] = [];
  const diagnostics: SubclassNormalizerDiagnostic[] = [];

  for (let i = 0; i < input.entries.length; i++) {
    const entry = input.entries[i];
    if (entry === undefined) continue;
    const result = normalizeSingleSubclass(entry, {
      context: input.context,
      sourcePath: undefined,
      entityKind: "class",
      recordIndex: i,
    });

    if (result.ok) {
      subclasses.push(result.subclass);
    }
    diagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    subclasses: Object.freeze(subclasses),
    diagnostics: Object.freeze(diagnostics),
  });
}
