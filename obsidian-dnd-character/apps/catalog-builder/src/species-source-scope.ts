import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";
import { classifyRecordRuleset } from "./ruleset-classifier";
import type { FrozenReadonlySet } from "./species-source-inventory";

/* ── Supported species source registry ─────────────────────────── */

export const SUPPORTED_SPECIES_SOURCES = Object.freeze([
  Object.freeze({ source: "PHB", ruleset: "2014" }),
  Object.freeze({ source: "XPHB", ruleset: "2024" }),
] as const);

export type SupportedSpeciesSourceEntry = (typeof SUPPORTED_SPECIES_SOURCES)[number];
export type SupportedSpeciesSource = SupportedSpeciesSourceEntry["source"];
export type SupportedSpeciesRuleset = SupportedSpeciesSourceEntry["ruleset"];

const SUPPORTED_SOURCE_MAP: ReadonlyMap<string, SupportedSpeciesSourceEntry> = new Map(
  SUPPORTED_SPECIES_SOURCES.map((entry) => [entry.source, entry]),
);

const SUPPORTED_SOURCE_NAMES: readonly string[] = Object.freeze(
  SUPPORTED_SPECIES_SOURCES.map((entry) => entry.source),
);

/* ── Types ─────────────────────────────────────────────────────── */

export interface SpeciesSourceScopeContext {
  readonly knownPinnedSources: FrozenReadonlySet<string>;
}

export interface SpeciesParentIdentity {
  readonly name: string;
  readonly source: string;
}

export interface SpeciesSourceScopeInput {
  readonly record: RawRecord;
  readonly parentIdentity?: SpeciesParentIdentity;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export type SpeciesSourceScopeDiagnosticCode =
  | "INVALID_SOURCE"
  | "UNSUPPORTED_SPECIES_SOURCE"
  | "UNKNOWN_SOURCE";

export interface SpeciesSourceScopeDiagnostic {
  readonly code: SpeciesSourceScopeDiagnosticCode;
  readonly severity: "warning";
  readonly message: string;
  readonly source?: string;
  readonly recordIdentity: {
    readonly name: string;
    readonly source: string;
    readonly parent?: { readonly name: string; readonly source: string };
  };
  readonly recordName: string;
  readonly entityKind?: string;
  readonly sourcePath?: string;
  readonly recordIndex?: number;
  readonly supportedSources: readonly string[];
}

export type SpeciesSourceScopeSuccess =
  | { readonly ok: true; readonly record: RawRecord; readonly source: "PHB"; readonly ruleset: "2014"; }
  | { readonly ok: true; readonly record: RawRecord; readonly source: "XPHB"; readonly ruleset: "2024"; };

export interface SpeciesSourceScopeFailure {
  readonly ok: false;
  readonly diagnostic: SpeciesSourceScopeDiagnostic;
}

export type SpeciesSourceScopeResult = SpeciesSourceScopeSuccess | SpeciesSourceScopeFailure;

export type SpeciesSourceScopeClassification =
  | { readonly record: RawRecord; readonly source: "PHB"; readonly ruleset: "2014"; readonly sourcePath?: string; readonly entityKind?: string; readonly recordIndex?: number; }
  | { readonly record: RawRecord; readonly source: "XPHB"; readonly ruleset: "2024"; readonly sourcePath?: string; readonly entityKind?: string; readonly recordIndex?: number; };

export interface SpeciesSourceScopeBatchResult {
  readonly classifications: readonly SpeciesSourceScopeClassification[];
  readonly diagnostics: readonly SpeciesSourceScopeDiagnostic[];
  readonly representedRulesets: readonly Ruleset[];
}

/* ── Diagnostic builder ────────────────────────────────────────── */
function buildDiagnostic(
  input: SpeciesSourceScopeInput,
  code: SpeciesSourceScopeDiagnosticCode,
  message: string,
  source?: string,
): SpeciesSourceScopeDiagnostic {
  const recordIdentity: {
    readonly name: string;
    readonly source: string;
    readonly parent?: { readonly name: string; readonly source: string };
  } = { name: input.record.name, source: input.record.source };

  if (input.parentIdentity !== undefined) {
    (recordIdentity as Record<string, unknown>).parent = Object.freeze({
      name: input.parentIdentity.name,
      source: input.parentIdentity.source,
    });
  }

  return Object.freeze({
    code,
    severity: "warning" as const,
    message,
    source,
    recordIdentity: Object.freeze(recordIdentity),
    recordName: input.record.name,
    entityKind: input.entityKind,
    sourcePath: input.sourcePath,
    recordIndex: input.recordIndex,
    supportedSources: SUPPORTED_SOURCE_NAMES,
  });
}

function lookupSupportedEntry(source: string): SupportedSpeciesSourceEntry | undefined {
  return SUPPORTED_SOURCE_MAP.get(source);
}

export function classifySpeciesSourceScope(
  input: SpeciesSourceScopeInput,
  context: SpeciesSourceScopeContext,
): SpeciesSourceScopeResult {
  const source = input.record.source;

  // 1. Invalid: empty or whitespace-padded
  if (source.length === 0 || source !== source.trim()) {
    return Object.freeze({
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "INVALID_SOURCE",
        "Species record has a malformed source abbreviation (empty or whitespace-padded).",
        source,
      ),
    });
  }

  // 2. Supported: PHB or XPHB — delegate to ruleset classifier
  // Branch explicitly on source string to preserve exact literal types
  // without requiring unsafe casts.
  const supportedEntry = lookupSupportedEntry(source);
  if (supportedEntry !== undefined) {
    const rulesetResult = classifyRecordRuleset(input);
    if (!rulesetResult.ok) {
      return Object.freeze({
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset classifier could not classify supported species source "${source}".`,
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
        "UNSUPPORTED_SPECIES_SOURCE",
        `Source "${source}" is a known pinned source but is excluded from the initial species normalizer scope (PHB and XPHB only). See ADR-011.`,
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
      `Source "${source}" is not recognized as a valid species source.`,
      source,
    ),
  });
}

function toClassification(
  result: SpeciesSourceScopeSuccess,
  input: SpeciesSourceScopeInput,
): SpeciesSourceScopeClassification {
  return Object.freeze({
    record: result.record,
    source: result.source,
    ruleset: result.ruleset,
    sourcePath: input.sourcePath,
    entityKind: input.entityKind,
    recordIndex: input.recordIndex,
  }) as SpeciesSourceScopeClassification;
}

export function classifySpeciesSourceScopeBatch(
  inputs: readonly SpeciesSourceScopeInput[],
  context: SpeciesSourceScopeContext,
): SpeciesSourceScopeBatchResult {
  const classifications: SpeciesSourceScopeClassification[] = [];
  const diagnostics: SpeciesSourceScopeDiagnostic[] = [];
  const representedRulesets: Ruleset[] = [];

  for (const input of inputs) {
    const result = classifySpeciesSourceScope(input, context);

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
