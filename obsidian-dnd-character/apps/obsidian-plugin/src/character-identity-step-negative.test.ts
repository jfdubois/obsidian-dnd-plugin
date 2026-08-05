import { describe, it, expect } from "vitest";
import { createEmptyCharacterDraft, getStepState } from "./character-draft";
import {
  validateIdentityInput,
  selectIdentity,
} from "./character-identity-step";

/* ── Validation rejects invalid input ─────────────────────────── */

describe("validateIdentityInput rejects invalid input", () => {
  it("rejects null", () => {
    expect(validateIdentityInput(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(validateIdentityInput(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateIdentityInput("")).toBe(false);
  });

  it("rejects number", () => {
    expect(validateIdentityInput(42)).toBe(false);
  });

  it("rejects boolean", () => {
    expect(validateIdentityInput(true)).toBe(false);
  });

  it("rejects array", () => {
    expect(validateIdentityInput([])).toBe(false);
  });

  it("rejects empty object", () => {
    expect(validateIdentityInput({})).toBe(false);
  });

  it("rejects object with empty name", () => {
    expect(validateIdentityInput({ name: "" })).toBe(false);
  });

  it("rejects object with non-string name", () => {
    expect(validateIdentityInput({ name: 123 })).toBe(false);
  });

  it("rejects object with null name", () => {
    expect(validateIdentityInput({ name: null })).toBe(false);
  });

  it("rejects object with undefined name", () => {
    expect(validateIdentityInput({ name: undefined })).toBe(false);
  });

  it("rejects object with non-string playerName", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", playerName: 123 }),
    ).toBe(false);
  });

  it("rejects object with non-string pronouns", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", pronouns: 123 }),
    ).toBe(false);
  });

  it("rejects object with non-string alignment", () => {
    expect(
      validateIdentityInput({ name: "Gandalf", alignment: 123 }),
    ).toBe(false);
  });
});

/* ── Selection rejects invalid input ──────────────────────────── */

describe("selectIdentity rejects invalid input", () => {
  it("returns false for empty name", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, { name: "" })).toBe(false);
  });

  it("returns false for null", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, null)).toBe(false);
  });

  it("returns false for undefined", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, undefined)).toBe(false);
  });

  it("returns false for string", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, "Gandalf")).toBe(false);
  });

  it("returns false for number", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, 42)).toBe(false);
  });

  it("returns false for empty object", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, {})).toBe(false);
  });

  it("returns false for object with non-string name", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, { name: 123 })).toBe(false);
  });

  it("returns false for object with non-string playerName", () => {
    const draft = createEmptyCharacterDraft();
    expect(selectIdentity(draft, { name: "Gandalf", playerName: 123 })).toBe(
      false,
    );
  });
});

/* ── Invalid selection does not mutate draft ──────────────────── */

describe("selectIdentity does not mutate draft on rejection", () => {
  it("does not change identity data for empty name", () => {
    const draft = createEmptyCharacterDraft();
    expect(draft.identity.name).toBe("");

    selectIdentity(draft, { name: "" });
    expect(draft.identity.name).toBe("");
  });

  it("does not change identity data for null", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, null);
    expect(draft.identity.name).toBe("");
  });

  it("does not resolve step for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "" });
    expect(getStepState(draft, "identity")).toBe("unvisited");
  });

  it("preserves existing valid selection after failed re-selection", () => {
    const draft = createEmptyCharacterDraft();
    selectIdentity(draft, { name: "Gandalf" });
    expect(draft.identity.name).toBe("Gandalf");

    selectIdentity(draft, { name: "" });
    expect(draft.identity.name).toBe("Gandalf");
  });

  it("does not invalidate dependents for invalid input", () => {
    const draft = createEmptyCharacterDraft();
    draft.stepStatuses.set("species", "resolved");

    selectIdentity(draft, { name: "" });
    expect(getStepState(draft, "species")).toBe("resolved");
  });
});
