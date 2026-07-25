import type { Ruleset } from "@obsidian-dnd/domain";
import { isRuleset } from "@obsidian-dnd/domain";
import type { RuleEffectType, SheetProjection } from "@obsidian-dnd/catalog-contract";
import { isRuleEffectType, isSheetProjection } from "@obsidian-dnd/catalog-contract";

/* ── Schema version ─────────────────────────────────────────────── */

export const SEMANTIC_MAPPING_SCHEMA_VERSION = 1;

/* ── Mapping version ────────────────────────────────────────────── */

export type MappingVersion = string;

export function isMappingVersion(value: unknown): value is MappingVersion {
  return typeof value === "string" && value.length > 0;
}

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
  readonly version: MappingVersion;
  readonly rawField: string;
  readonly targetEffectType: RuleEffectType;
  readonly defaultProjection: SheetProjection;
  readonly reviewedBy: string;
  readonly reviewedAt: string;
}

export function isSemanticMappingEntry(value: unknown): value is SemanticMappingEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!isSemanticMappingKey(obj.key)) return false;
  if (!isMappingVersion(obj.version)) return false;
  if (typeof obj.rawField !== "string" || obj.rawField.length === 0) return false;
  if (!isRuleEffectType(obj.targetEffectType)) return false;
  if (!isSheetProjection(obj.defaultProjection)) return false;
  if (typeof obj.reviewedBy !== "string" || obj.reviewedBy.length === 0) return false;
  if (typeof obj.reviewedAt !== "string" || obj.reviewedAt.length === 0) return false;
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
  | "UNMAPPED_FIELD"
  | "INVALID_MAPPING"
  | "STALE_MAPPING"
  | "DISPLAY_NAME_BRANCH"
  | "EXECUTABLE_CONTENT"
  | "SCHEMA_VERSION_MISMATCH"
  | "DUPLICATE_MAPPING"
  | "INVALID_EFFECT_TYPE"
  | "INVALID_PROJECTION";

/* ── Diagnostic ─────────────────────────────────────────────────── */

export interface SemanticMappingDiagnostic {
  readonly code: SemanticMappingDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly entityId?: string;
  readonly ruleset?: Ruleset;
  readonly rawField?: string;
  readonly mappingVersion?: string;
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

const DISPLAY_NAME_PATTERNS = [
  /\b(name|displayName|display_name|title)\b/i,
  /\b(name\s*[=:])/i,
  /\b(display\s*[=:])/i,
];

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

export function detectDisplayNameBranch(entry: SemanticMappingEntry): boolean {
  const rawField = entry.rawField;
  return DISPLAY_NAME_PATTERNS.some((pattern) => pattern.test(rawField));
}

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

  if (detectDisplayNameBranch(entry)) {
    diagnostics.push(createDiagnostic({
      code: "DISPLAY_NAME_BRANCH",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" references a display name in raw field "${entry.rawField}". Display-name branching is prohibited.`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      rawField: entry.rawField,
    }));
  }

  if (detectExecutableContent(entry.rawField)) {
    diagnostics.push(createDiagnostic({
      code: "EXECUTABLE_CONTENT",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" contains executable content in raw field "${entry.rawField}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      rawField: entry.rawField,
    }));
  }

  if (!isRuleEffectType(entry.targetEffectType)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_EFFECT_TYPE",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" targets invalid effect type "${entry.targetEffectType}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      targetEffectType: entry.targetEffectType,
    }));
  }

  if (!isSheetProjection(entry.defaultProjection)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_PROJECTION",
      severity: "error",
      message: `Mapping for entity "${entry.key.entityId}" has invalid default projection "${entry.defaultProjection}".`,
      entityId: entry.key.entityId,
      ruleset: entry.key.ruleset,
      defaultProjection: entry.defaultProjection,
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

    const keyStr = mappingKeyToString(entry.key) + ":" + entry.rawField;
    if (seenKeys.has(keyStr)) {
      diagnostics.push(createDiagnostic({
        code: "DUPLICATE_MAPPING",
        severity: "warning",
        message: `Duplicate mapping for entity "${entry.key.entityId}" ruleset "${entry.key.ruleset}" field "${entry.rawField}".`,
        entityId: entry.key.entityId,
        ruleset: entry.key.ruleset,
        rawField: entry.rawField,
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
