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
  /** Logical entity kind (collection) of the record at this step. */
  readonly entityKind: string;
  /** Physical file path containing the record at this step. */
  readonly sourcePath: string;
  /** Full structured identity/discriminator fields used for this step. */
  readonly identity: StructuredIdentity;
}

/** Exact located record selected while resolving a _copy chain. */
export interface LocatedCopyLevel {
  readonly record: RawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
  readonly identity: StructuredIdentity;
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
  /** Exact located records traversed to reach the final base entity. */
  readonly locatedLevels: readonly LocatedCopyLevel[];
}

/** Failed resolution with diagnostic information. */
export interface CopyResolutionFailure {
  readonly status: "failed";
  readonly diagnostic: CopyResolverDiagnostic;
}

/** A single ambiguity candidate in an AMBIGUOUS_BASE_ENTITY diagnostic. */
export interface AmbiguityCandidate {
  readonly name: string;
  readonly source: string;
  readonly entityKind: string;
  readonly sourcePath: string;
  readonly identity: StructuredIdentity;
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
  /** The requested structured identity from the _copy value. */
  readonly requestedIdentity?: StructuredIdentity;
  /** Source entity kind (collection) of the record that initiated resolution. */
  readonly sourceEntityKind?: string;
  /** Physical file path of the source record. */
  readonly sourcePath?: string;
  /** Allowed entity kinds for the source entity kind. */
  readonly allowedEntityKinds?: readonly string[];
  /** Inheritance chain built up to the point of failure. */
  readonly chain?: readonly CopyChainStep[];
  /** Candidates matched during AMBIGUOUS_BASE_ENTITY. */
  readonly ambiguityCandidates?: readonly AmbiguityCandidate[];
  /** Invalid discriminator field and value for INVALID_DISCRIMINATOR_VALUE. */
  readonly invalidDiscriminatorField?: string;
  readonly invalidDiscriminatorValue?: unknown;
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
  | "INVALID_PRESERVE_VALUE"
  /** Cross-collection copy is not permitted for the given entity kind relationship. */
  | "CROSS_COLLECTION_COPY_DENIED"
  /** A discriminator value in the _copy identity has an invalid type. */
  | "INVALID_DISCRIMINATOR_VALUE";

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
  // with a valid discriminator value
  let hasValidIdentity = false;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("_") || key === "source") {
      continue;
    }
    if (isValidDiscriminatorValue(key, val)) {
      hasValidIdentity = true;
    }
  }
  return hasValidIdentity;
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

export function getRecordIdentity(record: RawRecord): StructuredIdentity {
  const identity: Record<string, unknown> = { name: record.name, source: record.source };
  for (const [key, value] of Object.entries(record.remaining)) {
    if (!key.startsWith("_")) {
      identity[key] = value;
    }
  }
  return identity as StructuredIdentity;
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

/* ── Collection Compatibility Map ────────────────────────────────

   Verified cross-collection copy relationships. Each source entity kind
   maps to the set of entity kinds it is permitted to copy from.
   Cross-collection lookup is denied by default unless listed here.
   Derived from observed 5eTools _copy patterns and _meta.internalCopies.
   ─────────────────────────────────────────────────────────────────── */

const COLLECTION_COMPATIBILITY: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  // Core: each kind copies from itself
  ["monster", new Set(["monster"])],
  ["monsterFluff", new Set(["monsterFluff", "monster"])],
  ["race", new Set(["race"])],
  ["subrace", new Set(["subrace", "race"])],
  ["class", new Set(["class"])],
  ["subclass", new Set(["subclass", "class"])],
  ["subclassFeature", new Set(["subclassFeature"])],
  ["raceFeature", new Set(["raceFeature"])],
  ["background", new Set(["background"])],
  ["backgroundFeature", new Set(["backgroundFeature"])],
  ["feat", new Set(["feat"])],
  ["spell", new Set(["spell"])],
  ["item", new Set(["item"])],
  ["itemType", new Set(["itemType"])],
  ["equipment", new Set(["equipment"])],
  ["deity", new Set(["deity"])],
  ["language", new Set(["language"])],
  ["lore", new Set(["lore"])],
  ["skill", new Set(["skill"])],
  ["weapon", new Set(["weapon"])],
  ["armor", new Set(["armor"])],
  ["shield", new Set(["shield"])],
  ["tool", new Set(["tool"])],
  ["hazard", new Set(["hazard"])],
  ["location", new Set(["location"])],
  ["npc", new Set(["npc", "monster"])],
  ["properNoun", new Set(["properNoun"])],
  ["condition", new Set(["condition"])],
  ["damageType", new Set(["damageType"])],
  ["sense", new Set(["sense"])],
  ["savingThrow", new Set(["savingThrow"])],
  ["size", new Set(["size"])],
]);

