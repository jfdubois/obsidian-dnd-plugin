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
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.entityId !== "string" || obj.entityId.length === 0) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (typeof obj.fieldId !== "string" || obj.fieldId.length === 0) return false;
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

export function validateSemanticMappingEntry(entry: SemanticMappingEntry): readonly SemanticMappingDiagnostic[] {
  const diagnostics: SemanticMappingDiagnostic[] = [];
  const obj = entry as unknown as Record<string, unknown>;

  // Recursive executable content check
  const execIssue = containsExecutableContent(obj);
  if (execIssue !== null) {
    diagnostics.push(createDiagnostic({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" contains executable content: ${execIssue}.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
    }));
  }

  // Source revision validation
  if (typeof entry.sourceRevision !== "string" || !isValidSourceRevision(entry.sourceRevision)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_SOURCE_REVISION",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid source revision "${entry.sourceRevision}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
      sourceRevision: entry.sourceRevision,
    }));
  }

  // Fingerprint validation
  if (entry.sourceFingerprint !== undefined) {
    if (typeof entry.sourceFingerprint !== "string" || !isValidFingerprint(entry.sourceFingerprint)) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_FINGERPRINT",
        severity: "error",
        message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid source fingerprint "${entry.sourceFingerprint}".`,
        entityId: entry.key.entityId,
        ruleset: entry.key.ruleset,
        fieldId: entry.key.fieldId,
        sourceFingerprint: entry.sourceFingerprint,
      }));
    }
  }

  // Mapping version validation
  if (!isValidMappingVersion(entry.mappingVersion)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid mapping version "${entry.mappingVersion}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
      mappingVersion: entry.mappingVersion,
    }));
  }

  // Effect validation
  if (!isRuleEffect(entry.effect)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_EFFECT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid effect payload.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
    }));
  }

  // Default projection validation
  if (entry.defaultProjection !== undefined && !isSheetProjection(entry.defaultProjection)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_PROJECTION",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid default projection "${entry.defaultProjection}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
      defaultProjection: entry.defaultProjection,
    }));
  }

  // Reviewer validation
  if (typeof entry.reviewedBy !== "string" || !isValidReviewerIdentity(entry.reviewedBy)) {
    diagnostics.push(createDiagnostic({
      code: "MISSING_REVIEWER",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid reviewer identity.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
    }));
  }

  // Timestamp validation
  if (typeof entry.reviewedAt !== "string" || !isValidTimestamp(entry.reviewedAt)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_TIMESTAMP",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" field "${entry.key.fieldId}" has invalid review timestamp "${entry.reviewedAt}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      fieldId: entry.key.fieldId,
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
