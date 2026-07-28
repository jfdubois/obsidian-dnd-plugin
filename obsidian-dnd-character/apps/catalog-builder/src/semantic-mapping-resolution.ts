import type { SemanticMappingKey, SemanticMappingRegistry, SemanticMappingDiagnostic, MappingMethod, SemanticMappingResult } from "./semantic-mapping";
import { isSemanticMappingKey, validateSemanticMappingEntry } from "./semantic-mapping";

/* ── Stale-check context ────────────────────────────────────────── */

export interface StaleCheckContext {
  /** The current pinned 5eTools revision (40-char lowercase hex). */
  readonly pinnedRevision: string;
  /** The computed SHA-256 fingerprint of the current source data. */
  readonly sourceFingerprint?: string;
  /** Source entity kind (collection) for diagnostic context. */
  readonly entityKind?: string;
  /** Physical file path of the source entity for diagnostic context. */
  readonly sourcePath?: string;
}

/* ── Resolution ─────────────────────────────────────────────────── */

function createDiagnostic(
  overrides: Omit<SemanticMappingDiagnostic, "code" | "severity" | "message"> & {
    code: SemanticMappingDiagnostic["code"];
    severity: "warning" | "error";
    message: string;
  },
): SemanticMappingDiagnostic {
  return Object.freeze(overrides);
}

export function resolveSemanticMapping(
  registry: SemanticMappingRegistry,
  key: SemanticMappingKey,
  staleCheck?: StaleCheckContext,
): SemanticMappingResult {
  const diagnostics: SemanticMappingDiagnostic[] = [];

  if (!isSemanticMappingKey(key)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Resolution key is not a valid semantic mapping key.",
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "structured" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  const entry = registry.mappings.find(
    (m) => m.key.entityId === key.entityId && m.key.ruleset === key.ruleset && m.key.fieldId === key.fieldId,
  );

  if (entry === undefined) {
    diagnostics.push(createDiagnostic({
      code: "UNMAPPED_FIELD",
      severity: "warning",
      message: `No reviewed semantic mapping exists for entity "${key.entityId}" field "${key.fieldId}" ruleset "${key.ruleset}".`,
      entityId: key.entityId,
      ruleset: key.ruleset,
      fieldId: key.fieldId,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "structured" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  // Validate the mapping entry before using it
  const entryDiagnostics = validateSemanticMappingEntry(entry);
  const hasErrors = entryDiagnostics.some((d) => d.severity === "error");
  if (hasErrors) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: `Mapping entry for "${key.entityId}" is invalid: ${entryDiagnostics[0]?.message ?? "unknown error"}.`,
      entityId: key.entityId,
      ruleset: key.ruleset,
      fieldId: key.fieldId,
      mappingVersion: entry.mappingVersion,
      sourceRevision: entry.sourceRevision,
      sourceFingerprint: entry.sourceFingerprint,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "reviewed-mapping" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  // Stale revision check
  if (staleCheck !== undefined) {
    if (entry.sourceRevision !== staleCheck.pinnedRevision) {
      diagnostics.push(createDiagnostic({
        code: "STALE_MAPPING",
        severity: "error",
        message: `Mapping for "${key.entityId}" field "${key.fieldId}" is stale: source revision "${entry.sourceRevision}" does not match pinned revision "${staleCheck.pinnedRevision}".`,
        entityId: key.entityId,
        ruleset: key.ruleset,
        fieldId: key.fieldId,
        mappingVersion: entry.mappingVersion,
        sourceRevision: entry.sourceRevision,
        sourceFingerprint: entry.sourceFingerprint,
        expectedSourceRevision: entry.sourceRevision,
        actualPinnedRevision: staleCheck.pinnedRevision,
        entityKind: staleCheck.entityKind,
        sourcePath: staleCheck.sourcePath,
      }));
      return Object.freeze({
        mapped: false,
        mappingMethod: "reviewed-mapping" as MappingMethod,
        diagnostics: Object.freeze(diagnostics),
      });
    }

    // Stale fingerprint check (only if entry has a fingerprint and actual is provided)
    if (entry.sourceFingerprint !== undefined && staleCheck.sourceFingerprint !== undefined) {
      if (entry.sourceFingerprint !== staleCheck.sourceFingerprint) {
        diagnostics.push(createDiagnostic({
          code: "STALE_MAPPING",
          severity: "error",
          message: `Mapping for "${key.entityId}" field "${key.fieldId}" is stale: source fingerprint "${entry.sourceFingerprint}" does not match computed fingerprint "${staleCheck.sourceFingerprint}".`,
          entityId: key.entityId,
          ruleset: key.ruleset,
          fieldId: key.fieldId,
          mappingVersion: entry.mappingVersion,
          sourceRevision: entry.sourceRevision,
          sourceFingerprint: entry.sourceFingerprint,
          expectedSourceFingerprint: entry.sourceFingerprint,
          actualSourceFingerprint: staleCheck.sourceFingerprint,
          entityKind: staleCheck.entityKind,
          sourcePath: staleCheck.sourcePath,
        }));
        return Object.freeze({
          mapped: false,
          mappingMethod: "reviewed-mapping" as MappingMethod,
          diagnostics: Object.freeze(diagnostics),
        });
      }
    }
  }

  return Object.freeze({
    mapped: true,
    entry,
    mappingMethod: "reviewed-mapping" as MappingMethod,
    diagnostics: Object.freeze([]),
  });
}

/* ── Batch resolution ───────────────────────────────────────────── */

export interface SemanticMappingBatchInput {
  readonly key: SemanticMappingKey;
}

export interface SemanticMappingBatchResult {
  readonly results: readonly SemanticMappingResult[];
  readonly mappedCount: number;
  readonly unmappedCount: number;
  readonly allDiagnostics: readonly SemanticMappingDiagnostic[];
}

export function resolveSemanticMappings(
  registry: SemanticMappingRegistry,
  inputs: readonly SemanticMappingBatchInput[],
  staleCheck?: StaleCheckContext,
): SemanticMappingBatchResult {
  const results: SemanticMappingResult[] = [];
  const allDiagnostics: SemanticMappingDiagnostic[] = [];
  let mappedCount = 0;
  let unmappedCount = 0;

  for (const input of inputs) {
    const result = resolveSemanticMapping(registry, input.key, staleCheck);
    results.push(result);
    allDiagnostics.push(...result.diagnostics);
    if (result.mapped) {
      mappedCount += 1;
    } else {
      unmappedCount += 1;
    }
  }

  return Object.freeze({
    results: Object.freeze(results),
    mappedCount,
    unmappedCount,
    allDiagnostics: Object.freeze(allDiagnostics),
  });
}
