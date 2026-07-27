import {
  recordMatchesIdentity,
  type CopyChainStep,
  type CopyResolverContext,
} from "./copy-resolver";
import {
  validatePreservePayload,
  shouldPreserveField,
  type PreservePayload,
  type PreserveValidationDiagnostic,
} from "./copy-preserve-policy";
import { applyArrayModOperation } from "./mod-array-operations";
import { applyRootModOperation } from "./mod-root-operations";
import { applyScalarTextModOperation } from "./mod-scalar-text-operations";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
  ModOperationDiagnostic,
} from "./mod-types";

/* ── Internal Constants ────────────────────────────────────────── */

const ARRAY_MODES = new Set([
  "appendArr",
  "appendIfNotExistsArr",
  "insertArr",
  "prependArr",
  "removeArr",
  "renameArr",
  "replaceArr",
]);

const ROOT_MODES = new Set([
  "addSenses",
  "addSkills",
  "addSpells",
  "removeSpells",
  "replaceSpells",
]);

const SCALAR_TEXT_MODES = new Set([
  "maxSize",
  "prefixSuffixStringProp",
  "replaceTxt",
  "scalarAddDc",
  "scalarAddHit",
  "scalarAddProp",
  "scalarMultProp",
  "scalarMultXp",
  "setProp",
]);

/* ── Helpers ───────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      cloned[key] = cloneUnknown(val);
    }
    return cloned;
  }
  return value;
}

function cloneRecord(record: CopyModRawRecord): CopyModRawRecord {
  return {
    name: record.name,
    source: record.source,
    remaining: cloneObject(record.remaining),
  };
}

function cloneObject(obj: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = cloneUnknown(value);
  }
  return cloned;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        deepFreeze(item);
      }
    }
  } else {
    for (const key of Object.keys(value)) {
      const prop = (value as Record<string, unknown>)[key];
      if (typeof prop === "object" && prop !== null) {
        deepFreeze(prop);
      }
    }
  }
  return value;
}

/**
 * Finds the raw record in the context that matches the given chain step's identity.
 */
export function findRecordForChainStep(
  context: CopyResolverContext,
  step: CopyChainStep,
): CopyModRawRecord | undefined {
  const envelope = context.validatedFiles[step.sourcePath];
  if (envelope === undefined) return undefined;

  for (const collection of envelope.collections) {
    if (collection.entityKind !== step.entityKind) continue;
    for (const record of collection.records) {
      if (recordMatchesIdentity(record, step.identity)) {
        return record as CopyModRawRecord;
      }
    }
  }
  return undefined;
}

/**
 * Converts a preserve validation diagnostic into a MaterializationDiagnostic.
 */
export function convertPreserveDiagnostic(
  diag: PreserveValidationDiagnostic,
  sourceRecord: CopyModRawRecord,
  sourcePath: string | undefined,
  sourceEntityKind: string | undefined,
): MaterializationDiagnostic {
  const base = Object.freeze({
    code: diag.code,
    severity: diag.severity,
    message: diag.message,
    sourcePath,
    sourceEntityKind,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget: "_copy._preserve",
    mode: undefined,
    rawParam: diag.rawPreservePayload !== undefined
      ? deepFreeze(cloneUnknown(diag.rawPreservePayload))
      : undefined,
    rawPreservePayload: diag.rawPreservePayload !== undefined
      ? deepFreeze(cloneUnknown(diag.rawPreservePayload))
      : undefined,
    validationReason: diag.validationReason,
  });

  if (diag.code === "INVALID_PRESERVE_KEY") {
    return Object.freeze({
      ...base,
      invalidPreserveKey: diag.invalidPreserveKey,
    });
  }

  if (diag.code === "INVALID_PRESERVE_MARKER") {
    return Object.freeze({
      ...base,
      invalidMarkerValue: diag.invalidMarkerValue !== undefined
        ? deepFreeze(cloneUnknown(diag.invalidMarkerValue))
        : undefined,
      invalidPreserveKey: diag.invalidPreserveKey,
    });
  }

  return base;
}

function diagnostic(
  code: ModOperationDiagnostic["code"],
  message: string,
  sourceRecord: CopyModRawRecord,
  fieldTarget: string,
  mode: string | undefined,
  sourcePath: string | undefined,
  rawParam: unknown,
): ModOperationDiagnostic {
  return Object.freeze({
    code,
    severity: "error",
    message,
    sourcePath,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget,
    mode,
    rawParam,
  });
}

