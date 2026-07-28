import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";
import { classifyRecordRuleset } from "./ruleset-classifier";

/* ── Supported species source registry ─────────────────────────── */

export interface SpeciesSourceEntry {
  readonly source: string;
  readonly ruleset: Ruleset;
}

/**
 * Frozen registry of species sources admitted in the initial P4-T005 scope.
 * Only PHB (2014) and XPHB (2024) are supported. See ADR-011.
 */
export const SUPPORTED_SPECIES_SOURCES: readonly SpeciesSourceEntry[] = Object.freeze([
  { source: "PHB", ruleset: "2014" },
  { source: "XPHB", ruleset: "2024" },
]);

const SUPPORTED_SOURCE_MAP: ReadonlyMap<string, SpeciesSourceEntry> = new Map(
  SUPPORTED_SPECIES_SOURCES.map((entry) => [entry.source, entry]),
);

const SUPPORTED_SOURCE_NAMES: readonly string[] = Object.freeze(
  SUPPORTED_SPECIES_SOURCES.map((entry) => entry.source),
);

/* ── Types ─────────────────────────────────────────────────────── */

export interface SpeciesSourceScopeContext {
  readonly knownPinnedSources: ReadonlySet<string>;
}

export interface SpeciesSourceScopeInput {
  readonly record: RawRecord;
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
  readonly recordIdentity: { readonly name: string; readonly source: string };
  readonly recordName: string;
  readonly entityKind?: string;
  readonly sourcePath?: string;
  readonly recordIndex?: number;
  readonly supportedSources: readonly string[];
}

export interface SpeciesSourceScopeClassification {
  readonly record: RawRecord;
  readonly source: "PHB" | "XPHB";
  readonly ruleset: "2014" | "2024";
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export type SpeciesSourceScopeResult =
  | {
      readonly ok: true;
      readonly record: RawRecord;
      readonly source: "PHB" | "XPHB";
      readonly ruleset: "2014" | "2024";
    }
  | {
      readonly ok: false;
      readonly diagnostic: SpeciesSourceScopeDiagnostic;
    };

export interface SpeciesSourceScopeBatchResult {
  readonly classifications: readonly SpeciesSourceScopeClassification[];
  readonly diagnostics: readonly SpeciesSourceScopeDiagnostic[];
  readonly representedRulesets: readonly Ruleset[];
}

/* ── Known pinned source inventory ─────────────────────────────── */

/**
 * Derive the set of known source abbreviations from validated species records.
 * Empty or whitespace-only sources are silently skipped.
 * Returns a frozen set; does not assign rulesets.
 */
export function collectKnownSpeciesSources(records: readonly RawRecord[]): ReadonlySet<string> {
  const sources = new Set<string>();
  for (const record of records) {
    const source = record.source;
    if (source.trim().length === 0) {
      continue;
    }
    sources.add(source);
  }
  return Object.freeze(sources);
}

/* ── Diagnostic builder ────────────────────────────────────────── */

function buildDiagnostic(
  input: SpeciesSourceScopeInput,
  code: SpeciesSourceScopeDiagnosticCode,
  message: string,
  source?: string,
): SpeciesSourceScopeDiagnostic {
  return Object.freeze({
    code,
    severity: "warning" as const,
    message,
    source,
    recordIdentity: { name: input.record.name, source: input.record.source },
    recordName: input.record.name,
    entityKind: input.entityKind,
    sourcePath: input.sourcePath,
    recordIndex: input.recordIndex,
    supportedSources: SUPPORTED_SOURCE_NAMES,
  });
}

/* ── Single-record classifier ──────────────────────────────────── */

/**
 * Classify whether a species record's source is admitted into the initial
 * P4-T005 scope. Only PHB (2014) and XPHB (2024) are accepted.
 *
 * Classification order:
 * 1. INVALID_SOURCE — empty or whitespace-padded abbreviation
 * 2. Accepted — PHB or XPHB, verified against ruleset classifier
 * 3. UNSUPPORTED_SPECIES_SOURCE — known pinned source not in initial scope
 * 4. UNKNOWN_SOURCE — fabricated or unrecognized source
 */
export function classifySpeciesSourceScope(
  input: SpeciesSourceScopeInput,
  context: SpeciesSourceScopeContext,
): SpeciesSourceScopeResult {
  const source = input.record.source;

  // 1. Invalid: empty or whitespace-padded
  if (source.length === 0 || source !== source.trim()) {
    return {
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "INVALID_SOURCE",
        "Species record has a malformed source abbreviation (empty or whitespace-padded).",
        source,
      ),
    };
  }

  // 2. Supported: PHB or XPHB — delegate to ruleset classifier
  const supportedEntry = SUPPORTED_SOURCE_MAP.get(source);
  if (supportedEntry !== undefined) {
    const rulesetResult = classifyRecordRuleset(input);
    if (!rulesetResult.ok) {
      return {
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset classifier could not classify supported species source "${source}".`,
          source,
        ),
      };
    }
    if (rulesetResult.classification.ruleset !== supportedEntry.ruleset) {
      return {
        ok: false,
        diagnostic: buildDiagnostic(
          input,
          "UNKNOWN_SOURCE",
          `Ruleset mismatch for source "${source}": expected "${supportedEntry.ruleset}" but got "${rulesetResult.classification.ruleset}".`,
          source,
        ),
      };
    }
    return {
      ok: true,
      record: input.record,
      source: supportedEntry.source as "PHB" | "XPHB",
      ruleset: supportedEntry.ruleset as "2014" | "2024",
    };
  }

  // 3. Known pinned but not in initial scope
  if (context.knownPinnedSources.has(source)) {
    return {
      ok: false,
      diagnostic: buildDiagnostic(
        input,
        "UNSUPPORTED_SPECIES_SOURCE",
        `Source "${source}" is a known pinned source but is excluded from the initial species normalizer scope (PHB and XPHB only). See ADR-011.`,
        source,
      ),
    };
  }

  // 4. Unknown / fabricated source
  return {
    ok: false,
    diagnostic: buildDiagnostic(
      input,
      "UNKNOWN_SOURCE",
      `Source "${source}" is not recognized as a valid species source.`,
      source,
    ),
  };
}

/* ── Batch classifier ──────────────────────────────────────────── */

/**
 * Classify a batch of species source-scope inputs.
 * Preserves input order for classifications and diagnostics.
 * Returns frozen collections.
 */
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

    classifications.push({
      record: result.record,
      source: result.source,
      ruleset: result.ruleset,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: input.recordIndex,
    });

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
