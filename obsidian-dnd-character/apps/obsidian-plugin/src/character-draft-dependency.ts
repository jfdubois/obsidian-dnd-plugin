/* ── Character draft: dependency tracking ────────────────────────
   Each creation step may depend on upstream steps. When an upstream
   step changes, all dependent downstream steps are marked invalid
   so the user knows which selections need re-evaluation.          */

import type { DraftStep } from "./character-draft-entity-steps";

/* ── Dependency graph ──────────────────────────────────────────── */

interface DraftDependency {
  step: DraftStep;
  dependsOn: ReadonlyArray<DraftStep>;
}

const DEPENDENCY_GRAPH: ReadonlyArray<DraftDependency> = [
  { step: "ruleset", dependsOn: [] },
  { step: "sources", dependsOn: ["ruleset"] },
  { step: "identity", dependsOn: [] },
  { step: "species", dependsOn: ["ruleset", "sources"] },
  { step: "species-choices", dependsOn: ["species"] },
  { step: "background", dependsOn: ["ruleset", "sources"] },
  { step: "background-choices", dependsOn: ["background"] },
  { step: "class", dependsOn: ["ruleset", "sources"] },
  { step: "class-starting-grants", dependsOn: ["class"] },
  { step: "abilities", dependsOn: ["ruleset", "species"] },
  // Origin consequences own their selections; global pages are summaries.
  { step: "proficiency-choices", dependsOn: [] },
  { step: "proficiencies", dependsOn: [] },
  { step: "language-choices", dependsOn: [] },
  { step: "languages", dependsOn: [] },
  { step: "equipment-choices", dependsOn: [] },
  { step: "equipment", dependsOn: [] },
  { step: "spell-eligibility", dependsOn: ["class", "species"] },
  { step: "spells", dependsOn: ["spell-eligibility", "class", "species"] },
  { step: "review", dependsOn: [] },
];

/* ── Step state ────────────────────────────────────────────────── */

export type DraftStepState = "unvisited" | "resolved" | "invalidated";

export interface DraftStepStatus {
  step: DraftStep;
  state: DraftStepState;
}

/* ── Diagnostics ───────────────────────────────────────────────── */

export interface DraftDiagnostic {
  step: DraftStep;
  message: string;
  severity: "warning" | "error";
}

/* ── Dependency helpers ────────────────────────────────────────── */

function getDependencies(step: DraftStep): ReadonlyArray<DraftStep> {
  const entry = DEPENDENCY_GRAPH.find((d) => d.step === step);
  return entry?.dependsOn ?? [];
}

export function getDependents(step: DraftStep): DraftStep[] {
  const dependents: DraftStep[] = [];
  for (const dep of DEPENDENCY_GRAPH) {
    if (dep.dependsOn.includes(step)) {
      dependents.push(dep.step);
    }
  }
  return dependents;
}

/**
 * Returns all steps that are transitively downstream of the given step.
 * Used to determine which steps should be invalidated when an upstream
 * step changes.
 */
export function getTransitiveDependents(step: DraftStep): DraftStep[] {
  const visited = new Set<DraftStep>();
  const result: DraftStep[] = [];
  const queue: DraftStep[] = [step];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of getDependents(current)) {
      if (!visited.has(dependent)) {
        visited.add(dependent);
        result.push(dependent);
        queue.push(dependent);
      }
    }
  }

  return result;
}

/**
 * Returns the list of steps that a given step directly depends on.
 */
export function getStepDependencies(step: DraftStep): ReadonlyArray<DraftStep> {
  return getDependencies(step);
}

/**
 * Builds a list of diagnostics for the current draft state.
 * Invalidated steps are consolidated into a single warning diagnostic
 * to avoid repeated stale-selection warnings. Steps that are unresolved
 * but required will produce error diagnostics.
 */
export function buildDraftDiagnostics(
  stepStatuses: ReadonlyArray<DraftStepStatus>,
): DraftDiagnostic[] {
  const diagnostics: DraftDiagnostic[] = [];
  const statusMap = new Map<DraftStep, DraftStepState>();

  for (const status of stepStatuses) {
    statusMap.set(status.step, status.state);
  }

  // Collect invalidated steps for consolidated warning
  const invalidatedSteps: DraftStep[] = [];
  for (const dep of DEPENDENCY_GRAPH) {
    const state = statusMap.get(dep.step);
    if (state === "invalidated") {
      invalidatedSteps.push(dep.step);
    } else if (state === "unvisited") {
      // Only flag as error if this step was actually skipped (has resolved
      // dependents downstream), not merely unvisited because the user hasn't
      // reached it yet. After initial ruleset selection, downstream steps are
      // unvisited but not skipped — they should not produce error diagnostics.
      const dependents = getDependents(dep.step);
      const hasResolvedDependent = dependents.some(
        (s) => statusMap.get(s) === "resolved",
      );
      if (hasResolvedDependent) {
        diagnostics.push({
          step: dep.step,
          message: `Required step not yet completed`,
          severity: "error",
        });
      }
    }
  }

  // Emit a single consolidated warning for all invalidated steps
  if (invalidatedSteps.length > 0) {
    diagnostics.push({
      step: invalidatedSteps[0]!,
      message: `Selections may be outdated due to upstream changes (${invalidatedSteps.length} step${invalidatedSteps.length > 1 ? "s" : ""} affected)`,
      severity: "warning",
    });
  }

  return diagnostics;
}
