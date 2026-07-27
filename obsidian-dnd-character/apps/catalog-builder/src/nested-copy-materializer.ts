import {
  type CopyChainStep,
  type CopyResolverContext,
  type LocatedCopyLevel,
} from "./copy-resolver";
import type {
  AppliedCopyTemplateMetadata,
  CopyModRawRecord,
  MaterializationDiagnostic,
} from "./mod-types";
import { cloneRecord } from "./copy-materialization-merge";
import { materializeCopyLevel } from "./copy-template-materializer";

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
  resolverContext: CopyResolverContext = { validatedFiles: {} },
):
  | {
      readonly ok: true;
      readonly record: CopyModRawRecord;
      readonly appliedTemplates: readonly AppliedCopyTemplateMetadata[];
    }
  | { readonly ok: false; readonly diagnostics: readonly MaterializationDiagnostic[] } {

  if (chain.length <= 1) {
    return { ok: true, record: resolvedBase, appliedTemplates: [] };
  }

  // Process from terminal base (last step) outward to the step just before derived
  // chain[0] = derived's reference, chain[chain.length-1] = terminal base
  // We need intermediate steps: chain[0] to chain[chain.length-2]
  // Process in reverse: chain[chain.length-2] down to chain[0]

  let current = cloneRecord(resolvedBase);
  const allDiagnostics: MaterializationDiagnostic[] = [];
  const appliedTemplates: AppliedCopyTemplateMetadata[] = [];

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

    const materialized = materializeCopyLevel(
      cloneRecord(current),
      intermediate,
      {
        resolverContext,
        sourcePath: intermediateSourcePath,
        sourceEntityKind: intermediateEntityKind,
        requestedIdentity: step.identity,
        inheritanceChain: failureChain,
      },
    );
    if (!materialized.ok) {
      allDiagnostics.push(...materialized.diagnostics);
      return { ok: false, diagnostics: allDiagnostics };
    }
    current = materialized.record;
    appliedTemplates.push(...materialized.appliedTemplates);
  }

  return { ok: true, record: current, appliedTemplates };
}
