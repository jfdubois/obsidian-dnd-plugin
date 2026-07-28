import type { SemanticMappingKey, SemanticMappingRegistry, SemanticMappingDiagnostic, MappingMethod, SemanticMappingResult } from "./semantic-mapping";
import { isSemanticMappingKey, validateSemanticMappingEntry } from "./semantic-mapping";
import { computeSourceFingerprint } from "./semantic-mapping-fingerprint";
import type { RuleEffect, EffectOrigin } from "@obsidian-dnd/catalog-contract";
import { isRuleEffect } from "@obsidian-dnd/catalog-contract";

const PINNED_REVISION_RE = /^[0-9a-f]{40}$/;

/* ── Deep clone helper ──────────────────────────────────────────── */

/**
 * Produces a deep clone of a validated RuleEffect using JSON round-trip.
 * RuleEffect objects are guaranteed to be plain JSON-compatible structures
 * (validated by isRuleEffect), so JSON serialization is safe.
 *
 * @throws TypeError if the effect cannot be serialized (not JSON-compatible).
 */
function cloneRuleEffect(effect: RuleEffect): RuleEffect {
  const cloned = JSON.parse(JSON.stringify(effect)) as RuleEffect;
  // Validate the clone is still a proper RuleEffect
  if (!isRuleEffect(cloned)) {
    throw new TypeError("Cloned effect failed RuleEffect validation after JSON round-trip.");
  }
  return cloned;
}

/**
 * Extracts the EffectOrigin from a RuleEffect in a focused, read-only manner.
 */
function extractEffectOrigin(effect: RuleEffect): EffectOrigin {
  return {
    entityId: effect.origin.entityId,
    sourceId: effect.origin.sourceId,
    method: effect.origin.method,
  };
}

/* ── Resolution context ─────────────────────────────────────────── */

export interface SemanticMappingResolutionContext {
  /** The current pinned 5eTools revision (40-char lowercase hex). */
  readonly pinnedRevision: string;
  /** The raw source data used to compute the current fingerprint internally. */
  readonly sourceInput?: unknown;
  /** Source entity kind (collection) for diagnostic context. */
  readonly entityKind?: string;
  /** Physical file path of the source entity for diagnostic context. */
  readonly sourcePath?: string;
}

/* ── Diagnostic factory ─────────────────────────────────────────── */

function createDiagnostic(
  overrides: Omit<SemanticMappingDiagnostic, "code" | "severity" | "message"> & {
    code: SemanticMappingDiagnostic["code"];
    severity: "warning" | "error";
    message: string;
  },
): SemanticMappingDiagnostic {
  return Object.freeze(overrides);
}

/* ── Single resolution ──────────────────────────────────────────── */

