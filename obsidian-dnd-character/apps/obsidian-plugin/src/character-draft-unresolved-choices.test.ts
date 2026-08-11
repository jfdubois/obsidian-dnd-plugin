import { describe, it, expect } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import {
  createEmptyCharacterDraft,
  markStepResolved,
} from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";

/* ── Origin choice diagnostic boundary ──────────────────────────
   A selection alone does not prove that an active catalog choice exists.
   Catalog-derived diagnostics are rendered only after the consequence model
   has loaded.                                                     */

describe("Unresolved choice diagnostics", () => {
  function setupDraft() {
    const draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    return draft;
  }

  /* ── No premature choice errors ────────────────────────────── */

  describe("Catalog consequence loading boundary", () => {
    it("does not emit a species unresolved-choice error before a consequence model exists", () => {
      const draft = setupDraft();
      selectSpecies(draft, createEntityId("human"));

      const hasError = draft.diagnostics.some(
        (d) => d.severity === "error" && d.step === "species-choices",
      );
      expect(hasError).toBe(false);
    });

    it("does not emit a background unresolved-choice error before a consequence model exists", () => {
      const draft = setupDraft();
      draft.background.backgroundId = createEntityId("sage");
      markStepResolved(draft, "background");

      const hasError = draft.diagnostics.some(
        (d) => d.severity === "error" && d.step === "background-choices",
      );
      expect(hasError).toBe(false);
    });

    it("does not emit a class unresolved-choice error before a consequence model exists", () => {
      const draft = setupDraft();
      draft.class.classId = createEntityId("fighter");
      markStepResolved(draft, "class");

      const hasError = draft.diagnostics.some(
        (d) => d.severity === "error" && d.step === "class-starting-grants",
      );
      expect(hasError).toBe(false);
    });
  });

  /* ── Negative tests: no unresolved choice errors ───────────── */

  describe("Negative: no unresolved choice errors", () => {
    it("all three entity choices resolved → no unresolved-choice error diagnostics", () => {
      const draft = setupDraft();

      // Select species and resolve species-choices
      selectSpecies(draft, createEntityId("human"));
      markStepResolved(draft, "species-choices");

      // Select background and resolve background-choices
      draft.background.backgroundId = createEntityId("sage");
      markStepResolved(draft, "background");
      markStepResolved(draft, "background-choices");

      // Select class and resolve class-starting-grants
      draft.class.classId = createEntityId("fighter");
      markStepResolved(draft, "class");
      markStepResolved(draft, "class-starting-grants");

      const hasUnresolvedChoiceError = draft.diagnostics.some(
        (d) =>
          d.severity === "error" &&
          (d.step === "species-choices" ||
            d.step === "background-choices" ||
            d.step === "class-starting-grants"),
      );
      expect(hasUnresolvedChoiceError).toBe(false);
    });

    it("no entity selected → no unresolved-choice error diagnostics", () => {
      const draft = setupDraft();

      // No species, background, or class selected
      // diagnostics should not contain unresolved-choice errors
      const hasUnresolvedChoiceError = draft.diagnostics.some(
        (d) =>
          d.severity === "error" &&
          (d.step === "species-choices" ||
            d.step === "background-choices" ||
            d.step === "class-starting-grants"),
      );
      expect(hasUnresolvedChoiceError).toBe(false);
    });
  });
});
