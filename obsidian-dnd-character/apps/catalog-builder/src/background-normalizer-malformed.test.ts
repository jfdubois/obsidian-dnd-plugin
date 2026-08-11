import { describe, expect, it } from "vitest";
import { normalizeBackgrounds } from "./background-normalizer";
import type { RawRecord } from "./raw-boundary";
import type { BackgroundSourceScopeContext } from "./background-source-scope";

const context: BackgroundSourceScopeContext = { knownPinnedSources: Object.freeze(new Set(["PHB", "XPHB"])) };

function normalize(remaining: Record<string, unknown>) {
  const record: RawRecord = { name: "Boundary Background", source: "XPHB", remaining };
  return normalizeBackgrounds({ records: [record], context, sourcePath: "backgrounds.json", entityKind: "background" });
}

function malformedEquipment(entry: unknown) {
  return normalize({ startingEquipment: [{ A: [entry], B: [{ value: 5000 }] }] });
}

describe("Background malformed equipment packages", () => {
  it("consumes a supported canonical, named, currency, and equipmentType package without an unmapped-equipment diagnostic", () => {
    const result = normalize({ startingEquipment: [{
      A: ["book|xphb", { special: "sealed case" }, { value: 1200 }, { equipmentType: "toolArtisan" }],
      B: [{ value: 5000 }],
    }] });
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "UNMAPPED_MECHANIC")).toBe(false);
    expect(result.backgrounds[0]?.choices.find((choice) => choice.type === "closed-option")).toBeDefined();
    expect(result.deferredEquipment).toHaveLength(1);
  });

  it.each([
    ["invalid package container", "not-a-package"],
    ["invalid package option", [{ A: "not-an-option", B: [] }]],
  ])("diagnoses %s without publishing equipment consequences", (_label, startingEquipment) => {
    const result = normalize({ startingEquipment });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNMAPPED_MECHANIC" })]));
    expect(result.backgrounds[0]?.choices).toEqual([]);
    expect(result.backgrounds[0]?.grants).toEqual([]);
  });

  it.each([
    ["unknown equipmentType", { equipmentType: "toolUnknown" }],
    ["empty equipmentType", { equipmentType: "" }],
    ["invalid equipmentTypes container", { equipmentTypes: "toolArtisan" }],
    ["empty equipmentTypes", { equipmentTypes: [] }],
    ["unsupported plural member", { equipmentTypes: ["toolArtisan", "toolUnknown"] }],
    ["zero query quantity", { equipmentType: "toolArtisan", quantity: 0 }],
    ["negative item quantity", { item: "book|xphb", quantity: -1 }],
    ["fractional item quantity", { item: "book|xphb", quantity: 1.5 }],
    ["empty named physical item", { special: "" }],
    ["invalid named-item quantity", { special: "toolkit", quantity: 0 }],
    ["invalid currency", { value: 0 }],
    ["unsupported structured component", { containsValue: 100 }],
  ])("diagnoses %s and emits no partial equipment choice", (_label, entry) => {
    const result = malformedEquipment(entry);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNMAPPED_MECHANIC" })]));
    expect(result.backgrounds[0]?.choices).toEqual([]);
    expect(result.backgrounds[0]?.grants).toEqual([]);
    expect(result.deferredEquipment).toEqual([]);
  });

  it("does not publish a partial default package when its nested equipmentType is malformed", () => {
    const result = normalize({ startingEquipment: [{ _: [{ equipmentType: "toolUnknown" }, { special: "valid name" }] }] });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNMAPPED_MECHANIC" })]));
    expect(result.backgrounds[0]?.choices).toEqual([]);
    expect(result.backgrounds[0]?.grants).toEqual([]);
  });
});

describe("Background malformed weighted ability allocation", () => {
  it.each([
    ["missing eligible abilities", { choose: { weighted: { weights: [2, 1] } } }],
    ["empty eligible abilities", { choose: { weighted: { from: [], weights: [2, 1] } } }],
    ["invalid ability", { choose: { weighted: { from: ["str", "lck"], weights: [2, 1] } } }],
    ["duplicate ability", { choose: { weighted: { from: ["str", "str"], weights: [2, 1] } } }],
    ["missing distribution", { choose: { weighted: { from: ["str"] } } }],
    ["empty distribution", { choose: { weighted: { from: ["str"], weights: [] } } }],
    ["zero bonus", { choose: { weighted: { from: ["str"], weights: [0] } } }],
    ["negative bonus", { choose: { weighted: { from: ["str"], weights: [-1] } } }],
    ["fractional bonus", { choose: { weighted: { from: ["str"], weights: [1.5] } } }],
    ["unsupported weighted shape", { choose: { weighted: [] } }],
  ])("diagnoses %s without publishing an ability allocation", (_label, entry) => {
    const result = normalize({ ability: [entry] });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNMAPPED_MECHANIC" })]));
    expect(result.backgrounds[0]?.choices.some((choice) => choice.type === "ability-allocation")).toBe(false);
  });
});
