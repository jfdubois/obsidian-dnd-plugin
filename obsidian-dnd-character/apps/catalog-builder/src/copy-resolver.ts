import type { DiagnosticSeverity } from "./raw-loader";
import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import {
  parseReference,
  isCanonicalParsedReference,
  isDiagnosticParsedReference,
  type ReferenceDiagnostic,
} from "./ref-parser";

/* ── Copy Resolver Types ─────────────────────────────────────────

   The _copy field in 5eTools JSON references another entity by a
   structured identity object. The identity always contains at minimum
   a "source" field plus one or more non-directive identity keys
   (e.g. "name", "className", "raceName", "abbreviation", "pantheon").
   Keys beginning with "_" (_mod, _preserve) are directives, not identity.

   This module resolves the reference to the actual base entity record
   in the loaded raw data using structured identity matching.

   Resolution steps:
   1. Extract _copy field from the raw record.
   2. Parse the _copy value using the canonical reference parser.
   3. Extract structured identity (all non-directive keys).
   4. Locate base entity by matching ALL identity fields.
   5. If zero matches: BASE_ENTITY_NOT_FOUND.
   6. If multiple matches: AMBIGUOUS_BASE_ENTITY (diagnostic).
   7. If the base entity itself has a _copy, recursively resolve (with
      cycle detection using full structured identity and depth limit).
   8. Return the resolved base entity or a diagnostic.
─────────────────────────────────────────────────────────────────── */

/** Maximum depth for nested _copy chain resolution. */
const MAX_COPY_DEPTH = 20;

/** The raw _copy value as it appears in 5eTools data. */
export interface RawCopyValue {
  readonly source: string;
  readonly [_: string]: unknown;
}

/** Non-directive identity key-value pairs extracted from a _copy value. */
export interface StructuredIdentity {
  readonly source: string;
  readonly [key: string]: unknown;
}

/** A single step in a _copy resolution chain. */
export interface CopyChainStep {
  /** Entity name at this step. */
  readonly entityName: string;
  /** Source abbreviation at this step. */
  readonly sourceAbbr: string;
}

/** Discriminated result of a _copy resolution attempt. */
export type CopyResolutionResult =
  | CopyResolutionSuccess
  | CopyResolutionFailure;

/** Successful resolution with the base entity record. */
export interface CopyResolutionSuccess {
  readonly status: "resolved";
  /** The base entity record (deeply resolved through any _copy chain). */
  readonly baseEntity: RawRecord;
  /** Chain of references traversed to reach the final base entity. */
  readonly chain: readonly CopyChainStep[];
}

/** Failed resolution with diagnostic information. */
export interface CopyResolutionFailure {
  readonly status: "failed";
  readonly diagnostic: CopyResolverDiagnostic;
}

/** Diagnosis emitted when _copy resolution fails. */
export interface CopyResolverDiagnostic {
  readonly code: CopyDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  /** The record that attempted the _copy (if available). */
  readonly sourceRecord?: RawRecord;
  /** The raw _copy value that failed to resolve. */
  readonly rawCopy?: unknown;
  /** Reference parsing diagnostic, if the failure originated there. */
  readonly parseDiagnostic?: ReferenceDiagnostic;
}

export type CopyDiagnosticCode =
  /** The record has no _copy field. */
  | "NO_COPY_FIELD"
  /** The _copy field is not a valid structured reference. */
  | "INVALID_COPY_REFERENCE"
  /** The _copy reference could not be parsed. */
  | "UNPARSEABLE_COPY_REFERENCE"
  /** The referenced base entity was not found in the loaded data. */
  | "BASE_ENTITY_NOT_FOUND"
  /** Multiple records matched the _copy identity; cannot determine unique base entity. */
  | "AMBIGUOUS_BASE_ENTITY"
  /** A circular _copy reference was detected. */
  | "CIRCULAR_COPY_REFERENCE"
  /** The _copy chain exceeded the maximum depth. */
  | "COPY_CHAIN_TOO_DEEP"
  /** The _copy field has an unexpected type. */
  | "COPY_FIELD_INVALID_TYPE"
  /** The _preserve marker has an unsupported payload. */
  | "INVALID_PRESERVE_VALUE";

/** Context containing all loaded raw data for resolution. */
export interface CopyResolverContext {
  /** Validated file envelopes keyed by file path. */
  readonly validatedFiles: Record<string, ValidatedFileEnvelope>;
}

/* ── Error Class ───────────────────────────────────────────────── */

export class CopyResolverError extends Error {
  public readonly code: CopyDiagnosticCode;
  public readonly rawCopy: unknown;

