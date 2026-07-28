import type { Ruleset } from "@obsidian-dnd/domain";
import { isRuleset } from "@obsidian-dnd/domain";
import type { RuleEffect, SheetProjection } from "@obsidian-dnd/catalog-contract";
import { isRuleEffect, isSheetProjection } from "@obsidian-dnd/catalog-contract";

/* ── Schema version ─────────────────────────────────────────────── */

export const SEMANTIC_MAPPING_SCHEMA_VERSION = 2;

/* ── Semantic mapping key ───────────────────────────────────────── */

export interface SemanticMappingKey {
  readonly entityId: string;
  readonly ruleset: Ruleset;
  readonly fieldId: string;
}

export function isSemanticMappingKey(value: unknown): value is SemanticMappingKey {
  // Reject non-objects, null, and arrays
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  // Reject non-plain objects
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;

  // Reject symbol properties
  if (Object.getOwnPropertySymbols(value).length > 0) return false;

  // Check for accessors on own properties
  const ownNames = Object.getOwnPropertyNames(value);
  for (const name of ownNames) {
    const desc = Object.getOwnPropertyDescriptor(value, name);
    if (desc && (desc.get !== undefined || desc.set !== undefined)) return false;
  }

  const obj = value as Record<string, unknown>;

  // Exact shape: reject unknown properties
  for (const k of ownNames) {
    if (!ALLOWED_KEY_KEYS.has(k)) return false;
  }

  // Validate entityId: non-empty string, trimmed, not whitespace-only
  if (typeof obj.entityId !== "string") return false;
  if (obj.entityId.length === 0) return false;
  if (!/\S/.test(obj.entityId)) return false;
  if (obj.entityId !== obj.entityId.trim()) return false;

  // Validate ruleset
  if (!isRuleset(obj.ruleset)) return false;

  // Validate fieldId: non-empty string, trimmed, not whitespace-only
  if (typeof obj.fieldId !== "string") return false;
  if (obj.fieldId.length === 0) return false;
  if (!/\S/.test(obj.fieldId)) return false;
  if (obj.fieldId !== obj.fieldId.trim()) return false;

  return true;
}

function mappingKeyToString(key: SemanticMappingKey): string {
  return `${key.ruleset}:${key.entityId}:${key.fieldId}`;
}

/* ── Semantic mapping entry ─────────────────────────────────────── */

export interface SemanticMappingEntry {
  readonly key: SemanticMappingKey;
  readonly mappingVersion: number;
  readonly sourceRevision: string;
  readonly sourceFingerprint?: string;
  readonly effect: RuleEffect;
  readonly defaultProjection?: SheetProjection;
  readonly reviewedBy: string;
  readonly reviewedAt: string;
}

const ALLOWED_ENTRY_KEYS = new Set([
  "key",
  "mappingVersion",
  "sourceRevision",
  "sourceFingerprint",
  "effect",
  "defaultProjection",
  "reviewedBy",
  "reviewedAt",
]);

const ALLOWED_KEY_KEYS = new Set(["entityId", "ruleset", "fieldId"]);

/* ── Recursive executable content detection ─────────────────────── */

function containsExecutableContent(value: unknown, path: string = ""): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "function") {
    return `function at "${path}"`;
  }

  if (typeof value === "symbol") {
    return `symbol at "${path}"`;
  }

  if (typeof value === "bigint") {
    return `bigint at "${path}"`;
  }

  if (typeof value !== "object") {
    return null;
  }

  // Check for non-plain objects (Date, RegExp, etc.)
  const constructor = Object.getPrototypeOf(value)?.constructor;
  if (constructor && constructor.name !== "Object" && constructor.name !== "Array") {
    // Allow Date objects that are part of validated RuleEffect metadata
    // but reject other non-plain objects
    if (constructor.name === "Date") {
      return `Date object at "${path}"`;
    }
    return `non-plain object (${constructor.name}) at "${path}"`;
  }

  // Check for accessors on the object
  const ownProps = Object.getOwnPropertyNames(value);
  for (const prop of ownProps) {
    const descriptor = Object.getOwnPropertyDescriptor(value, prop);
    if (descriptor && (descriptor.get !== undefined || descriptor.set !== undefined)) {
      return `accessor at "${path}.${prop}"`;
    }
  }

  // Check for functions in object values
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const result = containsExecutableContent(value[i], `${path}[${i}]`);
      if (result !== null) return result;
    }
  } else {
    for (const [k, v] of Object.entries(value)) {
      const result = containsExecutableContent(v, `${path}.${k}`);
      if (result !== null) return result;
    }
  }

  return null;
}