/** Returns the set of entity kinds a source kind may copy from. */
function getAllowedEntityKinds(sourceKind: string): ReadonlySet<string> {
  return COLLECTION_COMPATIBILITY.get(sourceKind) ?? new Set([sourceKind]);
}

/* ── Discriminator Value Validation ──────────────────────────────

   Validates that all non-directive identity fields in a _copy value
   contain allowed scalar discriminator types. Rejects arrays, objects,
   null, empty strings, and invalid numeric values.
   ─────────────────────────────────────────────────────────────────── */

function isValidDiscriminatorValue(key: string, value: unknown): boolean {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (typeof value === "number") {
    // Integer-valued fields like level must be finite integers
    return Number.isFinite(value) && Number.isInteger(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  // Reject: null, arrays, objects, symbols, undefined, bigint
  return false;
}

interface DiscriminatorValidationFailure {
  readonly fieldName: string;
  readonly invalidValue: unknown;
  readonly valueKind: string;
}

function validateDiscriminatorValues(
  copyValue: RawCopyValue,
): DiscriminatorValidationFailure[] {
  const failures: DiscriminatorValidationFailure[] = [];
  for (const [key, value] of Object.entries(copyValue)) {
    if (key.startsWith("_") || key === "source") {
      continue;
    }
    if (!isValidDiscriminatorValue(key, value)) {
      failures.push({
        fieldName: key,
        invalidValue: value,
        valueKind: Array.isArray(value)
          ? "array"
          : value === null
            ? "null"
            : typeof value,
      });
    }
  }
  return failures;
}

/* ── Internal Helpers ──────────────────────────────────────────── */

function createDiagnostic(
  code: CopyDiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  sourceRecord?: RawRecord,
  rawCopy?: unknown,
  parseDiagnostic?: ReferenceDiagnostic,
  requestedIdentity?: StructuredIdentity,
  sourceEntityKind?: string,
  sourcePath?: string,
  allowedEntityKinds?: readonly string[],
  chain?: readonly CopyChainStep[],
  ambiguityCandidates?: readonly AmbiguityCandidate[],
  invalidDiscriminatorField?: string,
  invalidDiscriminatorValue?: unknown,
): CopyResolverDiagnostic {
  return {
    code,
    severity,
    message,
    sourceRecord,
    rawCopy,
    parseDiagnostic,
    requestedIdentity,
    sourceEntityKind,
    sourcePath,
    allowedEntityKinds,
    chain,
    ambiguityCandidates,
    invalidDiscriminatorField,
    invalidDiscriminatorValue,
  };
}

function createFailure(
  code: CopyDiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  sourceRecord?: RawRecord,
  rawCopy?: unknown,
  parseDiagnostic?: ReferenceDiagnostic,
  requestedIdentity?: StructuredIdentity,
  sourceEntityKind?: string,
  sourcePath?: string,
  allowedEntityKinds?: readonly string[],
  chain?: readonly CopyChainStep[],
  ambiguityCandidates?: readonly AmbiguityCandidate[],
  invalidDiscriminatorField?: string,
  invalidDiscriminatorValue?: unknown,
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
      requestedIdentity,
      sourceEntityKind,
      sourcePath,
      allowedEntityKinds,
      chain,
      ambiguityCandidates,
      invalidDiscriminatorField,
      invalidDiscriminatorValue,
    ),
  };
}

function formatCopyChain(chain: readonly CopyChainStep[]): string {
  return chain.map((step) => `${step.entityName}|${step.sourceAbbr} [${step.entityKind}]`).join(" -> ");
}

function createCopyChainStep(
  record: RawRecord,
  entityKind: string,
  sourcePath: string,
  identity: StructuredIdentity,
): CopyChainStep {
  return {
    entityName: record.name,
    sourceAbbr: record.source,
    entityKind,
    sourcePath,
    identity,
  };
}

function createRequestedCopyChainStep(
  identity: StructuredIdentity,
  entityKind: string,
  sourcePath: string,
): CopyChainStep {
  const chainLabel = identityToChainLabel(identity);
  return {
    entityName: chainLabel.name,
    sourceAbbr: chainLabel.source,
    entityKind,
    sourcePath,
    identity,
  };
}

interface LocatedRecord {
  readonly record: RawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
}

/**
 * Finds records matching a structured identity within allowed entity kinds.
 * By default, only searches the same entity kind as the source record.
 * Cross-collection lookup is only permitted through verified compatibility.
 * Returns located records with their entity kind and source path.
 */
