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
   structured {name, source} object. This module resolves that
   reference to the actual base entity record in the loaded raw data.

   Resolution steps:
   1. Extract _copy field from the raw record.
   2. Parse the _copy value using the canonical reference parser.
   3. Locate the base entity by matching parsed identity (name + source).
   4. If the base entity itself has a _copy, recursively resolve (with
      cycle detection and depth limit).
   5. Return the resolved base entity or a diagnostic.
─────────────────────────────────────────────────────────────────── */

/** Maximum depth for nested _copy chain resolution. */
const MAX_COPY_DEPTH = 20;

/** The raw _copy value as it appears in 5eTools data. */
export interface RawCopyValue {
  readonly name: string;
  readonly source: string;
  readonly [_: string]: unknown;
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
  /** A circular _copy reference was detected. */
  | "CIRCULAR_COPY_REFERENCE"
  /** The _copy chain exceeded the maximum depth. */
  | "COPY_CHAIN_TOO_DEEP"
  /** The _copy field has an unexpected type. */
  | "COPY_FIELD_INVALID_TYPE";

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
  return (
    isPlainObject(value) &&
    typeof (value as Record<string, unknown>).name === "string" &&
    typeof (value as Record<string, unknown>).source === "string" &&
    (value as Record<string, unknown>).name !== "" &&
    (value as Record<string, unknown>).source !== ""
  );
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

/**
 * Finds a record by name and source across all validated files.
 * Returns the first match found, or undefined if not found.
 */
function findRecordByNameAndSource(
  context: CopyResolverContext,
  entityName: string,
  sourceAbbr: string,
): RawRecord | undefined {
  for (const [, envelope] of Object.entries(context.validatedFiles)) {
    for (const record of envelope.records) {
      if (record.name === entityName && record.source === sourceAbbr) {
        return record;
      }
    }
  }
  return undefined;
}

/**
 * Recursively resolves a _copy chain with cycle detection.
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
      `_copy chain exceeded maximum depth of ${MAX_COPY_DEPTH}. Chain: ${chain.map((s) => `${s.entityName}|${s.sourceAbbr}`).join(" -> ")}`,
      sourceRecord,
      copyValue,
    );
  }

  const identityKey = `${copyValue.name}|${copyValue.source}`;

  // Cycle detection
  if (visited.has(identityKey)) {
    return createFailure(
      "CIRCULAR_COPY_REFERENCE",
      "error",
      `Circular _copy reference detected: "${identityKey}" appears multiple times in chain: ${chain.map((s) => `${s.entityName}|${s.sourceAbbr}`).join(" -> ")}`,
      sourceRecord,
      copyValue,
    );
  }

  visited.add(identityKey);
  chain.push({
    entityName: copyValue.name,
    sourceAbbr: copyValue.source,
  });

  // Find the base entity
  const baseEntity = findRecordByNameAndSource(
    context,
    copyValue.name,
    copyValue.source,
  );

  if (!baseEntity) {
    return createFailure(
      "BASE_ENTITY_NOT_FOUND",
      "error",
      `Base entity "${copyValue.name}" from source "${copyValue.source}" not found in loaded data. Referenced by "${sourceRecord.name}" (${sourceRecord.source}).`,
      sourceRecord,
      copyValue,
    );
  }

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

  // Parse the _copy reference using the canonical reference parser
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

  // Must be a canonical reference
  if (!isCanonicalParsedReference(parsed)) {
    return createFailure(
      "UNPARSEABLE_COPY_REFERENCE",
      "error",
      `_copy reference for "${rawRecord.name}" produced an unsupported reference kind: "${parsed.kind}". Expected canonical reference.`,
      rawRecord,
      copyValue,
    );
  }

  // Validate that the raw copy value is a proper RawCopyValue for chain resolution
  if (!isRawCopyValue(copyValue)) {
    return createFailure(
      "INVALID_COPY_REFERENCE",
      "error",
      `_copy value for "${rawRecord.name}" is not a valid structured reference object with 'name' and 'source' fields`,
      rawRecord,
      copyValue,
    );
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
