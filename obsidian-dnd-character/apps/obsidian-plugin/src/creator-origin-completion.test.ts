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
});