  public constructor(
    code: CopyDiagnosticCode,
    rawCopy: unknown,
    message: string,
  ) {
    super(message);
    this.name = "CopyResolverError";
    this.code = code;
    this.rawCopy = rawCopy;
  }
}

/* ── Type Guards ───────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRawCopyValue(value: unknown): value is RawCopyValue {
  if (!isPlainObject(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // Must have non-empty source
  if (typeof obj.source !== "string" || obj.source === "") {
    return false;
  }
  // Must have at least one non-directive identity key (other than "source")
  // with a non-empty value
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("_") || key === "source") {
      continue;
    }
    if (typeof val === "string" && val !== "") {
      return true;
    }
    if (typeof val !== "string") {
      // Non-string values (e.g. level: 2) are valid identity keys
      return true;
    }
  }
  return false;
}

/**
 * Extracts the structured identity from a _copy value.
 * Returns all non-directive keys (keys not starting with "_").
 */
export function extractStructuredIdentity(copyValue: RawCopyValue): StructuredIdentity {
  const identity: Record<string, unknown> = { source: copyValue.source };
  for (const [key, value] of Object.entries(copyValue)) {
    if (!key.startsWith("_")) {
      identity[key] = value;
    }
  }
  return identity as StructuredIdentity;
}

/**
 * Produces a deterministic string key for cycle detection from a
 * structured identity. Uses sorted keys to ensure stability.
 */
function identityToCycleKey(identity: StructuredIdentity): string {
  const parts: string[] = [];
  for (const key of Object.keys(identity).sort()) {
    parts.push(`${key}=${String(identity[key])}`);
  }
  return parts.join("|");
}

function hasUnsupportedPreserveValue(record: RawRecord): boolean {
  const preserveValue = record.remaining._preserve;
  return preserveValue !== undefined && preserveValue !== true;
}

function copyRemainingWithoutCopyDirectives(
  remaining: Record<string, unknown>,
): Record<string, unknown> {
  const copied: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(remaining)) {
    if (key !== "_copy" && key !== "_preserve") {
      copied[key] = value;
    }
  }
  return copied;
}

function preservedRecord(record: RawRecord): RawRecord {
  return {
    name: record.name,
    source: record.source,
    remaining: copyRemainingWithoutCopyDirectives(record.remaining),
  };
}

export function isCopyResolutionSuccess(
  result: CopyResolutionResult,
): result is CopyResolutionSuccess {
  return result.status === "resolved";
}

export function isCopyResolutionFailure(
  result: CopyResolutionResult,
): result is CopyResolutionFailure {
  return result.status === "failed";
}

/* ── Internal Helpers ──────────────────────────────────────────── */

function createDiagnostic(
  code: CopyDiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  sourceRecord?: RawRecord,
  rawCopy?: unknown,
  parseDiagnostic?: ReferenceDiagnostic,
): CopyResolverDiagnostic {
  return {
    code,
    severity,
    message,
    sourceRecord,
    rawCopy,
    parseDiagnostic,
  };
}

function createFailure(
  code: CopyDiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  sourceRecord?: RawRecord,
  rawCopy?: unknown,
  parseDiagnostic?: ReferenceDiagnostic,
): CopyResolutionFailure {
  return {
    status: "failed",
    diagnostic: createDiagnostic(
      code,
      severity,
      message,
      sourceRecord,
      rawCopy,
      parseDiagnostic,
    ),
  };
}

function formatCopyChain(chain: readonly CopyChainStep[]): string {
  return chain.map((step) => `${step.entityName}|${step.sourceAbbr}`).join(" -> ");
}

/**
 * Finds records matching a structured identity across all validated files.
 * Returns all matching records so the caller can detect ambiguity.
 */
function findRecordsByStructuredIdentity(
  context: CopyResolverContext,
  identity: StructuredIdentity,
): RawRecord[] {
  const matches: RawRecord[] = [];
  for (const [, envelope] of Object.entries(context.validatedFiles)) {
    for (const collection of envelope.collections) {
      for (const record of collection.records) {
        if (recordMatchesIdentity(record, identity)) {
          matches.push(record);
        }
      }
    }
  }
  return matches;
}

/**
 * Checks whether a raw record matches all fields in a structured identity.
 * The record's envelope fields (name, source) and remaining fields are
 * checked against every non-directive key in the identity.
 */
