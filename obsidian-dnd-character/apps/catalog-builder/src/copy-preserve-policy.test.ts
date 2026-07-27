import { describe, expect, it } from "vitest";
import {
  validatePreservePayload,
  shouldPreserveField,
  isFieldPreserveGated,
  computePreserveAllowance,
  type PreservePayload,
} from "./copy-preserve-policy";

describe("validatePreservePayload", () => {
  it("accepts empty plain object", () => {
    const result = validatePreservePayload({});
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(result.payload).toEqual({});
  });

  it("accepts wildcard with boolean true", () => {
    const result = validatePreservePayload({ "*": true });
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(result.payload["*"]).toBe(true);
  });

  it("accepts per-field markers with boolean true", () => {
    const result = validatePreservePayload({ page: true, srd: true });
    expect(result.valid).toBe(true);
  });

  it("rejects marker value 1", () => {
    const result = validatePreservePayload({ page: 1 });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_MARKER",
      reason: "INVALID_MARKER_VALUE",
      invalidMarkerValue: 1,
    });
  });

  it("rejects marker value 'true' string", () => {
    const result = validatePreservePayload({ page: "true" });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_MARKER",
      reason: "INVALID_MARKER_VALUE",
      invalidMarkerValue: "true",
    });
  });

  it("rejects null payload", () => {
    const result = validatePreservePayload(null);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects array payload", () => {
    const result = validatePreservePayload([true, false]);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects primitive string payload", () => {
    const result = validatePreservePayload("all");
    expect(result.valid).toBe(false);
  });

  it("rejects primitive number payload", () => {
    const result = validatePreservePayload(42);
    expect(result.valid).toBe(false);
  });

  it("rejects boolean payload", () => {
    const result = validatePreservePayload(true);
    expect(result.valid).toBe(false);
  });

  it("rejects nested object as marker value", () => {
    const result = validatePreservePayload({ page: { nested: true } });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      reason: "INVALID_MARKER_VALUE",
      invalidPreserveKey: "page",
    });
  });

  it("rejects array as marker value", () => {
    const result = validatePreservePayload({ page: ["trait"] });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      reason: "INVALID_MARKER_VALUE",
      invalidPreserveKey: "page",
    });
  });

  it("rejects null as marker value", () => {
    const result = validatePreservePayload({ page: null });
    expect(result.valid).toBe(false);
  });

  it("rejects false as marker value", () => {
    const result = validatePreservePayload({ page: false });
    expect(result.valid).toBe(false);
  });

  it("rejects 0 as marker value", () => {
    const result = validatePreservePayload({ page: 0 });
    expect(result.valid).toBe(false);
  });

  it("rejects empty string as marker value", () => {
    const result = validatePreservePayload({ page: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-true string as marker value", () => {
    const result = validatePreservePayload({ page: "yes" });
    expect(result.valid).toBe(false);
  });

  it("rejects undefined as marker value", () => {
    const result = validatePreservePayload({ page: undefined });
    expect(result.valid).toBe(false);
  });

  it("rejects empty string field key", () => {
    const result = validatePreservePayload({ "": true, page: true });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    const emptyKeyDiag = result.diagnostics.find((d) => d.validationReason === "EMPTY_FIELD_KEY");
    expect(emptyKeyDiag).toBeDefined();
  });

  it("rejects prototype-sensitive key: constructor", () => {
    const result = validatePreservePayload({ constructor: true });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      reason: "PROTOTYPE_SENSITIVE_KEY",
      invalidPreserveKey: "constructor",
    });
  });

  it("rejects prototype-sensitive key: __proto__", () => {
    // Simulate JSON-parsed input where __proto__ is an own property
    const payload = JSON.parse('{"__proto__": true}');
    const result = validatePreservePayload(payload);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      reason: "PROTOTYPE_SENSITIVE_KEY",
      invalidPreserveKey: "__proto__",
    });
  });

  it("rejects prototype-sensitive key: prototype", () => {
    const result = validatePreservePayload({ prototype: true });
    expect(result.valid).toBe(false);
  });

  it("emits multiple diagnostics for multiple invalid entries", () => {
    const result = validatePreservePayload({ page: false, srd: null, "*": "no" });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics.length).toBe(3);
  });

  it("accepts mixed valid markers in single payload", () => {
    const result = validatePreservePayload({ "*": true, page: true, srd: true });
    expect(result.valid).toBe(true);
  });

  it("returns frozen payload", () => {
    const result = validatePreservePayload({ page: true });
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(Object.isFrozen(result.payload)).toBe(true);
  });

  it("returns frozen diagnostics", () => {
    const result = validatePreservePayload(null);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });

  it("rejects undefined payload", () => {
    const result = validatePreservePayload(undefined);
    expect(result.valid).toBe(false);
  });

  it("rejects Date instance", () => {
    const result = validatePreservePayload(new Date());
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects Map instance", () => {
    const result = validatePreservePayload(new Map());
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects Set instance", () => {
    const result = validatePreservePayload(new Set());
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects RegExp instance", () => {
    const result = validatePreservePayload(/test/);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("rejects class instance", () => {
    class MyClass {
      page = true;
    }
    const result = validatePreservePayload(new MyClass());
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_PAYLOAD",
      reason: "NOT_PLAIN_OBJECT",
    });
  });

  it("accepts null prototype object", () => {
    const obj = Object.create(null);
    obj.page = true;
    const result = validatePreservePayload(obj);
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(result.payload).toEqual({ page: true });
  });

  it("rejects entity-kind-aware: cross-entity key for monster", () => {
    const result = validatePreservePayload({ legendaryGroup: true }, "race");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_KEY",
      reason: "CROSS_ENTITY_KEY",
      invalidPreserveKey: "legendaryGroup",
    });
  });

  it("rejects entity-kind-aware: cross-entity key for item", () => {
    const result = validatePreservePayload({ lootTables: true }, "monster");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_KEY",
      reason: "CROSS_ENTITY_KEY",
      invalidPreserveKey: "lootTables",
    });
  });

  it("accepts entity-kind-aware: valid keys for entity kind", () => {
    const result = validatePreservePayload({ legendaryGroup: true, page: true }, "monster");
    expect(result.valid).toBe(true);
  });

  it("rejects entity-kind-aware: unknown key for entity kind", () => {
    const result = validatePreservePayload({ unknownField: true }, "monster");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    expect(result.diagnostics[0]).toMatchObject({
      code: "INVALID_PRESERVE_KEY",
      reason: "UNKNOWN_FIELD_KEY",
      invalidPreserveKey: "unknownField",
    });
  });

  it("entity-kind-aware: skips key validation when entity kind is omitted", () => {
    const result = validatePreservePayload({ legendaryGroup: true, lootTables: true });
    expect(result.valid).toBe(true);
  });

  it("preserves structured diagnostic fields: invalidPreserveKey", () => {
    const result = validatePreservePayload({ "": true }, "monster");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("INVALID_PRESERVE_KEY");
    if (diag.code !== "INVALID_PRESERVE_KEY") throw new Error("unexpected code");
    expect(diag.invalidPreserveKey).toBe("");
    expect(diag.validationReason).toBe("EMPTY_FIELD_KEY");
  });

  it("preserves structured diagnostic fields: invalidMarkerValue", () => {
    const result = validatePreservePayload({ page: false }, "monster");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    const diag = result.diagnostics[0]!;
    expect(diag.code).toBe("INVALID_PRESERVE_MARKER");
    if (diag.code !== "INVALID_PRESERVE_MARKER") throw new Error("unexpected code");
    expect(diag.invalidMarkerValue).toBe(false);
    expect(diag.invalidPreserveKey).toBe("page");
    expect(diag.validationReason).toBe("INVALID_MARKER_VALUE");
  });

  it("preserves rawPreservePayload in diagnostics", () => {
    const raw = { page: false, srd: null };
    const result = validatePreservePayload(raw, "monster");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid");
    for (const diag of result.diagnostics) {
      expect(diag.rawPreservePayload).toBe(raw);
    }
  });
});

