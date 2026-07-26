import {
  isCopyResolutionFailure,
  resolveCopy,
  type CopyResolverContext,
  type CopyResolverDiagnostic,
  type StructuredIdentity,
} from "./copy-resolver";
import { applyArrayModOperation } from "./mod-array-operations";
import { applyRootModOperation } from "./mod-root-operations";
import { applyScalarTextModOperation } from "./mod-scalar-text-operations";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
  MaterializedResolvedRecord,
  ModOperationDiagnostic,
} from "./mod-types";


// Re-export for backward compatibility
export type { CopyModRawRecord } from "./mod-types";

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneRecord(record: CopyModRawRecord): CopyModRawRecord {
  return {
    name: record.name,
    source: record.source,
    remaining: cloneObject(record.remaining),
  };
}

/**
 * Strips copy directives (_copy, _preserve) from a record's remaining fields.
 * These are resolution-time directives and should not appear in the materialized output.
 */
function stripCopyDirectives(remaining: Record<string, unknown>): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(remaining)) {
    if (key !== "_copy" && key !== "_preserve" && key !== "_mod") {
      stripped[key] = value;
    }
  }
  return stripped;
}

function cloneObject(record: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    cloned[key] = cloneUnknown(value);
  }
  return cloned;
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    return cloneObject(value);
  }
  return value;
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

/**
 * Sets of field names that require an explicit _preserve directive to be copied
 * from the base during a _copy merge. Matches 5eTools _MERGE_REQUIRES_PRESERVE_BASE.
 */
const MERGE_REQUIRES_PRESERVE = new Set([
  "page",
  "otherSources",
  "referenceSources",
  "srd",
  "srd52",
  "basicRules",
  "basicRules2024",
  "reprintedAs",
  "hasFluff",
  "hasFluffImages",
  "hasToken",
  "tokenCredit",
  "tokenCustom",
  "foundryTokenScale",
  "altArt",
  "_versions",
]);

/**
 * Applies the 5eTools-compatible direct-field overlay merge.
 *
 * Semantics (matches 5eTools utils.js getCopy, lines 6168-6178):
 * - Iterate over BASE keys.
 * - If derived has exactly null for that key → delete from result.
 * - If derived is absent (undefined) for that key → copy from base, unless
 *   the key is preserve-gated and _preserve doesn't allow it.
 * - If derived has any other value → leave derived value as-is.
 * - Derived non-directive keys NOT in the base are kept as-is.
 */
function applyDirectFieldOverlay(
  baseRemaining: Record<string, unknown>,
  derivedRemaining: Record<string, unknown>,
  copyValue: unknown,
): void {
  // First, overlay derived non-directive fields onto the base clone.
  // This handles derived keys that exist or don't exist in the base.
  for (const [key, value] of Object.entries(derivedRemaining)) {
    if (key.startsWith("_")) continue;
    if (value === null || value === undefined) continue;
    baseRemaining[key] = cloneUnknown(value);
  }

  // Then, iterate over BASE keys to handle gap-fill and null-as-delete.
  // This matches the upstream iteration direction (utils.js:6171-6177).
  const preserveAllowance = computePreserveAllowance(copyValue);

  for (const key of Object.keys(baseRemaining)) {
    const derivedValue = derivedRemaining[key];

    // If derived explicitly set this base key to null → delete from result
    if (derivedValue === null) {
      delete baseRemaining[key];
      continue;
    }

    // If derived doesn't have this key (undefined) → copy from base, unless preserve-gated
    if (derivedValue === undefined) {
      if (MERGE_REQUIRES_PRESERVE.has(key)) {
        if (!preserveAllowance.has("*") && !preserveAllowance.has(key)) {
          delete baseRemaining[key];
        }
      }
      // Otherwise base value stays (it's already in baseRemaining)
    }
    // If derived has a non-null, non-undefined value → already overlaid above; leave as-is
  }
}

function computePreserveAllowance(copyValue: unknown): Set<string> {
  const allowed = new Set<string>();
  if (isPlainObject(copyValue) && isPlainObject(copyValue._preserve)) {
    const preserve = copyValue._preserve as Record<string, unknown>;
    if (preserve["*"] !== undefined) {
      // Wildcard: all preserve-gated fields are allowed
      allowed.add("*");
    }
    for (const [key, value] of Object.entries(preserve)) {
      if (key !== "*" && value != null) {
        allowed.add(key);
      }
    }
  }
  return allowed;
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

/**
 * Converts a mod operation diagnostic into a MaterializationDiagnostic.
 * Safe because ModDiagnosticCode is a subtype of MaterializationDiagnosticCode.
 */
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
  const clonedBase = cloneRecord(resolved.baseEntity);
  applyDirectFieldOverlay(clonedBase.remaining, record.remaining, copyValue);
  if (!isPlainObject(copyValue) || copyValue._mod === undefined) {
    return {
      ok: true,
      record: { name: record.name, source: record.source, remaining: stripCopyDirectives(clonedBase.remaining) },
      diagnostics: [],
    };
  }
  const diagnostics = applyModBlock(
    clonedBase.remaining,
    record,
    copyValue._mod,
    modContext.sourcePath,
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

  const chain = resolved.chain;
  const clonedBase = cloneRecord(resolved.baseEntity);

  applyDirectFieldOverlay(clonedBase.remaining, record.remaining, copyValue);

  let diagnostics: readonly MaterializationDiagnostic[] = [];
  if (isPlainObject(copyValue) && copyValue._mod !== undefined) {
    diagnostics = convertModDiagnostic(
      applyModBlock(
        clonedBase.remaining,
        record,
        copyValue._mod,
        modContext.sourcePath,
      ),
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
