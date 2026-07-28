import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";
import { classifyRecordRuleset } from "./ruleset-classifier";

/* ── ReadonlySet ───────────────────────────────────────────────── */

/**
 * Mutation-safe readonly set interface.
 * Matches the read-only surface of Set without exposing add/delete/clear.
 */
export interface FrozenReadonlySet<T> {
  readonly size: number;
  has(value: T): boolean;
  forEach(callback: (value: T, value2: T, set: FrozenReadonlySet<T>) => void, thisArg?: unknown): void;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
  readonly [Symbol.toStringTag]: string;
}

/**
 * Mutation-safe ReadonlySet implementation.
 * Internal set is private; exposed surface only allows read operations.
 * add, delete, clear are not available on the returned object.
 */
function createFrozenReadonlySet<T>(values: readonly T[]): FrozenReadonlySet<T> {
  const internal = new Set(values);
  const wrapper: FrozenReadonlySet<T> = Object.freeze({
    get size() { return internal.size; },
    has(value: T): boolean { return internal.has(value); },
    forEach(callback: (value: T, value2: T, set: FrozenReadonlySet<T>) => void, thisArg?: unknown) {
      internal.forEach((v) => callback.call(thisArg, v, v, wrapper));
    },
    entries(): IterableIterator<[T, T]> { return internal.entries(); },
    keys(): IterableIterator<T> { return internal.keys(); },
    values(): IterableIterator<T> { return internal.values(); },
    [Symbol.iterator](): IterableIterator<T> { return internal[Symbol.iterator](); },
    get [Symbol.toStringTag]() { return "ReadonlySet"; },
  });
  return wrapper;
}

/* ── Supported species source registry ─────────────────────────── */

export interface SpeciesSourceEntry {
  readonly source: string;
  readonly ruleset: Ruleset;
}

/**
 * Frozen registry of species sources admitted in the initial P4-T005 scope.
 * Only PHB (2014) and XPHB (2024) are supported. See ADR-011.
 * Uses as const for literal-typed entries so no unsafe casts are needed.
 */
export const SUPPORTED_SPECIES_SOURCES: readonly SpeciesSourceEntry[] = Object.freeze([
  { source: "PHB", ruleset: "2014" as const },
  { source: "XPHB", ruleset: "2024" as const },
] as const);

// Freeze each individual registry entry
for (const entry of SUPPORTED_SPECIES_SOURCES) {
  Object.freeze(entry);
}

const SUPPORTED_SOURCE_MAP: ReadonlyMap<string, SpeciesSourceEntry> = new Map(
  SUPPORTED_SPECIES_SOURCES.map((entry) => [entry.source, entry]),
);

const SUPPORTED_SOURCE_NAMES: readonly string[] = Object.freeze(
  SUPPORTED_SPECIES_SOURCES.map((entry) => entry.source),
);

/* ── Types ─────────────────────────────────────────────────────── */

export interface SpeciesSourceScopeContext {
  readonly knownPinnedSources: FrozenReadonlySet<string>;
}

/**
 * Optional structured parent identity for subrace or derived species records.
 * Only used when explicitly supplied; never inferred from display text.
 */
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

/**
 * Diagnostic emitted by the inventory collector for malformed source entries.
 */
export interface SpeciesSourceInventoryDiagnostic {
  readonly code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY";
  readonly severity: "warning";
  readonly message: string;
  readonly recordName: string;
  readonly source: string;
  readonly recordIndex: number;
  readonly recordIdentity: {
    readonly name: string;
    readonly source: string;
  };
}

/**
 * Result of collecting known species sources from validated records.
 */
export interface KnownSpeciesSourceInventoryResult {
  readonly sources: FrozenReadonlySet<string>;
  readonly diagnostics: readonly SpeciesSourceInventoryDiagnostic[];
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
 * Returns a mutation-safe ReadonlySet and diagnostics for malformed entries.
 * Does NOT trim or accept malformed values; diagnoses them instead.
 * Does not assign rulesets.
 */
export function collectKnownSpeciesSources(
  records: readonly RawRecord[],
): KnownSpeciesSourceInventoryResult {
  const sources = new Set<string>();
  const diagnostics: SpeciesSourceInventoryDiagnostic[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record === undefined) continue;
    const source = record.source;

    // Diagnose empty source
    if (source.length === 0) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has an empty source abbreviation.`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose whitespace-only source
    if (source.trim().length === 0) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has a whitespace-only source abbreviation.`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose leading whitespace
    if (source !== source.trimStart()) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has leading whitespace in source abbreviation "${source}".`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose trailing whitespace
    if (source !== source.trimEnd()) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has trailing whitespace in source abbreviation "${source}".`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Valid exact source — add to set
    sources.add(source);
  }

  return Object.freeze({
    sources: createFrozenReadonlySet([...sources]),
    diagnostics: Object.freeze(diagnostics),
  });
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
    // Clone and freeze parent identity to prevent external mutation
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
  const supportedEntry = SUPPORTED_SOURCE_MAP.get(source);
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
    return Object.freeze({
      ok: true,
      record: input.record,
      source: supportedEntry.source as "PHB" | "XPHB",
      ruleset: supportedEntry.ruleset as "2014" | "2024",
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

    classifications.push(Object.freeze({
      record: result.record,
      source: result.source,
      ruleset: result.ruleset,
      sourcePath: input.sourcePath,
      entityKind: input.entityKind,
      recordIndex: input.recordIndex,
    }));

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