describe("entity-kind-aware preserve policy", () => {
  it("base fields are preserve-gated for any entity kind", () => {
    expect(isFieldPreserveGated("page", "monster")).toBe(true);
    expect(isFieldPreserveGated("srd", "race")).toBe(true);
    expect(isFieldPreserveGated("_versions", "class")).toBe(true);
    expect(isFieldPreserveGated("altArt", "background")).toBe(true);
  });

  it("non-gated fields are not preserve-gated", () => {
    expect(isFieldPreserveGated("trait", "monster")).toBe(false);
    expect(isFieldPreserveGated("name", "monster")).toBe(false);
    expect(isFieldPreserveGated("size", "monster")).toBe(false);
  });

  it("monster-specific fields are preserve-gated for monster kind", () => {
    expect(isFieldPreserveGated("legendaryGroup", "monster")).toBe(true);
    expect(isFieldPreserveGated("environment", "monster")).toBe(true);
    expect(isFieldPreserveGated("soundClip", "monster")).toBe(true);
    expect(isFieldPreserveGated("variant", "monster")).toBe(true);
    expect(isFieldPreserveGated("dragonCastingColor", "monster")).toBe(true);
    expect(isFieldPreserveGated("familiar", "monster")).toBe(true);
  });

  it("monster-specific fields are NOT preserve-gated for other entity kinds", () => {
    expect(isFieldPreserveGated("legendaryGroup", "race")).toBe(false);
    expect(isFieldPreserveGated("variant", "class")).toBe(false);
  });

  it("item-specific fields are preserve-gated for item kind", () => {
    expect(isFieldPreserveGated("lootTables", "item")).toBe(true);
    expect(isFieldPreserveGated("tier", "item")).toBe(true);
  });

  it("item-specific fields are preserve-gated for itemGroup kind", () => {
    expect(isFieldPreserveGated("lootTables", "itemGroup")).toBe(true);
    expect(isFieldPreserveGated("tier", "itemGroup")).toBe(true);
  });

  it("item-specific fields are preserve-gated for magicvariant kind", () => {
    expect(isFieldPreserveGated("lootTables", "magicvariant")).toBe(true);
    expect(isFieldPreserveGated("tier", "magicvariant")).toBe(true);
  });

  it("item-specific fields are NOT preserve-gated for other entity kinds", () => {
    expect(isFieldPreserveGated("lootTables", "monster")).toBe(false);
    expect(isFieldPreserveGated("tier", "race")).toBe(false);
  });

  it("unknown entity kind falls back to base fields only", () => {
    expect(isFieldPreserveGated("page", "unknownKind")).toBe(true);
    expect(isFieldPreserveGated("legendaryGroup", "unknownKind")).toBe(false);
    expect(isFieldPreserveGated("lootTables", "unknownKind")).toBe(false);
  });
});