export function resolveSemanticMapping(
  registry: SemanticMappingRegistry,
  key: SemanticMappingKey,
  context: SemanticMappingResolutionContext,
): SemanticMappingResult {
  const diagnostics: SemanticMappingDiagnostic[] = [];

  // Validate resolution key
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

  // Context is mandatory
  if (context === undefined || context === null) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: "Resolution context is required but was not provided.",
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

  // Validate pinned revision format (always mandatory)
  if (typeof context.pinnedRevision !== "string" || !PINNED_REVISION_RE.test(context.pinnedRevision)) {
    diagnostics.push(createDiagnostic({
      code: "INVALID_MAPPING",
      severity: "error",
      message: `Pinned revision "${context.pinnedRevision}" is not a valid 40-character lowercase hex string.`,
      entityId: key.entityId,
      ruleset: key.ruleset,
      fieldId: key.fieldId,
      actualPinnedRevision: typeof context.pinnedRevision === "string" ? context.pinnedRevision : undefined,
      entityKind: context.entityKind,
      sourcePath: context.sourcePath,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "structured" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  // Lookup mapping entry
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
      entityKind: context.entityKind,
      sourcePath: context.sourcePath,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "reviewed-mapping" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  // Revision comparison (always mandatory, before fingerprint)
  if (entry.sourceRevision !== context.pinnedRevision) {
    diagnostics.push(createDiagnostic({
      code: "STALE_MAPPING",
      severity: "error",
      message: `Mapping for "${key.entityId}" field "${key.fieldId}" is stale: source revision "${entry.sourceRevision}" does not match pinned revision "${context.pinnedRevision}".`,
      entityId: key.entityId,
      ruleset: key.ruleset,
      fieldId: key.fieldId,
      mappingVersion: entry.mappingVersion,
      sourceRevision: entry.sourceRevision,
      sourceFingerprint: entry.sourceFingerprint,
      expectedSourceRevision: entry.sourceRevision,
      actualPinnedRevision: context.pinnedRevision,
      entityKind: context.entityKind,
      sourcePath: context.sourcePath,
    }));
    return Object.freeze({
      mapped: false,
      mappingMethod: "reviewed-mapping" as MappingMethod,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  // Fingerprint validation (only if entry has a sourceFingerprint)
  if (entry.sourceFingerprint !== undefined) {
    // Require sourceInput when fingerprint is expected (only undefined is missing)
    if (context.sourceInput === undefined) {
      diagnostics.push(createDiagnostic({
        code: "INVALID_MAPPING",
        severity: "error",
        message: `Mapping for "${key.entityId}" field "${key.fieldId}" expects a source fingerprint but source input is missing.`,
        entityId: key.entityId,
        ruleset: key.ruleset,
        fieldId: key.fieldId,
        mappingVersion: entry.mappingVersion,
        sourceRevision: entry.sourceRevision,
        sourceFingerprint: entry.sourceFingerprint,
        expectedSourceRevision: entry.sourceRevision,
        actualPinnedRevision: context.pinnedRevision,
        expectedSourceFingerprint: entry.sourceFingerprint,
        entityKind: context.entityKind,
        sourcePath: context.sourcePath,
      }));
      return Object.freeze({
        mapped: false,
        mappingMethod: "reviewed-mapping" as MappingMethod,
        diagnostics: Object.freeze(diagnostics),
      });
    }

    // Compute fingerprint internally
    let actualFingerprint: string;
    try {
      actualFingerprint = computeSourceFingerprint(context.sourceInput);
    } catch {
      diagnostics.push(createDiagnostic({
        code: "INVALID_MAPPING",
        severity: "error",
        message: `Mapping for "${key.entityId}" field "${key.fieldId}" has invalid source input that cannot be fingerprinted.`,
        entityId: key.entityId,
        ruleset: key.ruleset,
        fieldId: key.fieldId,
        mappingVersion: entry.mappingVersion,
        sourceRevision: entry.sourceRevision,
        sourceFingerprint: entry.sourceFingerprint,
        expectedSourceRevision: entry.sourceRevision,
        actualPinnedRevision: context.pinnedRevision,
        expectedSourceFingerprint: entry.sourceFingerprint,
        entityKind: context.entityKind,
        sourcePath: context.sourcePath,
      }));
      return Object.freeze({
        mapped: false,
        mappingMethod: "reviewed-mapping" as MappingMethod,
        diagnostics: Object.freeze(diagnostics),
      });
    }

    if (entry.sourceFingerprint !== actualFingerprint) {
      diagnostics.push(createDiagnostic({
        code: "STALE_MAPPING",
        severity: "error",
        message: `Mapping for "${key.entityId}" field "${key.fieldId}" is stale: source fingerprint "${entry.sourceFingerprint}" does not match computed fingerprint "${actualFingerprint}".`,
        entityId: key.entityId,
        ruleset: key.ruleset,
        fieldId: key.fieldId,
        mappingVersion: entry.mappingVersion,
        sourceRevision: entry.sourceRevision,
        sourceFingerprint: entry.sourceFingerprint,
        expectedSourceRevision: entry.sourceRevision,
        actualPinnedRevision: context.pinnedRevision,
        expectedSourceFingerprint: entry.sourceFingerprint,
        actualSourceFingerprint: actualFingerprint,
        entityKind: context.entityKind,
        sourcePath: context.sourcePath,
      }));
      return Object.freeze({
        mapped: false,
        mappingMethod: "reviewed-mapping" as MappingMethod,
        diagnostics: Object.freeze(diagnostics),
      });
    }
  }

  return Object.freeze({
    mapped: true,
    materializedEffect: cloneRuleEffect(entry.effect),
    mappingKey: entry.key,
    mappingVersion: entry.mappingVersion,
    reviewedBy: entry.reviewedBy,
    reviewedAt: entry.reviewedAt,
    sourceRevision: entry.sourceRevision,
    sourceFingerprint: entry.sourceFingerprint,
    defaultProjection: entry.defaultProjection,
    effectOrigin: extractEffectOrigin(entry.effect),
    mappingMethod: "reviewed-mapping" as MappingMethod,
    diagnostics: Object.freeze([]),
  });
}

/* ── Batch resolution ───────────────────────────────────────────── */

export interface SemanticMappingBatchInput {
  readonly key: SemanticMappingKey;
  readonly context: SemanticMappingResolutionContext;
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
): SemanticMappingBatchResult {
  const results: SemanticMappingResult[] = [];
  const allDiagnostics: SemanticMappingDiagnostic[] = [];
  let mappedCount = 0;
  let unmappedCount = 0;

  for (const input of inputs) {
    const result = resolveSemanticMapping(registry, input.key, input.context);
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
