import type { DiagnosticSeverity } from "./raw-loader";

/* ── Canonical Reference Types ───────────────────────────────────

   5eTools uses pipe-delimited string references like "sickle|PHB"
   and structured {name, source} objects in _copy fields. This module
   parses both forms into a canonical structured representation.

   The parser does NOT resolve references to EntityIds — that happens
   later in the normalization phase. It only extracts the raw identity
   components (entity name + source abbreviation).
─────────────────────────────────────────────────────────────────── */

/** Parsed canonical reference with entity name and source abbreviation. */
export interface CanonicalReference {
  /** Entity name as it appears in 5eTools data (e.g. "sickle", "Magic Initiate; Cleric"). */
  readonly entityName: string;
  /** Source abbreviation (e.g. "PHB", "XPHB", "TCE"). */
  readonly sourceAbbr: string;
}

/** Structured reference object found in _copy, _versions, etc. */
export interface StructuredReference {
  readonly name: string;
  readonly source: string;
}

/** Subclass feature reference with nested pipe-delimited segments. */
export interface SubclassFeatureReference {
  readonly featureName: string;
  readonly className: string;
  readonly subclass: string;
  readonly level: number;
}

/** Discriminated union of all reference kinds this parser can produce. */
export type ParsedReference =
  | { kind: "canonical"; ref: CanonicalReference }
  | { kind: "subclass-feature"; ref: SubclassFeatureReference }
  | { kind: "inline"; tag: string; segments: string[] };

/** Diagnosis emitted when a reference cannot be fully parsed. */
export interface ReferenceDiagnostic {
  readonly code: ReferenceDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly raw: unknown;
  readonly path?: string;
}

export type ReferenceDiagnosticCode =
  | "EMPTY_REFERENCE"
  | "MISSING_SOURCE"
  | "MISSING_NAME"
  | "INVALID_SUBCLASS_FEATURE"
  | "UNPARSEABLE_REFERENCE"
  | "STRUCTURED_REF_MISSING_FIELD";

/** Error class for reference parsing failures. */
export class ReferenceParserError extends Error {
  public readonly code: ReferenceDiagnosticCode;
  public readonly raw: unknown;

  public constructor(code: ReferenceDiagnosticCode, raw: unknown, message: string) {
    super(message);
    this.name = "ReferenceParserError";
    this.code = code;
    this.raw = raw;
  }
}

/* ── Parsing Functions ─────────────────────────────────────────── */

/**
 * Parses a pipe-delimited 5eTools reference string into a canonical
 * reference. The source abbreviation is the last pipe-separated segment.
 *
 * Handles:
 * - Simple: "sickle|PHB" -> { entityName: "sickle", sourceAbbr: "PHB" }
 * - Name with special chars: "Alchemist's Fire (flask)|PHB" -> ...
 * - Name with semicolons: "Magic Initiate; Cleric|XPHB" -> ...
 * - No source: "bard" -> { entityName: "bard", sourceAbbr: "" }
 *
 * Does NOT handle subclass feature refs here — use parseSubclassFeatureRef.
 */
export function parseCanonicalReference(raw: unknown, path?: string): ParsedReference | ReferenceDiagnostic {
  if (typeof raw !== "string") {
    return {
      code: "UNPARSEABLE_REFERENCE",
      severity: "error",
      message: `Expected string reference, got ${typeof raw}`,
      raw,
      path,
    };
  }

  if (raw.length === 0) {
    return {
      code: "EMPTY_REFERENCE",
      severity: "warning",
      message: "Empty reference string",
      raw,
      path,
    };
  }

  // Subclass feature refs have multiple empty segments: "Feature|Class||Subclass||Level"
  // Detect by checking for consecutive pipes
  if (raw.includes("||")) {
    const subResult = parseSubclassFeatureRef(raw, path);
    return subResult;
  }

  // Split on last pipe to separate name from source
  const lastPipe = raw.lastIndexOf("|");

  if (lastPipe === -1) {
    // No source abbreviation — entity name only
    return {
      kind: "canonical",
      ref: createCanonicalReference(raw, ""),
    };
  }

  if (lastPipe === 0) {
    // Pipe at start — no entity name
    return {
      code: "MISSING_NAME",
      severity: "error",
      message: `Reference has no entity name: "${raw}"`,
      raw,
      path,
    };
  }

  if (lastPipe === raw.length - 1) {
    // Pipe at end — no source
    return {
      code: "MISSING_SOURCE",
      severity: "warning",
      message: `Reference has no source abbreviation: "${raw}"`,
      raw,
      path,
    };
  }

  const entityName = raw.slice(0, lastPipe);
  const sourceAbbr = raw.slice(lastPipe + 1);

  return {
    kind: "canonical",
    ref: createCanonicalReference(entityName, sourceAbbr),
  };
}

