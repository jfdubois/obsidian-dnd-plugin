import {
  isCopyResolutionFailure,
  resolveCopy,
  type CopyResolverContext,
  type CopyResolverDiagnostic,
  type StructuredIdentity,
} from "./copy-resolver";
import {
  validatePreservePayload,
  type PreservePayload,
} from "./copy-preserve-policy";
import { materializeNestedCopyLevels } from "./nested-copy-materializer";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
  MaterializedResolvedRecord,
} from "./mod-types";
import {
  applyDirectFieldOverlay,
  cloneRecord,
  cloneUnknown,
  deepFreeze,
  isPlainObject,
  stripCopyDirectives,
} from "./copy-materialization-merge";
import { applyModBlock } from "./copy-materialization-mods";
import {
  convertModDiagnostic,
  convertPreserveDiagnostic,
} from "./copy-materialization-diagnostics";


// Re-export for backward compatibility
export type { CopyModRawRecord } from "./mod-types";

export interface CopyModContext {
  readonly sourcePath: string;
  readonly sourceEntityKind: string;
}

export type CopyModResolutionResult =
  | {
      readonly ok: true;
      readonly record: CopyModRawRecord;
      readonly diagnostics: readonly MaterializationDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly MaterializationDiagnostic[];
    };

/**
 * Converts a copy resolver diagnostic into a structured MaterializationDiagnostic.
 * Preserves every structured field from CopyResolverDiagnostic and deep-clones
 * all structured values so the returned diagnostic cannot mutate the original.
 */
function convertCopyDiagnostic(
  copyDiagnostic: CopyResolverDiagnostic,
  sourceRecord: CopyModRawRecord,
): MaterializationDiagnostic {
  const ambiguityCandidates = copyDiagnostic.ambiguityCandidates
    ? Object.freeze(
        copyDiagnostic.ambiguityCandidates.map((candidate) =>
          deepFreeze(Object.freeze({
            name: candidate.name,
            source: candidate.source,
            entityKind: candidate.entityKind,
            sourcePath: candidate.sourcePath,
            identity: candidate.identity
              ? deepFreeze(cloneUnknown(candidate.identity) as StructuredIdentity)
              : undefined,
          })),
        ),
      )
    : undefined;

  const requestedIdentity = copyDiagnostic.requestedIdentity
    ? deepFreeze(cloneUnknown(copyDiagnostic.requestedIdentity) as StructuredIdentity)
    : undefined;

  const inheritanceChain = copyDiagnostic.chain
    ? Object.freeze(
        copyDiagnostic.chain.map((step) =>
          deepFreeze(Object.freeze({
            entityName: step.entityName,
            sourceAbbr: step.sourceAbbr,
            entityKind: step.entityKind,
            sourcePath: step.sourcePath,
            identity: deepFreeze(cloneUnknown(step.identity) as StructuredIdentity),
          })),
        ),
      )
    : undefined;

  const invalidDiscriminatorValue = copyDiagnostic.invalidDiscriminatorValue != null
    ? deepFreeze(cloneUnknown(copyDiagnostic.invalidDiscriminatorValue))
    : undefined;

  const allowedEntityKinds = copyDiagnostic.allowedEntityKinds
    ? Object.freeze([...copyDiagnostic.allowedEntityKinds])
    : undefined;

  return Object.freeze({
    code: copyDiagnostic.code,
    severity: copyDiagnostic.severity,
    message: copyDiagnostic.message,
    sourcePath: copyDiagnostic.sourcePath,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget: "_copy",
    mode: undefined,
    rawParam: copyDiagnostic.rawCopy,
    ambiguityCandidates,
    requestedIdentity,
    sourceEntityKind: copyDiagnostic.sourceEntityKind,
    allowedEntityKinds,
    inheritanceChain,
    invalidDiscriminatorField: copyDiagnostic.invalidDiscriminatorField,
    invalidDiscriminatorValue,
  });
}

export function resolveCopyWithMods(
  record: CopyModRawRecord,
  context: CopyResolverContext,
  modContext: CopyModContext,
): CopyModResolutionResult {
  const copyValue = record.remaining._copy;
  const resolved = resolveCopy(record, context, {
    sourceEntityKind: modContext.sourceEntityKind,
    sourcePath: modContext.sourcePath,
  });
  if (isCopyResolutionFailure(resolved)) {
    return {
      ok: false,
      diagnostics: [
        convertCopyDiagnostic(resolved.diagnostic, record),
      ],
    };
  }

  // Materialize all intermediate levels of the _copy chain from terminal base outward
  const nestedResult = materializeNestedCopyLevels(
    resolved.baseEntity,
    resolved.chain,
    context,
  );
  if (!nestedResult.ok) {
    return {
      ok: false,
      diagnostics: nestedResult.diagnostics,
    };
  }

  // Validate _copy._preserve payload before merge (only when present)
  const preserveRaw = isPlainObject(copyValue) ? copyValue._preserve : undefined;
  let preservePayload: PreservePayload = {};
  if (preserveRaw !== undefined) {
    const preserveValidation = validatePreservePayload(preserveRaw, modContext.sourceEntityKind);
    if (!preserveValidation.valid) {
      return {
        ok: false,
        diagnostics: Object.freeze(
          preserveValidation.diagnostics.map((d) =>
            convertPreserveDiagnostic(d, record, modContext.sourcePath, modContext.sourceEntityKind),
          ),
        ),
      };
    }
    preservePayload = preserveValidation.payload;
  }

  const clonedBase = cloneRecord(nestedResult.record);
  applyDirectFieldOverlay(
    clonedBase.remaining,
    record.remaining,
    preservePayload,
    modContext.sourceEntityKind,
  );
  if (!isPlainObject(copyValue) || copyValue._mod === undefined) {
    return {
      ok: true,
      record: { name: record.name, source: record.source, remaining: stripCopyDirectives(clonedBase.remaining) },
      diagnostics: [],
    };
  }
  const diagnostics = convertModDiagnostic(
    applyModBlock(
      clonedBase.remaining,
      record,
      copyValue._mod,
      modContext.sourcePath,
    ),
    { sourceEntityKind: modContext.sourceEntityKind },
  );
  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }
  return {
    ok: true,
    record: { name: record.name, source: record.source, remaining: stripCopyDirectives(clonedBase.remaining) },
    diagnostics: [],
  };
}

