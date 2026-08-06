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
  { step: "proficiency-choices", dependsOn: ["species-choices", "background-choices", "class"] },
  { step: "proficiencies", dependsOn: ["species", "background", "class", "proficiency-choices"] },
  { step: "language-choices", dependsOn: ["species-choices", "background-choices", "class"] },
  { step: "languages", dependsOn: ["species", "background", "class", "language-choices"] },
  { step: "equipment-choices", dependsOn: ["background-choices", "class"] },
  { step: "equipment", dependsOn: ["background", "class", "equipment-choices"] },
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

function getDependents(step: DraftStep): DraftStep[] {
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
 * Steps that are invalidated will produce warning diagnostics.
 * Steps that are unresolved but required will produce error diagnostics.
 */
export function buildDraftDiagnostics(
  stepStatuses: ReadonlyArray<DraftStepStatus>,
): DraftDiagnostic[] {
  const diagnostics: DraftDiagnostic[] = [];
  const statusMap = new Map<DraftStep, DraftStepState>();

  for (const status of stepStatuses) {
    statusMap.set(status.step, status.state);
  }

  for (const dep of DEPENDENCY_GRAPH) {
    const state = statusMap.get(dep.step);
    if (state === "invalidated") {
      diagnostics.push({
        step: dep.step,
        message: `Selections may be outdated due to upstream changes`,
        severity: "warning",
      });
    } else if (state === "unvisited") {
      // Only flag as error if this step has dependencies that are resolved
      // (meaning the user has progressed past it)
      const hasResolvedDependency = dep.dependsOn.some(
        (s) => statusMap.get(s) === "resolved",
      );
      if (hasResolvedDependency) {
        diagnostics.push({
          step: dep.step,
          message: `Required step not yet completed`,
          severity: "error",
        });
      }
    }
  }

  return diagnostics;
}
