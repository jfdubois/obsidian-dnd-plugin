import { describe, expect, it } from "vitest";
import { isExternalReference, isExternalReferenceCollection, isRelativeExternalTarget } from "./external-reference";

describe("external reference contract", () => {
  it("accepts a single validated 5eTools relative target", () => expect(isExternalReference({ provider: "5etools", relativeTarget: "races.html#elf_phb" })).toBe(true));
  it.each(["", "https://example.invalid/a", "http://example.invalid/a", "//example.invalid/a", "javascript:alert(1)", "data:x", "file:x", "../escape", "a/../escape", "\\escape"])('rejects unsafe target %s', (target) => expect(isRelativeExternalTarget(target)).toBe(false));
  it("rejects unknown and duplicate providers", () => {
    expect(isExternalReference({ provider: "other", relativeTarget: "a.html" })).toBe(false);
    expect(isExternalReferenceCollection([{ provider: "5etools", relativeTarget: "a.html" }, { provider: "5etools", relativeTarget: "b.html" }])).toBe(false);
  });
});
