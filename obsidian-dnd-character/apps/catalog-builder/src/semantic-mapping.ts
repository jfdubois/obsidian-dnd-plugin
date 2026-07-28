import type { Ruleset } from "@obsidian-dnd/domain";
import { isRuleset } from "@obsidian-dnd/domain";
import type { RuleEffect, RuleEffectType, SheetProjection } from "@obsidian-dnd/catalog-contract";
import { isRuleEffect, isRuleEffectType, isSheetProjection } from "@obsidian-dnd/catalog-contract";

/* ── Schema version ─────────────────────────────────────────────── */

export const SEMANTIC_MAPPING_SCHEMA_VERSION = 2;

/* ── Semantic mapping key ───────────────────────────────────────── */

export interface SemanticMappingKey {
  readonly entityId: string;
  readonly ruleset: Ruleset;
}

export function isSemanticMappingKey(value: unknown): value is SemanticMappingKey {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.entityId !== "string" || obj.entityId.length === 0) return false;
  if (!isRuleset(obj.ruleset)) return false;
  return true;
}

function mappingKeyToString(key: SemanticMappingKey): string {
  return `${key.ruleset}:${key.entityId}`;
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

function hasExecutableValue(obj: Record<string, unknown>): boolean {
  for (const value of Object.values(obj)) {
    if (typeof value === "function") return true;
  }
  return false;
}

function isValidTimestamp(ts: string): boolean {
  const d = new Date(ts);
  return !isNaN(d.getTime());
}

export function isSemanticMappingEntry(value: unknown): value is SemanticMappingEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (hasExecutableValue(obj)) return false;
  if (!isSemanticMappingKey(obj.key)) return false;
  if (typeof obj.mappingVersion !== "number") return false;
  if (typeof obj.sourceRevision !== "string" || obj.sourceRevision.length === 0) return false;
  if (obj.sourceFingerprint !== undefined && (typeof obj.sourceFingerprint !== "string" || obj.sourceFingerprint.length === 0)) return false;
  if (!isRuleEffect(obj.effect)) return false;
  if (obj.defaultProjection !== undefined && !isSheetProjection(obj.defaultProjection)) return false;
  if (typeof obj.reviewedBy !== "string" || obj.reviewedBy.length === 0) return false;
  if (typeof obj.reviewedAt !== "string" || obj.reviewedAt.length === 0) return false;
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
  if (!Array.isArray(obj.mappings)) return false;
  return obj.mappings.every((m: unknown) => isSemanticMappingEntry(m));
}

/* ── Diagnostic codes ───────────────────────────────────────────── */

export type SemanticMappingDiagnosticCode =
  | "INVALID_MAPPING"
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
  readonly sourceRevision?: string;
  readonly sourceFingerprint?: string;
  readonly mappingVersion?: number;
  readonly targetEffectType?: RuleEffectType;
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

/* ── Detection helpers ──────────────────────────────────────────── */

const EXECUTABLE_PATTERNS = [
  /\beval\s*\(/i,
  /\bnew\s+Function\b/i,
  /\bexec\s*\(/i,
  /\bsetTimeout\s*\(/i,
  /\bsetInterval\s*\(/i,
  /`.*\$\{.*\}.*`/,
  /\bimport\s*\(/i,
  /\brequire\s*\(/i,
  /<script\b/i,
  /\bon\w+\s*=/i,
];

export function detectExecutableContent(rawField: string): boolean {
  return EXECUTABLE_PATTERNS.some((pattern) => pattern.test(rawField));
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

  if (hasExecutableValue(obj)) {
    diagnostics.push(createDiagnostic({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" contains executable content (function values).`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
    }));
  }

  if (typeof entry.sourceRevision !== "string" || entry.sourceRevision.length === 0) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_SOURCE_REVISION",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid source revision.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      sourceRevision: entry.sourceRevision,
    }));
  }

  if (entry.sourceFingerprint !== undefined && (typeof entry.sourceFingerprint !== "string" || entry.sourceFingerprint.length === 0)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_FINGERPRINT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid source fingerprint.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      sourceFingerprint: entry.sourceFingerprint,
    }));
  }

  if (!isRuleEffect(entry.effect)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_EFFECT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid effect payload.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
    }));
  }

  if (entry.defaultProjection !== undefined && !isSheetProjection(entry.defaultProjection)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_PROJECTION",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid default projection "${entry.defaultProjection}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      defaultProjection: entry.defaultProjection,
    }));
  }

  if (typeof entry.reviewedBy !== "string" || entry.reviewedBy.length === 0) {
    diagnostics.push(createDiagnostic({
      code: "MISSING_REVIEWER",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" is missing reviewer information.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
    }));
  }

  if (typeof entry.reviewedAt !== "string" || entry.reviewedAt.length === 0 || !isValidTimestamp(entry.reviewedAt)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_TIMESTAMP",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid review timestamp "${entry.reviewedAt}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
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
        message: `Duplicate mapping for entity "${entry.key.entityId}" ruleset "${entry.key.ruleset}".`,
        entityId: entry.key.entityId,
        ruleset: entry.key.ruleset,
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