function enrichDiagnostic(
  original: ModOperationDiagnostic,
  sourceRecord: CopyModRawRecord,
  fieldTarget: string,
  mode: string | undefined,
  sourcePath: string | undefined,
): ModOperationDiagnostic {
  return Object.freeze({
    ...original,
    sourcePath,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget,
    mode,
  });
}

function operationList(rawOperations: unknown): readonly unknown[] {
  return Array.isArray(rawOperations) ? rawOperations : [rawOperations];
}

function modeOf(rawOperation: unknown): string | undefined {
  if (!isPlainObject(rawOperation)) {
    return undefined;
  }
  return typeof rawOperation.mode === "string" ? rawOperation.mode : undefined;
}

function applyModBlock(
  record: Record<string, unknown>,
  sourceRecord: CopyModRawRecord,
  rawMod: unknown,
  sourcePath: string | undefined,
): readonly ModOperationDiagnostic[] {
  if (!isPlainObject(rawMod)) {
    return [
      diagnostic(
        "INVALID_MOD_PAYLOAD",
        "_mod block must be a plain object",
        sourceRecord,
        "_",
        undefined,
        sourcePath,
        rawMod,
      ),
    ];
  }

  const diagnostics: ModOperationDiagnostic[] = [];
  for (const [fieldTarget, rawOperations] of Object.entries(rawMod)) {
    for (const rawOperation of operationList(rawOperations)) {
      const mode = modeOf(rawOperation);
      if (mode === undefined) {
        diagnostics.push(
          diagnostic(
            "INVALID_MOD_PAYLOAD",
            "Mod operation payload missing string 'mode'",
            sourceRecord,
            fieldTarget,
            undefined,
            sourcePath,
            rawOperation,
          ),
        );
        continue;
      }

      if (ARRAY_MODES.has(mode)) {
        const applied = applyArrayModOperation(record[fieldTarget], rawOperation);
        if (Array.isArray(applied)) {
          record[fieldTarget] = applied;
        } else {
          diagnostics.push(enrichDiagnostic(applied, sourceRecord, fieldTarget, mode, sourcePath));
        }
        continue;
      }

      if (ROOT_MODES.has(mode)) {
        if (fieldTarget !== "_") {
          diagnostics.push(
            diagnostic(
              "MOD_FIELD_TARGET_MISSING",
              `${mode} must target "_"`,
              sourceRecord,
              fieldTarget,
              mode,
              sourcePath,
              rawOperation,
            ),
          );
          continue;
        }
        const rootDiagnostic = applyRootModOperation(record, rawOperation);
        if (rootDiagnostic !== undefined) {
          diagnostics.push(
            enrichDiagnostic(rootDiagnostic, sourceRecord, fieldTarget, mode, sourcePath),
          );
        }
        continue;
      }

      if (SCALAR_TEXT_MODES.has(mode)) {
        const scalarDiagnostic = applyScalarTextModOperation(record, fieldTarget, rawOperation);
        if (scalarDiagnostic !== undefined) {
          diagnostics.push(
            enrichDiagnostic(scalarDiagnostic, sourceRecord, fieldTarget, mode, sourcePath),
          );
        }
        continue;
      }

      diagnostics.push(
        diagnostic(
          "UNKNOWN_MOD_MODE",
          `Unknown _mod mode "${mode}"`,
          sourceRecord,
          fieldTarget,
          mode,
          sourcePath,
          rawOperation,
        ),
      );
    }
  }
  return diagnostics;
}

/**
 * Applies the 5eTools-compatible direct-field overlay merge.
 */
function applyDirectFieldOverlay(
  baseRemaining: Record<string, unknown>,
  derivedRemaining: Record<string, unknown>,
  preservePayload: PreservePayload,
  entityKind: string,
): void {
  for (const [key, value] of Object.entries(derivedRemaining)) {
    if (key.startsWith("_")) continue;
    if (value === null || value === undefined) continue;
    baseRemaining[key] = cloneUnknown(value);
  }

  for (const key of Object.keys(baseRemaining)) {
    const derivedValue = derivedRemaining[key];

    if (derivedValue === null) {
      delete baseRemaining[key];
      continue;
    }

    if (derivedValue === undefined) {
      if (!shouldPreserveField(key, entityKind, preservePayload)) {
        delete baseRemaining[key];
      }
    }
  }
}

