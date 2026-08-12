import { describe, expect, it } from "vitest";
import { createEntityId } from "@obsidian-dnd/domain";
import { isOriginConsequenceComplete } from "./creator-origin-completion";
import type { SelectionConsequenceModel } from "./creator-consequence-service";

const acolyte = createEntityId("background:2014:phb:acolyte");

function model(overrides: Partial<SelectionConsequenceModel> = {}): SelectionConsequenceModel {
  return {
    origins: [{ origin: { id: acolyte }, effects: [], grants: [], choices: [], levelOneGrants: [] }] as unknown as SelectionConsequenceModel["origins"],
    diagnostics: [], activeChoiceIds: new Set(), activeGrantIds: new Set(), ...overrides,
  };
}

describe("isOriginConsequenceComplete", () => {
  it("completes an origin with zero active choices without a persisted choice", () => {
    expect(isOriginConsequenceComplete(model(), acolyte)).toBe(true);
  });

  it("keeps active choices blocking while ignoring inactive historical resolutions", () => {
    const unresolved = model({
      origins: [{ origin: { id: acolyte }, effects: [], grants: [], choices: [{ status: "unresolved" }], levelOneGrants: [] }] as unknown as SelectionConsequenceModel["origins"],
      diagnostics: [{ code: "stale-choice", originId: acolyte, message: "old selection" }],
    });
    expect(isOriginConsequenceComplete(unresolved, acolyte)).toBe(false);

    const resolved = model({ diagnostics: [{ code: "stale-choice", originId: acolyte, message: "old selection" }] });
    expect(isOriginConsequenceComplete(resolved, acolyte)).toBe(true);
  });

  it("does not treat a fixed-currency grant as a random blocker", () => {
    const fixedCurrency = { grant: { type: "currency", amount: { type: "fixed" } }, resolvedAmount: 1500 };
    expect(isOriginConsequenceComplete(model({
      origins: [{ origin: { id: acolyte }, effects: [], grants: [fixedCurrency], choices: [], levelOneGrants: [] }] as unknown as SelectionConsequenceModel["origins"],
    }), acolyte)).toBe(true);
  });

  it("does not treat item, named-item, and fixed-currency grants as random blockers", () => {
    const ordinaryGrants = [
      { grant: { type: "item" } },
      { grant: { type: "named-item" } },
      { grant: { type: "currency", amount: { type: "fixed" } }, resolvedAmount: 1500 },
    ];
    expect(isOriginConsequenceComplete(model({
      origins: [{ origin: { id: acolyte }, effects: [], grants: ordinaryGrants, choices: [], levelOneGrants: [] }] as unknown as SelectionConsequenceModel["origins"],
    }), acolyte)).toBe(true);
  });

  it.each([
    ["unresolved", false],
    ["invalid", false],
    ["resolved", true],
  ] as const)("treats a %s dice-currency resolution as %s", (status, expected) => {
    expect(isOriginConsequenceComplete(model({
      origins: [{ origin: { id: acolyte }, effects: [], grants: [{ randomResolution: { status } }], choices: [], levelOneGrants: [] }] as unknown as SelectionConsequenceModel["origins"],
    }), acolyte)).toBe(expected);
  });
});