/**
 * Parses a subclass feature reference with nested pipe-delimited segments.
 * Format: "FeatureName|ClassName||Subclass||Level"
 *
 * Example: "Abjuration Savant|Wizard||Abjuration||2"
 */
export function parseSubclassFeatureRef(raw: string, path?: string): ParsedReference | ReferenceDiagnostic {
  const segments = raw.split("|");

  // Expected: [featureName, className, "", subclass, "", level]
  // Minimum valid structure needs at least 6 segments
  if (segments.length < 6) {
    return {
      code: "INVALID_SUBCLASS_FEATURE",
      severity: "error",
      message: `Subclass feature reference too short (need ≥6 pipe segments, got ${segments.length}): "${raw}"`,
      raw,
      path,
    };
  }

  const featureName = segments[0] ?? "";
  const className = segments[1] ?? "";
  const subclass = segments[3] ?? "";
  const levelStr = segments[5] ?? "";

  const level = parseInt(levelStr, 10);
  if (isNaN(level)) {
    return {
      code: "INVALID_SUBCLASS_FEATURE",
      severity: "error",
      message: `Invalid level in subclass feature reference: "${levelStr}" in "${raw}"`,
      raw,
      path,
    };
  }

  return {
    kind: "subclass-feature",
    ref: {
      featureName,
      className,
      subclass,
      level,
    },
  };
}

/**
 * Parses an inline text reference found in entries.
 * Format: "{@tag name|Source}" or "{@tag name|Source|extra}"
 *
 * Examples:
 * - "{@item dagger|PHB}" -> { tag: "item", segments: ["dagger", "PHB"] }
 * - "{@class fighter|phb|Battle Master}" -> { tag: "class", segments: ["fighter", "phb", "Battle Master"] }
 * - "{@damage 1d6}" -> { tag: "damage", segments: ["1d6"] }
 */
export function parseInlineReference(raw: unknown, path?: string): ParsedReference | ReferenceDiagnostic {
  if (typeof raw !== "string") {
    return {
      code: "UNPARSEABLE_REFERENCE",
      severity: "error",
      message: `Expected string for inline reference, got ${typeof raw}`,
      raw,
      path,
    };
  }

  const match = raw.match(/^\{@(\w+)\s+(.+?)\}$/);

  if (!match || !match[1] || !match[2]) {
    return {
      code: "UNPARSEABLE_REFERENCE",
      severity: "error",
      message: `Not a valid inline reference format: "${raw}"`,
      raw,
      path,
    };
  }

  const tag = match[1];
  const content = match[2];
  const segments = content.split("|");

  return {
    kind: "inline",
    tag,
    segments,
  };
}

/**
 * Parses a structured reference object {name, source} found in _copy,
 * _versions, etc. Returns a canonical reference.
 */
export function parseStructuredReference(raw: unknown, path?: string): ParsedReference | ReferenceDiagnostic {
  if (!isStructuredReference(raw)) {
    return {
      code: "STRUCTURED_REF_MISSING_FIELD",
      severity: "error",
      message: `Not a valid structured reference: missing 'name' or 'source' fields`,
      raw,
      path,
    };
  }

  if (!raw.name || typeof raw.name !== "string") {
    return {
      code: "MISSING_NAME",
      severity: "error",
      message: `Structured reference has invalid or missing 'name'`,
      raw,
      path,
    };
  }

  if (!raw.source || typeof raw.source !== "string") {
    return {
      code: "MISSING_SOURCE",
      severity: "error",
      message: `Structured reference has invalid or missing 'source'`,
      raw,
      path,
    };
  }

  return {
    kind: "canonical",
    ref: createCanonicalReference(raw.name.trim(), raw.source.trim()),
  };
}