/* ── Validation helpers ─────────────────────────────────────────── */

const SOURCE_REVISION_RE = /^[0-9a-f]{40}$/;

function isValidSourceRevision(rev: string): boolean {
  return SOURCE_REVISION_RE.test(rev);
}

const FINGERPRINT_RE = /^[0-9a-f]{64}$/;

function isValidFingerprint(fp: string): boolean {
  return FINGERPRINT_RE.test(fp);
}

function isValidMappingVersion(v: unknown): boolean {
  if (typeof v !== "number") return false;
  if (!Number.isFinite(v)) return false;
  if (!Number.isSafeInteger(v)) return false;
  if (v < 1) return false;
  return true;
}

function isValidReviewerIdentity(name: string): boolean {
  if (name.length === 0) return false;
  if (name !== name.trim()) return false;
  // Must contain at least one non-whitespace character
  if (!/\S/.test(name)) return false;
  return true;
}

function isValidTimestamp(ts: string): boolean {
  // Must match canonical UTC ISO-8601 with milliseconds: YYYY-MM-DDTHH:mm:ss.sssZ
  const canonicalRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!canonicalRe.test(ts)) return false;

  const d = new Date(ts);
  if (isNaN(d.getTime())) return false;

  // Must round-trip through toISOString()
  return d.toISOString() === ts;
}

/* ── Entry guard ────────────────────────────────────────────────── */

export function isSemanticMappingEntry(value: unknown): value is SemanticMappingEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Exact entry shape: reject unknown top-level keys
  for (const k of Object.keys(obj)) {
    if (!ALLOWED_ENTRY_KEYS.has(k)) return false;
  }

  // Recursive executable content check
  const execIssue = containsExecutableContent(obj);
  if (execIssue !== null) return false;

  // Validate key
  if (!isSemanticMappingKey(obj.key)) return false;

  // Check key has no extra properties
  const keyObj = obj.key as unknown as Record<string, unknown>;
  for (const k of Object.keys(keyObj)) {
    if (!ALLOWED_KEY_KEYS.has(k)) return false;
  }

  // Validate mappingVersion
  if (!isValidMappingVersion(obj.mappingVersion)) return false;

  // Validate sourceRevision
  if (typeof obj.sourceRevision !== "string") return false;
  if (!isValidSourceRevision(obj.sourceRevision)) return false;

  // Validate sourceFingerprint (optional)
  if (obj.sourceFingerprint !== undefined) {
    if (typeof obj.sourceFingerprint !== "string") return false;
    if (!isValidFingerprint(obj.sourceFingerprint)) return false;
  }

  // Validate effect
  if (!isRuleEffect(obj.effect)) return false;

  // Validate defaultProjection (optional)
  if (obj.defaultProjection !== undefined) {
    if (!isSheetProjection(obj.defaultProjection)) return false;
  }

  // Validate reviewedBy
  if (typeof obj.reviewedBy !== "string") return false;
  if (!isValidReviewerIdentity(obj.reviewedBy)) return false;

  // Validate reviewedAt
  if (typeof obj.reviewedAt !== "string") return false;
  if (!isValidTimestamp(obj.reviewedAt)) return false;

  return true;
}

/* ── Semantic mapping registry ──────────────────────────────────── */

export interface SemanticMappingRegistry {
  readonly schemaVersion: number;
  readonly mappings: readonly SemanticMappingEntry[];
}

export function isSemanticMappingRegistry(value: unknown): value is SemanticMappingRegistry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") return false;
  if (obj.schemaVersion !== SEMANTIC_MAPPING_SCHEMA_VERSION) return false;
  if (!Array.isArray(obj.mappings)) return false;
  return obj.mappings.every((m: unknown) => isSemanticMappingEntry(m));
}

/* ── Diagnostic codes ───────────────────────────────────────────── */

