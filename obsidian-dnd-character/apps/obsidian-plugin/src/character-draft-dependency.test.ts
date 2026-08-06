import { describe, it, expect } from "vitest";
import {
  createEmptyCharacterDraft,
  markStepResolved,
  invalidateDependentSteps,
  hasErrors,
  getStepState,
} from "./character-draft";
import {
  getTransitiveDependents,
  getStepDependencies,
  buildDraftDiagnostics,
} from "./character-draft-dependency";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

describe("Dependency graph", () => {
  it("species depends on ruleset and sources", () => {
    const deps = getStepDependencies("species");
    expect(deps).toContain("ruleset");
    expect(deps).toContain("sources");
  });

  it("species-choices depends on species", () => {
    const deps = getStepDependencies("species-choices");
    expect(deps).toContain("species");
  });

  it("spells depends on spell-eligibility", () => {
    const deps = getStepDependencies("spells");
    expect(deps).toContain("spell-eligibility");
  });

  it("ruleset has no dependencies", () => {
    const deps = getStepDependencies("ruleset");
    expect(deps).toHaveLength(0);
  });

  it("identity has no dependencies", () => {
    const deps = getStepDependencies("identity");
    expect(deps).toHaveLength(0);
  });
});

describe("Transitive dependents", () => {
  it("transitive dependents of ruleset includes species", () => {
    const dependents = getTransitiveDependents("ruleset");
    expect(dependents).toContain("species");
    expect(dependents).toContain("sources");
    expect(dependents).toContain("abilities");
  });

  it("transitive dependents of species includes species-choices", () => {
    const dependents = getTransitiveDependents("species");
    expect(dependents).toContain("species-choices");
    expect(dependents).toContain("abilities");
  });
});

describe("Dependency invalidation", () => {
  it("invalidating species invalidates species-choices and abilities", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "species");
    markStepResolved(draft, "species-choices");
    markStepResolved(draft, "abilities");

    const invalidated = invalidateDependentSteps(draft, "species");

    expect(getStepState(draft, "species-choices")).toBe("invalidated");
    expect(getStepState(draft, "abilities")).toBe("invalidated");
    expect(invalidated).toContain("species-choices");
    expect(invalidated).toContain("abilities");
  });

  it("invalidating ruleset cascades through dependent steps", () => {
    const draft = createEmptyCharacterDraft();
    for (const step of ALL_DRAFT_STEPS) {
      markStepResolved(draft, step);
    }

    invalidateDependentSteps(draft, "ruleset");

    const dependents = getTransitiveDependents("ruleset");
    for (const dep of dependents) {
      expect(getStepState(draft, dep)).toBe("invalidated");
    }
  });

  it("invalidating identity does not affect other steps", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "identity");
    markStepResolved(draft, "species");

    const invalidated = invalidateDependentSteps(draft, "identity");

    expect(invalidated).toHaveLength(0);
    expect(getStepState(draft, "species")).toBe("resolved");
  });
});

describe("Re-resolution invalidation (CRE-005/006/007)", () => {
  it("CRE-005: re-resolving ruleset invalidates all downstream dependent steps", () => {
    const draft = createEmptyCharacterDraft();
    // Resolve all steps first
    for (const step of ALL_DRAFT_STEPS) {
      markStepResolved(draft, step);
    }
    // Verify all steps are resolved before re-resolution
    for (const step of ALL_DRAFT_STEPS) {
      expect(getStepState(draft, step)).toBe("resolved");
    }

    // Re-resolve ruleset (simulating user changing ruleset)
    markStepResolved(draft, "ruleset");

    // All transitive dependents of ruleset should be invalidated
    const dependents = getTransitiveDependents("ruleset");
    for (const dep of dependents) {
      expect(getStepState(draft, dep)).toBe("invalidated");
    }
    // ruleset itself should remain resolved
    expect(getStepState(draft, "ruleset")).toBe("resolved");
    // identity should remain resolved (not a ruleset dependent)
    expect(getStepState(draft, "identity")).toBe("resolved");
  });

  it("CRE-006: re-resolving species invalidates species-origin choices", () => {
    const draft = createEmptyCharacterDraft();
    // Resolve species and its downstream dependents
    markStepResolved(draft, "species");
    markStepResolved(draft, "species-choices");
    markStepResolved(draft, "abilities");

    // Verify species-choices and abilities are resolved before re-resolution
    expect(getStepState(draft, "species-choices")).toBe("resolved");
    expect(getStepState(draft, "abilities")).toBe("resolved");

    // Re-resolve species (simulating user changing species)
    markStepResolved(draft, "species");

    // species-choices and abilities should be invalidated
    expect(getStepState(draft, "species-choices")).toBe("invalidated");
    expect(getStepState(draft, "abilities")).toBe("invalidated");
    // species itself should remain resolved
    expect(getStepState(draft, "species")).toBe("resolved");
  });

  it("CRE-007: re-resolving class invalidates class and spell choices", () => {
    const draft = createEmptyCharacterDraft();
    // Resolve class and its downstream dependents
    markStepResolved(draft, "class");
    markStepResolved(draft, "class-starting-grants");
    markStepResolved(draft, "spell-eligibility");
    markStepResolved(draft, "spells");

    // Verify downstream steps are resolved before re-resolution
    expect(getStepState(draft, "class-starting-grants")).toBe("resolved");
    expect(getStepState(draft, "spell-eligibility")).toBe("resolved");
    expect(getStepState(draft, "spells")).toBe("resolved");

    // Re-resolve class (simulating user changing class)
    markStepResolved(draft, "class");

    // class-starting-grants, spell-eligibility, and spells should be invalidated
    expect(getStepState(draft, "class-starting-grants")).toBe("invalidated");
    expect(getStepState(draft, "spell-eligibility")).toBe("invalidated");
    expect(getStepState(draft, "spells")).toBe("invalidated");
    // class itself should remain resolved
    expect(getStepState(draft, "class")).toBe("resolved");
  });

  it("re-resolving step does not invalidate unrelated steps", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "identity");
    markStepResolved(draft, "species");
    markStepResolved(draft, "species-choices");

    // Re-resolve species
    markStepResolved(draft, "species");

    // identity should remain resolved (not a species dependent)
    expect(getStepState(draft, "identity")).toBe("resolved");
  });
});

describe("Diagnostics", () => {
  it("produces warning for invalidated steps", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "species");
    invalidateDependentSteps(draft, "species");

    expect(draft.diagnostics.length).toBeGreaterThan(0);
    const hasWarning = draft.diagnostics.some((d) => d.severity === "warning");
    expect(hasWarning).toBe(true);
  });

  it("hasErrors returns false when only warnings exist", () => {
    const draft = createEmptyCharacterDraft();
    markStepResolved(draft, "species");
    invalidateDependentSteps(draft, "species");

    expect(hasErrors(draft)).toBe(false);
  });

  it("buildDraftDiagnostics produces error for unresolved required steps", () => {
    const statuses = [
      { step: "species" as const, state: "resolved" as const },
      { step: "species-choices" as const, state: "unvisited" as const },
    ];
    const diagnostics = buildDraftDiagnostics(statuses);
    const hasError = diagnostics.some((d) => d.severity === "error");
    expect(hasError).toBe(true);
  });
});