/**
 * Universal parser that auto-detects the reference format and delegates
 * to the appropriate parser.
 */
export function parseReference(raw: unknown, path?: string): ParsedReference | ReferenceDiagnostic {
  if (raw === null || raw === undefined) {
    return {
      code: "EMPTY_REFERENCE",
      severity: "warning",
      message: "Reference is null or undefined",
      raw,
      path,
    };
  }

  // String reference
  if (typeof raw === "string") {
    if (raw.startsWith("{@")) {
      return parseInlineReference(raw, path);
    }
    return parseCanonicalReference(raw, path);
  }

  // Structured reference object
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return parseStructuredReference(raw, path);
  }

  return {
    code: "UNPARSEABLE_REFERENCE",
    severity: "error",
    message: `Cannot parse reference of type ${typeof raw}`,
    raw,
    path,
  };
}

/* ── Factory Functions ─────────────────────────────────────────── */

/** Creates a frozen CanonicalReference. */
export function createCanonicalReference(entityName: string, sourceAbbr: string): CanonicalReference {
  return Object.freeze({
    entityName: entityName.trim(),
    sourceAbbr: sourceAbbr.trim(),
  });
}

/* ── Type Guards ───────────────────────────────────────────────── */

export function isCanonicalReference(value: unknown): value is CanonicalReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "entityName" in value &&
    "sourceAbbr" in value &&
    typeof (value as Record<string, unknown>).entityName === "string" &&
    typeof (value as Record<string, unknown>).sourceAbbr === "string"
  );
}

export function isStructuredReference(value: unknown): value is StructuredReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "source" in value &&
    typeof (value as Record<string, unknown>).name === "string" &&
    typeof (value as Record<string, unknown>).source === "string"
  );
}

export function isParsedReference(value: unknown): value is ParsedReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as Record<string, unknown>).kind === "string"
  );
}

export function isSuccessParsedReference(value: ParsedReference | ReferenceDiagnostic): value is ParsedReference {
  return isParsedReference(value);
}

export function isDiagnosticParsedReference(value: ParsedReference | ReferenceDiagnostic): value is ReferenceDiagnostic {
  return !isParsedReference(value);
}

export function isCanonicalParsedReference(value: ParsedReference): value is { kind: "canonical"; ref: CanonicalReference } {
  return value.kind === "canonical";
}

export function isSubclassFeatureParsedReference(value: ParsedReference): value is { kind: "subclass-feature"; ref: SubclassFeatureReference } {
  return value.kind === "subclass-feature";
}

export function isInlineParsedReference(value: ParsedReference): value is { kind: "inline"; tag: string; segments: string[] } {
  return value.kind === "inline";
}

/**
 * Checks if a string looks like a 5eTools pipe-delimited reference
 * (contains a pipe character).
 */
export function isPipeDelimitedReference(value: unknown): value is string {
  return typeof value === "string" && value.includes("|");
}

/**
 * Checks if a string looks like an inline reference ({@tag ...}).
 */
export function isInlineReferenceString(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("{@") && value.endsWith("}");
}

/**
 * Extracts the source abbreviation from a pipe-delimited reference string.
 * Returns undefined if the string is not a valid reference.
 */
export function extractSourceAbbr(raw: string): string | undefined {
  const lastPipe = raw.lastIndexOf("|");
  if (lastPipe === -1 || lastPipe === raw.length - 1) {
    return undefined;
  }
  return raw.slice(lastPipe + 1);
}

/**
 * Extracts the entity name from a pipe-delimited reference string.
 * Returns undefined if the string is not a valid reference.
 */
export function extractEntityName(raw: string): string | undefined {
  const lastPipe = raw.lastIndexOf("|");
  if (lastPipe === -1 || lastPipe === 0) {
    return undefined;
  }
  return raw.slice(0, lastPipe);
}
