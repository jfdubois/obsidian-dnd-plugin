import { describe, expect, it } from "vitest";
import { createDeterministicRuleGrantId } from "./rule-grant-id";

describe("createDeterministicRuleGrantId", () => {
  it("is stable for equivalent normalized owner and source path", () => {
    expect(createDeterministicRuleGrantId("background:2014:phb:acolyte", "startingEquipment._[0]"))
      .toBe(createDeterministicRuleGrantId(" Background:2014:PHB:Acolyte ", "startingEquipment._[0]"));
  });

  it("is scope unique without display text", () => {
    const first = createDeterministicRuleGrantId("background:2014:phb:acolyte", "startingEquipment._[0]");
    const second = createDeterministicRuleGrantId("background:2014:phb:acolyte", "startingEquipment._[1]");
    expect(first).not.toBe(second);
    expect(first).not.toContain("holy-symbol");
  });

  it("rejects missing normalized provenance", () => {
    expect(() => createDeterministicRuleGrantId("", "equipment[0]")).toThrow("owner scope");
  });
});