export type SemanticMappingDiagnosticCode =
  | "INVALID_MAPPING"
  | "UNMAPPED_FIELD"
  | "STALE_MAPPING"
  | "EXECUTABLE_CONTENT"
  | "SCHEMA_VERSION_MISMATCH"
  | "DUPLICATE_MAPPING"
  | "INVALID_EFFECT"
  | "INVALID_PROJECTION"
  | "INVALID_SOURCE_REVISION"
  | "INVALID_FINGERPRINT"
  | "MISSING_REVIEWER"
  | "INVALID_TIMESTAMP";

/* ── Diagnostic ─────────────────────────────────────────────────── */

export interface SemanticMappingDiagnostic {
  readonly code: SemanticMappingDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly entityId?: string;
  readonly ruleset?: Ruleset;
  readonly fieldId?: string;
  readonly sourceRevision?: string;
  readonly sourceFingerprint?: string;
  readonly mappingVersion?: number;
  readonly defaultProjection?: SheetProjection;
}

/* ── Mapping result ─────────────────────────────────────────────── */

export type MappingMethod = "structured" | "reviewed-mapping";

export interface SemanticMappingResult {
  readonly mapped: boolean;
  readonly entry?: SemanticMappingEntry;
  readonly mappingMethod: MappingMethod;
  readonly diagnostics: readonly SemanticMappingDiagnostic[];
}

/* ── Validation ─────────────────────────────────────────────────── */

function createDiagnostic(
  overrides: Omit<SemanticMappingDiagnostic, "code" | "severity" | "message"> & {
    code: SemanticMappingDiagnosticCode;
    severity: "warning" | "error";
    message: string;
  },
): SemanticMappingDiagnostic {
  return Object.freeze(overrides);
}

export function validateSemanticMappingEntry(entry: unknown): readonly SemanticMappingDiagnostic[] {
  const diagnostics: SemanticMappingDiagnostic[] = [];

  // 1. Check that the value is an object
  if (typeof entry !== "object" || entry === null) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Mapping entry is not a valid object.",
    }));
    return Object.freeze(diagnostics);
  }

  const obj = entry as Record<string, unknown>;

  // 2. Check for unknown top-level properties
  const unknownProps: string[] = [];
  for (const k of Object.keys(obj)) {
    if (!ALLOWED_ENTRY_KEYS.has(k)) {
      unknownProps.push(k);
    }
  }
  if (unknownProps.length > 0) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: `Mapping entry has unknown top-level properties: ${unknownProps.join(", ")}.`,
    }));
  }

  // 3. Check that key exists and is a valid exact SemanticMappingKey
  const keyValid = isSemanticMappingKey(obj.key);
  if (!keyValid) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Mapping entry has an invalid or missing key.",
    }));
  }

  // Helper: safely access key fields for diagnostic context
  const key = keyValid ? (obj.key as SemanticMappingKey) : undefined;
  const keyContext: { entityId?: string; ruleset?: Ruleset; fieldId?: string } = key
    ? { entityId: key.entityId, ruleset: key.ruleset, fieldId: key.fieldId }
    : {};

  // 4. Continue validating all safely accessible fields

  // Mapping version validation
  if (obj.mappingVersion !== undefined) {
    if (!isValidMappingVersion(obj.mappingVersion)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_MAPPING",
        severity: "error",
        message: `Mapping entry has invalid mapping version "${obj.mappingVersion}".`,
        ...keyContext,
        mappingVersion: obj.mappingVersion as number,
      }));
    }
  } else {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Mapping entry is missing mappingVersion.",
      ...keyContext,
    }));
  }

  // Source revision validation
  if (obj.sourceRevision !== undefined) {
    if (typeof obj.sourceRevision !== "string" || !isValidSourceRevision(obj.sourceRevision)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_SOURCE_REVISION",
        severity: "error",
        message: `Mapping entry has invalid source revision "${obj.sourceRevision}".`,
        ...keyContext,
        sourceRevision: typeof obj.sourceRevision === "string" ? obj.sourceRevision : undefined,
      }));
    }
  } else {
    diagnostics.push(createDiagnostic({
      code: "INVALID_SOURCE_REVISION",
      severity: "error",
      message: "Mapping entry is missing sourceRevision.",
      ...keyContext,
    }));
  }

  // Fingerprint validation (optional field)
  if (obj.sourceFingerprint !== undefined) {
    if (typeof obj.sourceFingerprint !== "string" || !isValidFingerprint(obj.sourceFingerprint)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_FINGERPRINT",
        severity: "error",
        message: `Mapping entry has invalid source fingerprint "${obj.sourceFingerprint}".`,
        ...keyContext,
        sourceFingerprint: typeof obj.sourceFingerprint === "string" ? obj.sourceFingerprint : undefined,
      }));
    }
  }

  // Effect validation
  if (obj.effect !== undefined) {
    if (!isRuleEffect(obj.effect)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_EFFECT",
        severity: "error",
        message: "Mapping entry has invalid effect payload.",
        ...keyContext,
      }));
    }
  } else {
    diagnostics.push(createDiagnostic({
      code: "INVALID_EFFECT",
      severity: "error",
      message: "Mapping entry is missing effect.",
      ...keyContext,
    }));
  }

  // Default projection validation (optional field)
  if (obj.defaultProjection !== undefined) {
    if (!isSheetProjection(obj.defaultProjection)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_PROJECTION",
        severity: "error",
        message: `Mapping entry has invalid default projection "${obj.defaultProjection}".`,
        ...keyContext,
        defaultProjection: obj.defaultProjection as SheetProjection,
      }));
    }
  }

  // Reviewer validation
  if (obj.reviewedBy !== undefined) {
    if (typeof obj.reviewedBy !== "string" || !isValidReviewerIdentity(obj.reviewedBy)) {
      diagnostics.push(createDiagnostic({
        code: "MISSING_REVIEWER",
        severity: "error",
        message: "Mapping entry has invalid reviewer identity.",
        ...keyContext,
      }));
    }
  } else {
    diagnostics.push(createDiagnostic({
      code: "MISSING_REVIEWER",
      severity: "error",
      message: "Mapping entry is missing reviewedBy.",
      ...keyContext,
    }));
  }

  // Timestamp validation
  if (obj.reviewedAt !== undefined) {
    if (typeof obj.reviewedAt !== "string" || !isValidTimestamp(obj.reviewedAt)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_TIMESTAMP",
        severity: "error",
        message: `Mapping entry has invalid review timestamp "${obj.reviewedAt}".`,
        ...keyContext,
      }));
    }
  } else {
    diagnostics.push(createDiagnostic({
      code: "INVALID_TIMESTAMP",
      severity: "error",
      message: "Mapping entry is missing reviewedAt.",
      ...keyContext,
    }));
  }

  // Recursive executable content check
  const execIssue = containsExecutableContent(obj);
  if (execIssue !== null) {
    diagnostics.push(createDiagnostic({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
      message: `Mapping entry contains executable content: ${execIssue}.`,
      ...keyContext,
    }));
  }

  return Object.freeze(diagnostics);
}

