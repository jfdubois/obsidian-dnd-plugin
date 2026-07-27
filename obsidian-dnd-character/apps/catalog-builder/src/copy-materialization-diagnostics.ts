import type {
  CopyChainStep,
  StructuredIdentity,
} from "./copy-resolver";
import type {
  PreserveValidationDiagnostic,
} from "./copy-preserve-policy";
import {
  cloneUnknown,
  deepFreeze,
} from "./copy-materialization-merge";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
  ModOperationDiagnostic,
} from "./mod-types";

export interface MaterializationDiagnosticContext {
  readonly sourceEntityKind?: string;
  readonly requestedIdentity?: StructuredIdentity;
  readonly inheritanceChain?: readonly CopyChainStep[];
}

/**
 * Converts a preserve validation diagnostic into a MaterializationDiagnostic.
 */
export function convertPreserveDiagnostic(
  diag: PreserveValidationDiagnostic,
  sourceRecord: CopyModRawRecord,
  sourcePath: string | undefined,
  sourceEntityKind: string | undefined,
  context: MaterializationDiagnosticContext = {},
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
    requestedIdentity: context.requestedIdentity,
    inheritanceChain: context.inheritanceChain,
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

/**
 * Converts mod operation diagnostics into MaterializationDiagnostic values.
 */
export function convertModDiagnostic(
  modDiagnostics: readonly ModOperationDiagnostic[],
  context: MaterializationDiagnosticContext = {},
): readonly MaterializationDiagnostic[] {
  return Object.freeze(
    modDiagnostics.map((diag) =>
      Object.freeze({
        code: diag.code,
        severity: diag.severity,
        message: diag.message,
        sourcePath: diag.sourcePath,
        sourceEntityKind: context.sourceEntityKind,
        entityName: diag.entityName,
        entitySource: diag.entitySource,
        fieldTarget: diag.fieldTarget,
        mode: diag.mode,
        rawParam: diag.rawParam,
        requestedIdentity: context.requestedIdentity,
        inheritanceChain: context.inheritanceChain,
      }),
    ),
  );
}
