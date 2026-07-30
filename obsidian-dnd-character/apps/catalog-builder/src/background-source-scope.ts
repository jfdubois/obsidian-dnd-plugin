import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";
import { classifyRecordRuleset } from "./ruleset-classifier";
import type { FrozenReadonlySet } from "./species-source-inventory";

/* ── Supported background source registry ──────────────────────── */

export const SUPPORTED_BACKGROUND_SOURCES = Object.freeze([
  Object.freeze({ source: "PHB", ruleset: "2014" }),
  Object.freeze({ source: "XPHB", ruleset: "2024" }),
] as const);

export type SupportedBackgroundSourceEntry = (typeof SUPPORTED_BACKGROUND_SOURCES)[number];
export type SupportedBackgroundSource = SupportedBackgroundSourceEntry["source"];
export type SupportedBackgroundRuleset = SupportedBackgroundSourceEntry["ruleset"];

const SUPPORTED_SOURCE_MAP: ReadonlyMap<string, SupportedBackgroundSourceEntry> = new Map(
  SUPPORTED_BACKGROUND_SOURCES.map((entry) => [entry.source, entry]),
);

const SUPPORTED_SOURCE_NAMES: readonly string[] = Object.freeze(
  SUPPORTED_BACKGROUND_SOURCES.map((entry) => entry.source),
);

/* ── Types ─────────────────────────────────────────────────────── */

export interface BackgroundSourceScopeContext {
  readonly knownPinnedSources: FrozenReadonlySet<string>;
}

export interface BackgroundSourceScopeInput {
  readonly record: RawRecord;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export type BackgroundSourceScopeDiagnosticCode =
  | "INVALID_SOURCE"
  | "UNSUPPORTED_BACKGROUND_SOURCE"
  | "UNKNOWN_SOURCE";

export interface BackgroundSourceScopeDiagnostic {
  readonly code: BackgroundSourceScopeDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly source?: string;
  readonly recordIdentity: {
    readonly name: string;
    readonly source: string;
  };
  readonly recordName: string;
  readonly entityKind?: string;
  readonly sourcePath?: string;
  readonly recordIndex?: number;
  readonly supportedSources: readonly string[];
}

export type BackgroundSourceScopeSuccess =
  | { readonly ok: true; readonly record: RawRecord; readonly source: "PHB"; readonly ruleset: "2014"; }
  | { readonly ok: true; readonly record: RawRecord; readonly source: "XPHB"; readonly ruleset: "2024"; };

export interface BackgroundSourceScopeFailure {
  readonly ok: false;
  readonly diagnostic: BackgroundSourceScopeDiagnostic;
}

export type BackgroundSourceScopeResult = BackgroundSourceScopeSuccess | BackgroundSourceScopeFailure;

export type BackgroundSourceScopeClassification =
  | { readonly record: RawRecord; readonly source: "PHB"; readonly ruleset: "2014"; readonly sourcePath?: string; readonly entityKind?: string; readonly recordIndex?: number; }
  | { readonly record: RawRecord; readonly source: "XPHB"; readonly ruleset: "2024"; readonly sourcePath?: string; readonly entityKind?: string; readonly recordIndex?: number; };

export interface BackgroundSourceScopeBatchResult {
  readonly classifications: readonly BackgroundSourceScopeClassification[];
  readonly diagnostics: readonly BackgroundSourceScopeDiagnostic[];
  readonly representedRulesets: readonly Ruleset[];
}

/* ── Diagnostic builder ────────────────────────────────────────── */
function buildDiagnostic(
  input: BackgroundSourceScopeInput,
  code: BackgroundSourceScopeDiagnosticCode,
  message: string,
  source?: string,
): BackgroundSourceScopeDiagnostic {
  return Object.freeze({
    code,
    severity: "warning" as const,
    message,
    source,
    recordIdentity: Object.freeze({
      name: input.record.name,
      source: input.record.source,
    }),
    recordName: input.record.name,
    entityKind: input.entityKind,
    sourcePath: input.sourcePath,
    recordIndex: input.recordIndex,
    supportedSources: SUPPORTED_SOURCE_NAMES,
  });
}

function lookupSupportedEntry(source: string): SupportedBackgroundSourceEntry | undefined {
  return SUPPORTED_SOURCE_MAP.get(source);
}

export function classifyBackgroundSourceScope(
  input: BackgroundSourceScopeInput,
  context: BackgroundSourceScopeContext,
): BackgroundSourceScopeResult {
  const source = input.record.source;

  // 1. Invalid: empty or whitespace-padded
  if (source.length === 0 || source !== source.trim()) {
    return Object.freeze({
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "INVALID_SOURCE",
        "Background record has a malformed source abbreviation (empty or whitespace-padded).",
        source,
      ),
    });
  }

