import { describe, it, expect } from "vitest";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import {
  validateIdentityInput,
  selectIdentity,
} from "./character-identity-step";

/* ── Validation accepts valid input ───────────────────────────── */

describe("validateIdentityInput accepts valid input", () => {
  it("accepts identity with just a name", () => {
    expect(validateIdentityInput({ name: "Gandalf" })).toBe(true);
  });

  it("accepts identity with name and playerName", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", playerName: "Alice" }),
    ).toBe(true);
  });

  it("accepts identity with name and pronouns", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", pronouns: "they/them" }),
    ).toBe(true);
  });

  it("accepts identity with name and alignment", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", alignment: "Lawful Good" }),
    ).toBe(true);
  });

  it("accepts identity with all fields", () => {
    expect(
      validateIdentityInput({
        name: "Gandalf",
        playerName: "Alice",
        pronouns: "they/them",
        alignment: "Lawful Good",
      }),
    ).toBe(true);
  });

  it("type-narrows to DraftIdentityData on success", () => {
    const identity = { name: "Gandalf", playerName: "Alice" };
    if (validateIdentityInput(identity)) {
      // Narrows to DraftIdentityData
      expect(typeof identity.name).toBe("string");
      expect(typeof identity.playerName).toBe("string");
    }
  });
});

/* ── Selection with valid input ────────────────────────────────── */

describe("selectIdentity with valid input", () => {
  it("sets character name on the draft", () => {
    const draft = createEmptyCharacterDraft();
    const result = selectIdentity(draft, { name: "Gandalf" });

    expect(result).toBe(true);
    expect(draft.identity.name).toBe("Gandalf");
  });

  it("sets all identity fields on the draft", () => {
    const draft = createEmptyCharacterDraft();
    const result = selectIdentity(draft, {
      name: "Gandalf",
      playerName: "Alice",
      pronouns: "they/them",
      alignment: "Lawful Good",
    });

    expect(result).toBe(true);
    expect(draft.identity.name).toBe("Gandalf");
    expect(draft.identity.playerName).toBe("Alice");
    expect(draft.identity.pronouns).toBe("they/them");
    expect(draft.identity.alignment).toBe("Lawful Good");
  });

  it("sets only name when optional fields are omitted", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "Gandalf" });

    expect(draft.identity.name).toBe("Gandalf");
    expect(draft.identity.playerName).toBeUndefined();
    expect(draft.identity.pronouns).toBeUndefined();
    expect(draft.identity.alignment).toBeUndefined();
  });

  it("marks the identity step as resolved", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "Gandalf" });

    expect(getStepState(draft, "identity")).toBe("resolved");
  });

  it("does not invalidate any steps (identity has no dependents)", () => {
    const draft = createEmptyCharacterDraft();
    // Pre-resolve some other steps
    draft.stepStatuses.set("species", "resolved");
    draft.stepStatuses.set("background", "resolved");

    selectIdentity(draft, { name: "Gandalf" });

    // No steps should be invalidated since identity has no dependents
    expect(getStepState(draft, "species")).toBe("resolved");
    expect(getStepState(draft, "background")).toBe("resolved");
  });

  it("overwrites a previously set identity", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "Gandalf" });
    expect(draft.identity.name).toBe("Gandalf");

    selectIdentity(draft, { name: "Aragorn", playerName: "Bob" });
    expect(draft.identity.name).toBe("Aragorn");
    expect(draft.identity.playerName).toBe("Bob");
  });

  it("updates diagnostics after selection", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "Gandalf" });

    expect(draft.diagnostics.some((d) => d.severity === "error")).toBe(false);
  });

  it("works independently of ruleset step", () => {
    const draft = createEmptyCharacterDraft();
    // Do NOT resolve ruleset first — identity is independent

    const result = selectIdentity(draft, { name: "Gandalf" });
    expect(result).toBe(true);
    expect(draft.identity.name).toBe("Gandalf");
  });

  it("works independently of sources step", () => {
    const draft = createEmptyCharacterDraft();
    // Do NOT resolve sources first — identity is independent

    const result = selectIdentity(draft, { name: "Gandalf" });
    expect(result).toBe(true);
    expect(draft.identity.name).toBe("Gandalf");
  });
});