describe("shouldPreserveField", () => {
  const emptyPayload = {} as PreservePayload;

  it("always preserves non-gated fields regardless of payload", () => {
    expect(shouldPreserveField("trait", "monster", emptyPayload)).toBe(true);
    expect(shouldPreserveField("name", "monster", emptyPayload)).toBe(true);
  });

  it("drops preserve-gated fields with empty payload", () => {
    expect(shouldPreserveField("page", "monster", emptyPayload)).toBe(false);
    expect(shouldPreserveField("srd", "monster", emptyPayload)).toBe(false);
  });

  it("preserves all gated fields with wildcard", () => {
    const wildcard: PreservePayload = Object.freeze({ "*": true });
    expect(shouldPreserveField("page", "monster", wildcard)).toBe(true);
    expect(shouldPreserveField("srd", "monster", wildcard)).toBe(true);
    expect(shouldPreserveField("_versions", "monster", wildcard)).toBe(true);
    expect(shouldPreserveField("legendaryGroup", "monster", wildcard)).toBe(true);
  });

  it("preserves explicitly named field", () => {
    const specific: PreservePayload = Object.freeze({ page: true });
    expect(shouldPreserveField("page", "monster", specific)).toBe(true);
    expect(shouldPreserveField("srd", "monster", specific)).toBe(false);
  });

  it("preserves multiple explicitly named fields", () => {
    const multi: PreservePayload = Object.freeze({ page: true, srd: true });
    expect(shouldPreserveField("page", "monster", multi)).toBe(true);
    expect(shouldPreserveField("srd", "monster", multi)).toBe(true);
    expect(shouldPreserveField("_versions", "monster", multi)).toBe(false);
  });

  it("entity-specific field requires explicit or wildcard preserve", () => {
    expect(shouldPreserveField("legendaryGroup", "monster", emptyPayload)).toBe(false);
    const specific: PreservePayload = Object.freeze({ legendaryGroup: true });
    expect(shouldPreserveField("legendaryGroup", "monster", specific)).toBe(true);
  });

  it("entity-specific field not gated for other kinds is always preserved", () => {
    expect(shouldPreserveField("legendaryGroup", "race", emptyPayload)).toBe(true);
  });
});

describe("computePreserveAllowance", () => {
  it("returns empty set for empty payload", () => {
    const allowance = computePreserveAllowance({});
    expect(allowance.size).toBe(0);
  });

  it("includes wildcard marker", () => {
    const allowance = computePreserveAllowance({ "*": true });
    expect(allowance.has("*")).toBe(true);
  });

  it("includes explicitly named fields", () => {
    const allowance = computePreserveAllowance({ page: true, srd: true });
    expect(allowance.has("page")).toBe(true);
    expect(allowance.has("srd")).toBe(true);
  });

  it("excludes wildcard from non-wildcard keys", () => {
    const allowance = computePreserveAllowance({ page: true });
    expect(allowance.has("*")).toBe(false);
  });
});