  // 2. Supported: PHB or XPHB — delegate to ruleset classifier
  const supportedEntry = lookupSupportedEntry(source);
  if (supportedEntry !== undefined) {
    const rulesetResult = classifyRecordRuleset(input);
    if (!rulesetResult.ok) {
      return Object.freeze({
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset classifier could not classify supported background source "${source}".`,
          source,
        ),
      });
    }
    if (rulesetResult.classification.ruleset !== supportedEntry.ruleset) {
      return Object.freeze({
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset mismatch for source "${source}": expected "${supportedEntry.ruleset}" but got "${rulesetResult.classification.ruleset}".`,
          source,
        ),
      });
    }

    if (source === "PHB") {
      return Object.freeze({
        ok: true,
        record: input.record,
        source: "PHB" as const,
        ruleset: "2014" as const,
      });
    }
    // source === "XPHB" (exhaustive check)
    return Object.freeze({
      ok: true,
      record: input.record,
      source: "XPHB" as const,
      ruleset: "2024" as const,
    });
  }

  // 3. Known pinned but not in initial scope
  if (context.knownPinnedSources.has(source)) {
    return Object.freeze({
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "UNSUPPORTED_BACKGROUND_SOURCE",
        `Source "${source}" is a known pinned source but is excluded from the initial background normalizer scope (PHB and XPHB only).`,
        source,
      ),
    });
  }

  // 4. Unknown / fabricated source
  return Object.freeze({
    ok: false,
    diagnostic: buildDiagnostic(
      input,
      "UNKNOWN_SOURCE",
      `Source "${source}" is not recognized as a valid background source.`,
      source,
    ),
  });
}

function toClassification(
  result: BackgroundSourceScopeSuccess,
  input: BackgroundSourceScopeInput,
): BackgroundSourceScopeClassification {
  if (result.source === "PHB") {
    return Object.freeze({
      record: result.record,
      source: "PHB",
      ruleset: "2014",
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: input.recordIndex,
    });
  }

  return Object.freeze({
    record: result.record,
    source: "XPHB",
    ruleset: "2024",
    sourcePath: input.sourcePath,
    entityKind: input.entityKind,
    recordIndex: input.recordIndex,
  });
}

export function classifyBackgroundSourceScopeBatch(
  inputs: readonly BackgroundSourceScopeInput[],
  context: BackgroundSourceScopeContext,
): BackgroundSourceScopeBatchResult {
  const classifications: BackgroundSourceScopeClassification[] = [];
  const diagnostics: BackgroundSourceScopeDiagnostic[] = [];
  const representedRulesets: Ruleset[] = [];

  for (const input of inputs) {
    const result = classifyBackgroundSourceScope(input, context);

    if (!result.ok) {
      diagnostics.push(result.diagnostic);
      continue;
    }

    classifications.push(toClassification(result, input));

    if (!representedRulesets.includes(result.ruleset)) {
      representedRulesets.push(result.ruleset);
    }
  }

  return Object.freeze({
    classifications: Object.freeze(classifications),
    diagnostics: Object.freeze(diagnostics),
    representedRulesets: Object.freeze(representedRulesets),
  });
}
