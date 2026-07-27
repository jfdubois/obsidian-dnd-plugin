import {
  type CopyChainStep,
  type LocatedCopyLevel,
} from "./copy-resolver";
import {
  validatePreservePayload,
  type PreservePayload,
} from "./copy-preserve-policy";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
} from "./mod-types";
import {
  applyDirectFieldOverlay,
  cloneRecord,
  isPlainObject,
} from "./copy-materialization-merge";
import { applyModBlock } from "./copy-materialization-mods";
import {
  convertModDiagnostic,
  convertPreserveDiagnostic,
} from "./copy-materialization-diagnostics";

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
  locatedLevels: readonly LocatedCopyLevel[],
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
    const failureChain = Object.freeze(chain.slice(i));
    const locatedLevel = locatedLevels[i];
    const intermediate = locatedLevel?.record as CopyModRawRecord | undefined;
    if (locatedLevel === undefined || intermediate === undefined) {
      return {
        ok: false,
        diagnostics: Object.freeze([{
          code: "BASE_ENTITY_NOT_FOUND" as const,
          severity: "error" as const,
          message: `Intermediate record for chain step "${step.entityName}" (${step.sourceAbbr}) not found at "${step.sourcePath}"`,
          sourcePath: step.sourcePath,
          sourceEntityKind: step.entityKind,
          entityName: step.entityName,
          entitySource: step.sourceAbbr,
          fieldTarget: "_copy",
          mode: undefined,
          rawParam: step.identity,
          requestedIdentity: step.identity,
          inheritanceChain: failureChain,
        }]),
      };
    }

    const intermediateEntityKind = locatedLevel.entityKind;
    const intermediateSourcePath = locatedLevel.sourcePath;

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
              convertPreserveDiagnostic(
                d,
                intermediate,
                intermediateSourcePath,
                intermediateEntityKind,
                {
                  requestedIdentity: step.identity,
                  inheritanceChain: failureChain,
                },
              ),
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
        allDiagnostics.push(...convertModDiagnostic(modDiagnostics, {
          sourceEntityKind: intermediateEntityKind,
          requestedIdentity: step.identity,
          inheritanceChain: failureChain,
        }));
        return { ok: false, diagnostics: allDiagnostics };
      }
    }
  }

  return { ok: true, record: current };
}