export function validateSemanticMappingRegistry(
  registry: SemanticMappingRegistry,
): readonly SemanticMappingDiagnostic[] {
  const diagnostics: SemanticMappingDiagnostic[] = [];

  if (registry.schemaVersion !== SEMANTIC_MAPPING_SCHEMA_VERSION) {
    diagnostics.push(createDiagnostic({
      code: "SCHEMA_VERSION_MISMATCH",
      severity: "error",
      message: `Registry schema version ${registry.schemaVersion} does not match expected version ${SEMANTIC_MAPPING_SCHEMA_VERSION}.`,
    }));
  }

  const seenKeys = new Set<string>();
  for (const entry of registry.mappings) {
    const entryDiagnostics = validateSemanticMappingEntry(entry);
    diagnostics.push(...entryDiagnostics);

    const keyStr = mappingKeyToString(entry.key);
    if (seenKeys.has(keyStr)) {
      diagnostics.push(createDiagnostic({
        code: "DUPLICATE_MAPPING",
        severity: "warning",
        message: `Duplicate mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" ruleset "${entry.key.ruleset}".`,
        entityId: entry.key.entityId,
        ruleset: entry.key.ruleset,
        fieldId: entry.key.fieldId,
      }));
    }
    seenKeys.add(keyStr);
  }

  return Object.freeze(diagnostics);
}

/* ── Registry factory ───────────────────────────────────────────── */

export function createSemanticMappingRegistry(
  mappings: readonly SemanticMappingEntry[],
): SemanticMappingRegistry {
  return Object.freeze({
    schemaVersion: SEMANTIC_MAPPING_SCHEMA_VERSION,
    mappings: Object.freeze(mappings),
  });
}