function recordMatchesIdentity(
  record: RawRecord,
  identity: StructuredIdentity,
): boolean {
  for (const [key, expectedValue] of Object.entries(identity)) {
    let actualValue: unknown;
    if (key === "name") {
      actualValue = record.name;
    } else if (key === "source") {
      actualValue = record.source;
    } else {
      actualValue = record.remaining[key];
    }
    if (actualValue !== expectedValue) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if the _copy identity matches the source record itself
 * (for _preserve self-reference handling).
 */
function identityMatchesSourceRecord(
  identity: StructuredIdentity,
  sourceRecord: RawRecord,
): boolean {
  return recordMatchesIdentity(sourceRecord, identity);
}

/**
 * Recursively resolves a _copy chain with cycle detection.
 * Uses full structured identity for lookup and cycle detection keys.
 */
function resolveCopyChain(
  copyValue: RawCopyValue,
  context: CopyResolverContext,
  sourceRecord: RawRecord,
  visited: Set<string>,
  chain: CopyChainStep[],
  depth: number,
): CopyResolutionResult {
  // Depth guard
  if (depth > MAX_COPY_DEPTH) {
    return createFailure(
      "COPY_CHAIN_TOO_DEEP",
      "error",
      `_copy chain exceeded maximum depth of ${MAX_COPY_DEPTH}. Chain: ${formatCopyChain(chain)}`,
      sourceRecord,
      copyValue,
    );
  }

  const identity = extractStructuredIdentity(copyValue);
  const cycleKey = identityToCycleKey(identity);

  // Cycle detection
  if (visited.has(cycleKey)) {
    const chainLabel = identityToChainLabel(identity);
    const cycleChain = [
      ...chain,
      { entityName: chainLabel.name, sourceAbbr: chainLabel.source },
    ];
    return createFailure(
      "CIRCULAR_COPY_REFERENCE",
      "error",
      `Circular _copy reference detected: "${cycleKey}" appears multiple times in chain: ${formatCopyChain(cycleChain)}`,
      sourceRecord,
      copyValue,
    );
  }

  visited.add(cycleKey);
  const chainLabel = identityToChainLabel(identity);
  chain.push({
    entityName: chainLabel.name,
    sourceAbbr: chainLabel.source,
  });

  // _preserve self-reference: if the identity matches the source record itself
  if (
    sourceRecord.remaining._preserve === true &&
    identityMatchesSourceRecord(identity, sourceRecord)
  ) {
    return {
      status: "resolved",
      baseEntity: preservedRecord(sourceRecord),
      chain: Object.freeze(chain),
    };
  }

  // Find base entities matching ALL identity fields
  const candidates = findRecordsByStructuredIdentity(context, identity);

  if (candidates.length === 0) {
    return createFailure(
      "BASE_ENTITY_NOT_FOUND",
      "error",
      `Base entity matching identity ${JSON.stringify(identity)} not found in loaded data. Referenced by "${sourceRecord.name}" (${sourceRecord.source}).`,
      sourceRecord,
      copyValue,
    );
  }

  if (candidates.length > 1) {
    const candidateDescs = candidates
      .map((c) => `"${c.name}" (${c.source})`)
      .join(", ");
    return createFailure(
      "AMBIGUOUS_BASE_ENTITY",
      "error",
      `Found ${candidates.length} candidates matching identity ${JSON.stringify(identity)}: ${candidateDescs}. Referenced by "${sourceRecord.name}" (${sourceRecord.source}).`,
      sourceRecord,
      copyValue,
    );
  }

  const baseEntity = candidates[0]!;

  // If the base entity itself has a _copy, recurse
  const baseCopy = baseEntity.remaining._copy;
  if (baseCopy !== undefined && isRawCopyValue(baseCopy)) {
    return resolveCopyChain(
      baseCopy,
      context,
      sourceRecord,
      visited,
      chain,
      depth + 1,
    );
  }

  // Base entity has no further _copy — resolution complete
  return {
    status: "resolved",
    baseEntity,
    chain: Object.freeze(chain),
  };
}

/**
 * Extracts a chain label from a structured identity for display in
 * chain step reports. Uses "name" if present, otherwise falls back
 * to the first identity key.
 */
function identityToChainLabel(identity: StructuredIdentity): {
  name: string;
  source: string;
} {
  const name =
    typeof identity.name === "string"
      ? identity.name
      : Object.keys(identity)
          .filter((k) => k !== "source")
          .map((k) => `${k}=${identity[k]}`)
          .join(", ");
  return { name, source: identity.source };
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Resolves the _copy field on a raw record to the base entity record.
 *
 * @param record - The raw record containing a _copy field in its remaining data.
 * @param context - The resolver context with all validated files.
 * @returns A success result with the base entity, or a failure with diagnostics.
 */
export function resolveCopy(
  record: unknown,
  context: CopyResolverContext,
): CopyResolutionResult {
  // Validate record input
  if (!isPlainObject(record)) {
    return createFailure(
      "COPY_FIELD_INVALID_TYPE",
      "error",
      `Expected a record object for _copy resolution, got ${typeof record}`,
      undefined,
      record,
    );
  }

  const recordObj = record as Record<string, unknown>;

  // Validate required envelope fields
  if (
    typeof recordObj.name !== "string" ||
    typeof recordObj.source !== "string" ||
    !recordObj.name ||
    !recordObj.source
  ) {
    return createFailure(
      "COPY_FIELD_INVALID_TYPE",
      "error",
      `Record is missing required 'name' or 'source' envelope fields`,
      undefined,
      record,
    );
  }

  const rawRecord: RawRecord = {
    name: recordObj.name as string,
    source: recordObj.source as string,
    remaining: (recordObj.remaining ?? {}) as Record<string, unknown>,
  };

  if (hasUnsupportedPreserveValue(rawRecord)) {
    return createFailure(
      "INVALID_PRESERVE_VALUE",
      "error",
      `_preserve for "${rawRecord.name}" (${rawRecord.source}) must be the literal boolean true when present`,
      rawRecord,
      rawRecord.remaining._preserve,
    );
  }

  // Check for _copy field
  const copyValue = rawRecord.remaining._copy;

  if (copyValue === undefined) {
    return createFailure(
      "NO_COPY_FIELD",
      "warning",
      `Record "${rawRecord.name}" (${rawRecord.source}) has no _copy field`,
      rawRecord,
    );
  }

  // Validate that the raw copy value is a proper RawCopyValue for chain resolution
  if (!isRawCopyValue(copyValue)) {
    return createFailure(
      "INVALID_COPY_REFERENCE",
      "error",
      `_copy value for "${rawRecord.name}" is not a valid structured reference`,
      rawRecord,
      copyValue,
    );
  }

  // If the copy value has a 'name' field, also validate through the canonical
  // reference parser to catch structured-reference issues early.
  // Copy values without 'name' (e.g. itemType with only abbreviation+source)
  // skip the ref-parser since it requires a name field.
  if (typeof copyValue.name === "string" && copyValue.name) {
    const parsed = parseReference(copyValue, `copy:${rawRecord.name}|${rawRecord.source}`);

    if (isDiagnosticParsedReference(parsed)) {
      return createFailure(
        parsed.code === "STRUCTURED_REF_MISSING_FIELD" ||
          parsed.code === "MISSING_NAME" ||
          parsed.code === "MISSING_SOURCE"
          ? "INVALID_COPY_REFERENCE"
          : "UNPARSEABLE_COPY_REFERENCE",
        parsed.severity,
        `Failed to parse _copy reference for "${rawRecord.name}": ${parsed.message}`,
        rawRecord,
        copyValue,
        parsed,
      );
    }

    if (!isCanonicalParsedReference(parsed)) {
      return createFailure(
        "UNPARSEABLE_COPY_REFERENCE",
        "error",
        `_copy reference for "${rawRecord.name}" produced an unsupported reference kind: "${parsed.kind}". Expected canonical reference.`,
        rawRecord,
        copyValue,
      );
    }
  }

  // Resolve the copy chain
  return resolveCopyChain(
    copyValue,
    context,
    rawRecord,
    new Set(),
    [],
    0,
  );
}

/**
 * Convenience: resolves _copy and throws on failure.
 * Use when a failed resolution is an unrecoverable error.
 *
 * @throws CopyResolverError if resolution fails.
 */
export function resolveCopyOrThrow(
  record: unknown,
  context: CopyResolverContext,
): RawRecord {
  const result = resolveCopy(record, context);

  if (isCopyResolutionFailure(result)) {
    throw new CopyResolverError(
      result.diagnostic.code,
      result.diagnostic.rawCopy ?? undefined,
      result.diagnostic.message,
    );
  }

  return result.baseEntity;
}

/**
 * Batch-resolves _copy for multiple records.
 * Returns an array of results preserving input order.
 */
export function resolveCopies(
  records: unknown[],
  context: CopyResolverContext,
): CopyResolutionResult[] {
  return records.map((record) => resolveCopy(record, context));
}

/**
 * Collects all failure diagnostics from a batch of resolution results.
 */
export function collectCopyFailures(
  results: CopyResolutionResult[],
): CopyResolverDiagnostic[] {
  const failures: CopyResolverDiagnostic[] = [];
  for (const result of results) {
    if (isCopyResolutionFailure(result)) {
      failures.push(result.diagnostic);
    }
  }
  return failures;
}