function findRecordsByStructuredIdentity(
  context: CopyResolverContext,
  identity: StructuredIdentity,
  sourceEntityKind: string,
): LocatedRecord[] {
  const allowedKinds = getAllowedEntityKinds(sourceEntityKind);
  const matches: LocatedRecord[] = [];
  for (const [sourcePath, envelope] of Object.entries(context.validatedFiles)) {
    for (const collection of envelope.collections) {
      if (!allowedKinds.has(collection.entityKind)) {
        continue;
      }
      for (const record of collection.records) {
        if (recordMatchesIdentity(record, identity)) {
          matches.push({ record, entityKind: collection.entityKind, sourcePath });
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
export function recordMatchesIdentity(
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
 * Entity-kind-aware: searches only compatible collections by default.
 */
function resolveCopyChain(
  copyValue: RawCopyValue,
  context: CopyResolverContext,
  currentSourceRecord: RawRecord,
  visited: Set<string>,
  chain: CopyChainStep[],
  locatedLevels: LocatedCopyLevel[],
  depth: number,
  currentEntityKind: string,
  currentSourcePath: string,
): CopyResolutionResult {
  const identity = extractStructuredIdentity(copyValue);

  // Depth guard
  if (depth > MAX_COPY_DEPTH) {
    return createFailure(
      "COPY_CHAIN_TOO_DEEP",
      "error",
      `_copy chain exceeded maximum depth of ${MAX_COPY_DEPTH}. Chain: ${formatCopyChain(chain)}`,
      currentSourceRecord,
      copyValue,
      undefined,
      identity,
      currentEntityKind,
      currentSourcePath,
    );
  }
  const cycleKey = `${currentEntityKind}|${identityToCycleKey(identity)}`;

  // _preserve self-reference: if the identity matches the current source record itself
  if (
    currentSourceRecord.remaining._preserve === true &&
    identityMatchesSourceRecord(identity, currentSourceRecord)
  ) {
    return {
      status: "resolved",
      baseEntity: preservedRecord(currentSourceRecord),
      chain: Object.freeze([
        ...chain,
        createCopyChainStep(currentSourceRecord, currentEntityKind, currentSourcePath, identity),
      ]),
      locatedLevels: Object.freeze([
        ...locatedLevels,
        {
          record: currentSourceRecord,
          entityKind: currentEntityKind,
          sourcePath: currentSourcePath,
          identity,
        },
      ]),
    };
  }

  // Cycle detection
  if (visited.has(cycleKey)) {
    const chainLabel = identityToChainLabel(identity);
    const cycleChain: CopyChainStep[] = [
      ...chain,
      {
        entityName: chainLabel.name,
        sourceAbbr: chainLabel.source,
        entityKind: currentEntityKind,
        sourcePath: currentSourcePath,
        identity,
      },
    ];
    return createFailure(
      "CIRCULAR_COPY_REFERENCE",
      "error",
      `Circular _copy reference detected: "${cycleKey}" appears multiple times in chain: ${formatCopyChain(cycleChain)}`,
      currentSourceRecord,
      copyValue,
      undefined,
      identity,
      currentEntityKind,
      currentSourcePath,
      undefined,
      Object.freeze(cycleChain),
    );
  }

  visited.add(cycleKey);

  // Find base entities matching ALL identity fields within allowed entity kinds
  const candidates = findRecordsByStructuredIdentity(context, identity, currentEntityKind);

  if (candidates.length === 0) {
    const allowedKinds = getAllowedEntityKinds(currentEntityKind);
    const failureChain = [
      ...chain,
      createRequestedCopyChainStep(identity, currentEntityKind, currentSourcePath),
    ];
    return createFailure(
      "BASE_ENTITY_NOT_FOUND",
      "error",
      `Base entity matching identity ${JSON.stringify(identity)} not found in allowed entity kinds [${[...allowedKinds].sort().join(", ")}]. Source entity kind: "${currentEntityKind}". Source path: "${currentSourcePath}". Referenced by "${currentSourceRecord.name}" (${currentSourceRecord.source}).`,
      currentSourceRecord,
      copyValue,
      undefined,
      identity,
      currentEntityKind,
      currentSourcePath,
      Object.freeze([...allowedKinds]),
      Object.freeze(failureChain),
    );
  }

  if (candidates.length > 1) {
    const failureChain = [
      ...chain,
      createRequestedCopyChainStep(identity, currentEntityKind, currentSourcePath),
    ];
    const candidateDescs = candidates
      .map((c) => `"${c.record.name}" (${c.record.source}) [${c.entityKind}] at "${c.sourcePath}"`)
      .join(", ");
    const ambiguityCandidates: AmbiguityCandidate[] = candidates.map((c) => ({
      name: c.record.name,
      source: c.record.source,
      entityKind: c.entityKind,
      sourcePath: c.sourcePath,
      identity: getRecordIdentity(c.record),
    }));
    return createFailure(
      "AMBIGUOUS_BASE_ENTITY",
      "error",
      `Found ${candidates.length} candidates matching identity ${JSON.stringify(identity)} within entity kind "${currentEntityKind}": ${candidateDescs}. Referenced by "${currentSourceRecord.name}" (${currentSourceRecord.source}).`,
      currentSourceRecord,
      copyValue,
      undefined,
      identity,
      currentEntityKind,
      currentSourcePath,
      undefined,
      Object.freeze(failureChain),
      Object.freeze(ambiguityCandidates),
    );
  }

  const matched = candidates[0]!;
  const baseEntity = matched.record;
  chain.push(createCopyChainStep(baseEntity, matched.entityKind, matched.sourcePath, identity));
  const nextLocatedLevels: LocatedCopyLevel[] = [
    ...locatedLevels,
    {
      record: baseEntity,
      entityKind: matched.entityKind,
      sourcePath: matched.sourcePath,
      identity,
    },
  ];

  // If the base entity itself has a _copy, recurse using the located entity kind and source path
  const baseCopy = baseEntity.remaining._copy;
  if (baseCopy !== undefined && isRawCopyValue(baseCopy)) {
    return resolveCopyChain(
      baseCopy,
      context,
      baseEntity,
      visited,
      chain,
      nextLocatedLevels,
      depth + 1,
      matched.entityKind,
      matched.sourcePath,
    );
  }

  // Base entity has no further _copy — resolution complete
  return {
    status: "resolved",
    baseEntity,
    chain: Object.freeze(chain),
    locatedLevels: Object.freeze(nextLocatedLevels),
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
 * @param options - Optional parameters for entity-kind-aware resolution.
 * @returns A success result with the base entity, or a failure with diagnostics.
 */
export function resolveCopy(
  record: unknown,
  context: CopyResolverContext,
  options?: { sourceEntityKind?: string; sourcePath?: string },
): CopyResolutionResult {
  // Validate record input
  if (!isPlainObject(record)) {
    return createFailure(
      "COPY_FIELD_INVALID_TYPE",
      "error",
      `Expected a record object for _copy resolution, got ${typeof record}`,
      undefined,
      record,
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
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
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
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
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
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
      undefined,
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
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
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
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
        undefined,
        options?.sourceEntityKind,
        options?.sourcePath,
      );
    }

    if (!isCanonicalParsedReference(parsed)) {
      return createFailure(
        "UNPARSEABLE_COPY_REFERENCE",
        "error",
        `_copy reference for "${rawRecord.name}" produced an unsupported reference kind: "${parsed.kind}". Expected canonical reference.`,
        rawRecord,
        copyValue,
        undefined,
        undefined,
        options?.sourceEntityKind,
        options?.sourcePath,
      );
    }
  }

  // Validate discriminator values
  const discriminatorFailures = validateDiscriminatorValues(copyValue);
  if (discriminatorFailures.length > 0) {
    const failureDetails = discriminatorFailures
      .map((f) => `"${f.fieldName}" has invalid value (type: ${f.valueKind})`)
      .join("; ");
    return createFailure(
      "INVALID_DISCRIMINATOR_VALUE",
      "error",
      `Invalid discriminator values in _copy for "${rawRecord.name}" (${rawRecord.source}): ${failureDetails}. Entity kind: "${options?.sourceEntityKind ?? "unknown"}". Source path: "${options?.sourcePath ?? "unknown"}".`,
      rawRecord,
      copyValue,
      undefined,
      undefined,
      options?.sourceEntityKind,
      options?.sourcePath,
      undefined,
      undefined,
      undefined,
      discriminatorFailures[0]?.fieldName,
      discriminatorFailures[0]?.invalidValue,
    );
  }

  const sourceEntityKind = options?.sourceEntityKind ?? "unknown";
  const sourcePath = options?.sourcePath ?? "unknown";

  // Resolve the copy chain
  return resolveCopyChain(
    copyValue,
    context,
    rawRecord,
    new Set(),
    [],
    [],
    0,
    sourceEntityKind,
    sourcePath,
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
  options?: { sourceEntityKind?: string; sourcePath?: string },
): RawRecord {
  const result = resolveCopy(record, context, options);

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
  options?: { sourceEntityKind?: string; sourcePath?: string },
): CopyResolutionResult[] {
  return records.map((record) => resolveCopy(record, context, options));
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
