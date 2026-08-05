import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import type { CollectedEffect, EffectProvenance } from "./effect-provenance";

/* ── Unsupported mechanic diagnostic interfaces ──────────────────
   A diagnostic engine that identifies effects the rules engine
   cannot fully automate, producing structured diagnostics for
   each unsupported mechanic.                                  */

/* ── Discriminated codes ─────────────────────────────────────────
   Each code indicates why a specific effect type cannot be
   fully automated by the rules engine.                        */

export type UnsupportedMechanicCode =
  | "effect-not-calculated"
  | "conditional-effect"
  | "unknown-effect-type";

/* ── Single diagnostic ───────────────────────────────────────────
   Connects an unsupported effect to a human-readable explanation
   and its origin provenance.                                  */

export interface UnsupportedMechanicDiagnostic {
  code: UnsupportedMechanicCode;
  effectType: string;
  provenance: EffectProvenance;
  message: string;
  effect: RuleEffect;
}

/* ── Result envelope ─────────────────────────────────────────────
   Returns all diagnostics as a sorted, frozen array alongside
   a convenience count.                                        */

export interface UnsupportedMechanicsResult {
  diagnostics: ReadonlyArray<UnsupportedMechanicDiagnostic>;
  unsupportedCount: number;
}

/* ── Calculated effect types ─────────────────────────────────────
   Effect types that the rules engine fully calculates into
   mechanical totals. These do NOT produce diagnostics.         */

const CALCULATED_EFFECT_TYPES: ReadonlyArray<string> = [
  "add-ability",
  "set-ability",
  "add-proficiency",
  "add-expertise",
  "set-movement",
  "add-movement",
  "add-sense",
  "add-resistance",
  "add-immunity",
  "add-capability",
  "set-ac-formula",
  "add-ac",
  "grant-spell",
  "grant-resource",
  "grant-attack",
  "add-hit-point-increase",
  "add-initiative",
];

const CALCULATED_SET = new Set(CALCULATED_EFFECT_TYPES);

/* ── Known but not-calculated effect types ───────────────────────
   These are recognized effect types that the engine tracks but
   does not calculate into a mechanical total.                 */

const NOT_CALCULATED_EFFECT_TYPES: ReadonlySet<string> = new Set([
  "add-language",
  "grant-feature",
]);

/* ── Conditional effect types ────────────────────────────────────
   Effects that require runtime predicate evaluation and cannot
   be statically resolved.                                    */

const CONDITIONAL_EFFECT_TYPES: ReadonlySet<string> = new Set([
  "conditional-roll-mode",
]);

/* ── Diagnostic factory ──────────────────────────────────────────
   Determines the code and message for a given effect type.
   Returns null if the effect is fully calculated.            */

function createDiagnosticForType(
  effectType: string,
  effect: RuleEffect,
  provenance: EffectProvenance,
): UnsupportedMechanicDiagnostic | null {
  // Fully calculated — no diagnostic
  if (CALCULATED_SET.has(effectType)) {
    return null;
  }

  // Known but not calculated
  if (NOT_CALCULATED_EFFECT_TYPES.has(effectType)) {
    const message =
      effectType === "add-language"
        ? "Language effects are tracked but not calculated into a mechanical total"
        : "Feature grants are tracked but not calculated into a mechanical total";
    return {
      code: "effect-not-calculated",
      effectType,
      provenance,
      message,
      effect,
    };
  }

  // Conditional — requires runtime predicate
  if (CONDITIONAL_EFFECT_TYPES.has(effectType)) {
    return {
      code: "conditional-effect",
      effectType,
      provenance,
      message: "Conditional roll mode effects require runtime predicate evaluation",
      effect,
    };
  }

  // Unknown effect type
  return {
    code: "unknown-effect-type",
    effectType,
    provenance,
    message: `Effect type '${effectType}' is not recognized by the rules engine`,
    effect,
  };
}

/* ── Stable sort key ─────────────────────────────────────────────
   Deterministic sort: effect type first, then provenance source
   kind, then entity ID.                                      */

function diagnosticSortKey(d: UnsupportedMechanicDiagnostic): string {
  const id = d.provenance.entityId as unknown as string;
  return `${d.effectType}::${d.provenance.sourceKind}::${id}`;
}

/* ── Detect unsupported mechanics ────────────────────────────────
   Takes collected effects (with provenance already attached) and
   identifies effects that the rules engine cannot fully automate.
   Returns a sorted, frozen array of diagnostics.             */

export function detectUnsupportedMechanics(
  collectedEffects: CollectedEffect[],
): UnsupportedMechanicsResult {
  const diagnostics: UnsupportedMechanicDiagnostic[] = [];

  for (const collected of collectedEffects) {
    const diag = createDiagnosticForType(
      collected.effect.type,
      collected.effect,
      collected.provenance,
    );

    if (diag !== null) {
      diagnostics.push(diag);
    }
  }

  // Deterministic sort
  diagnostics.sort((a, b) => {
    const keyA = diagnosticSortKey(a);
    const keyB = diagnosticSortKey(b);
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return {
    diagnostics: Object.freeze(diagnostics),
    unsupportedCount: diagnostics.length,
  };
}