function convertModDiagnostic(
  modDiagnostics: readonly ModOperationDiagnostic[],
): readonly MaterializationDiagnostic[] {
  return Object.freeze(
    modDiagnostics.map((diag) =>
      Object.freeze({
        code: diag.code,
        severity: diag.severity,
        message: diag.message,
        sourcePath: diag.sourcePath,
        entityName: diag.entityName,
        entitySource: diag.entitySource,
        fieldTarget: diag.fieldTarget,
        mode: diag.mode,
        rawParam: diag.rawParam,
      }),
    ),
  );
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Materializes all intermediate levels of a resolved _copy chain from the
 * terminal base outward to (but not including) the final derived record.
 *
 * For each intermediate step (processed from base outward):
 * 1. Look up the intermediate record
 * 2. Clone the current accumulated state
 * 3. Validate the intermediate's _copy._preserve
 * 4. Apply preserve-gated inheritance
 * 5. Apply the intermediate's direct fields
 * 6. Apply the intermediate's _copy._mod
 *
 * Returns the fully materialized base or a failure diagnostic.
 */
export function materializeNestedCopyLevels(
  resolvedBase: CopyModRawRecord,
  chain: readonly CopyChainStep[],
  context: CopyResolverContext,
  derivedRecord: CopyModRawRecord,
  sourcePath: string | undefined,
  sourceEntityKind: string,
):
  | { readonly ok: true; readonly record: CopyModRawRecord }
  | { readonly ok: false; readonly diagnostics: readonly MaterializationDiagnostic[] } {

  if (chain.length <= 1) {
    return { ok: true, record: resolvedBase };
  }

  // Process from terminal base (last step) outward to the step just before derived
  // chain[0] = derived's reference, chain[chain.length-1] = terminal base
  // We need intermediate steps: chain[0] to chain[chain.length-2]
  // Process in reverse: chain[chain.length-2] down to chain[0]

  let current = cloneRecord(resolvedBase);
  const allDiagnostics: MaterializationDiagnostic[] = [];

  for (let i = chain.length - 2; i >= 0; i--) {
    const step = chain[i];
    if (step === undefined) continue;

    const intermediate = findRecordForChainStep(context, step);
    if (intermediate === undefined) {
      return {
        ok: false,
        diagnostics: Object.freeze([{
          code: "BASE_ENTITY_NOT_FOUND" as const,
          severity: "error" as const,
          message: `Intermediate record for chain step "${step.entityName}" (${step.sourceAbbr}) not found at "${step.sourcePath}"`,
          sourcePath,
          sourceEntityKind,
          entityName: derivedRecord.name,
          entitySource: derivedRecord.source,
          fieldTarget: "_copy",
          mode: undefined,
          rawParam: undefined,
        }]),
      };
    }

    const intermediateEntityKind = step.entityKind;
    const intermediateSourcePath = step.sourcePath;

    // Clone current accumulated state
    current = cloneRecord(current);

    // Validate intermediate's _copy._preserve
    const copyValue = intermediate.remaining._copy;
    const preserveRaw = isPlainObject(copyValue) ? copyValue._preserve : undefined;
    let preservePayload: PreservePayload = {};
    if (preserveRaw !== undefined) {
      const validation = validatePreservePayload(preserveRaw, intermediateEntityKind);
      if (!validation.valid) {
        return {
          ok: false,
          diagnostics: Object.freeze(
            validation.diagnostics.map((d) =>
              convertPreserveDiagnostic(d, intermediate, intermediateSourcePath, intermediateEntityKind),
            ),
          ),
        };
      }
      preservePayload = validation.payload;
    }

    // Apply preserve-gated inheritance: overlay intermediate's direct fields onto current
    applyDirectFieldOverlay(
      current.remaining,
      intermediate.remaining,
      preservePayload,
      intermediateEntityKind,
    );

    // Apply intermediate's _copy._mod
    if (isPlainObject(copyValue) && copyValue._mod !== undefined) {
      const modDiagnostics = applyModBlock(
        current.remaining,
        intermediate,
        copyValue._mod,
        intermediateSourcePath,
      );
      if (modDiagnostics.length > 0) {
        allDiagnostics.push(...convertModDiagnostic(modDiagnostics));
        return { ok: false, diagnostics: allDiagnostics };
      }
    }
  }

  return { ok: true, record: current };
}