/**
 * Materializes a copy+mod record into the authoritative MaterializedResolvedRecord contract.
 * Includes the inheritance chain, final record, and all diagnostics.
 */
export function materializeCopyWithMods(
  record: CopyModRawRecord,
  context: CopyResolverContext,
  modContext: CopyModContext,
):
  | { readonly ok: true; readonly result: MaterializedResolvedRecord }
  | { readonly ok: false; readonly diagnostics: readonly MaterializationDiagnostic[] } {
  const copyValue = record.remaining._copy;
  const resolved = resolveCopy(record, context, {
    sourceEntityKind: modContext.sourceEntityKind,
    sourcePath: modContext.sourcePath,
  });

  if (isCopyResolutionFailure(resolved)) {
    return {
      ok: false,
      diagnostics: [
        convertCopyDiagnostic(resolved.diagnostic, record),
      ],
    };
  }

  // Materialize all intermediate levels of the _copy chain from terminal base outward
  const nestedResult = materializeNestedCopyLevels(
    resolved.baseEntity,
    resolved.chain,
    context,
  );
  if (!nestedResult.ok) {
    return {
      ok: false,
      diagnostics: nestedResult.diagnostics,
    };
  }

  const chain = resolved.chain;

  // Validate _copy._preserve payload before merge (only when present)
  const preserveRaw = isPlainObject(copyValue) ? copyValue._preserve : undefined;
  let preservePayload: PreservePayload = {};
  if (preserveRaw !== undefined) {
    const preserveValidation = validatePreservePayload(preserveRaw, modContext.sourceEntityKind);
    if (!preserveValidation.valid) {
      return {
        ok: false,
        diagnostics: Object.freeze(
          preserveValidation.diagnostics.map((d) =>
            convertPreserveDiagnostic(d, record, modContext.sourcePath, modContext.sourceEntityKind),
          ),
        ),
      };
    }
    preservePayload = preserveValidation.payload;
  }

  const clonedBase = cloneRecord(nestedResult.record);

  applyDirectFieldOverlay(
    clonedBase.remaining,
    record.remaining,
    preservePayload,
    modContext.sourceEntityKind,
  );

  let diagnostics: readonly MaterializationDiagnostic[] = [];
  if (isPlainObject(copyValue) && copyValue._mod !== undefined) {
    diagnostics = convertModDiagnostic(
      applyModBlock(
        clonedBase.remaining,
        record,
        copyValue._mod,
        modContext.sourcePath,
      ),
      { sourceEntityKind: modContext.sourceEntityKind },
    );
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  // Reject if context fields would produce "unknown" in the result
  if (modContext.sourceEntityKind === "unknown" || modContext.sourcePath === "unknown") {
    return {
      ok: false,
      diagnostics: [Object.freeze({
        code: "INVALID_COPY_REFERENCE",
    severity: "error",
        message: `Successful materialization requires non-"unknown" sourceEntityKind and sourcePath`,
        sourcePath: modContext.sourcePath,
        entityName: record.name,
        entitySource: record.source,
        fieldTarget: "_copy",
        mode: undefined,
        rawParam: undefined,
      })],
    };
  }

  // Extract structured discriminators from the derived record's _copy value
  const discriminators: Record<string, unknown> = {};
  if (isPlainObject(copyValue)) {
    for (const [key, value] of Object.entries(copyValue)) {
      if (!key.startsWith("_")) {
        discriminators[key] = value;
      }
    }
  }

  // Terminal base from the exact final CopyChainStep
  const lastStep = chain.length > 0 ? chain[chain.length - 1]! : null;
  const terminalBase: {
    readonly name: string;
    readonly source: string;
    readonly entityKind: string;
    readonly sourcePath: string;
    readonly identity: Record<string, unknown>;
  } = lastStep
    ? {
        name: lastStep.entityName,
        source: lastStep.sourceAbbr,
        entityKind: lastStep.entityKind,
        sourcePath: lastStep.sourcePath,
        identity: lastStep.identity as Record<string, unknown>,
      }
    : {
        name: resolved.baseEntity.name,
        source: resolved.baseEntity.source,
        entityKind: modContext.sourceEntityKind,
        sourcePath: modContext.sourcePath,
        identity: {},
      };

  // Read deferred preserve from _copy._preserve and deep-clone it
  let deferredPreserve: unknown = undefined;
  if (isPlainObject(copyValue) && copyValue._preserve !== undefined) {
    deferredPreserve = cloneUnknown(copyValue._preserve);
  }

  return {
    ok: true,
    result: {
      identity: {
        name: record.name,
        source: record.source,
        entityKind: modContext.sourceEntityKind,
        sourcePath: modContext.sourcePath,
        discriminators,
      },
      record: { name: record.name, source: record.source, remaining: stripCopyDirectives(clonedBase.remaining) },
      inheritanceChain: chain,
      terminalBase,
      metadata: {
        deferredPreserve,
        diagnostics,
      },
    },
  };
}
