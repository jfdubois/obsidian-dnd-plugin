import { describe, expect, it } from "vitest";
import { computeSourceFingerprint } from "./semantic-mapping-fingerprint";

describe("computeSourceFingerprint", () => {
  it("produces a 64-character lowercase hex string", () => {
    const fp = computeSourceFingerprint({ a: 1 });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: same input always produces same output", () => {
    const input = { name: "fighter", source: "PHB", level: 1 };
    const fp1 = computeSourceFingerprint(input);
    const fp2 = computeSourceFingerprint(input);
    expect(fp1).toBe(fp2);
  });

  it("key order independence: different insertion order produces same fingerprint", () => {
    const fp1 = computeSourceFingerprint({ a: 1, b: 2, c: 3 });
    const fp2 = computeSourceFingerprint({ c: 3, a: 1, b: 2 });
    const fp3 = computeSourceFingerprint({ b: 2, c: 3, a: 1 });
    expect(fp1).toBe(fp2);
    expect(fp2).toBe(fp3);
  });

  it("handles nested objects with sorted keys", () => {
    const fp1 = computeSourceFingerprint({
      z: { b: 2, a: 1 },
      a: { d: 4, c: 3 },
    });
    const fp2 = computeSourceFingerprint({
      a: { c: 3, d: 4 },
      z: { a: 1, b: 2 },
    });
    expect(fp1).toBe(fp2);
  });

  it("handles arrays preserving element order", () => {
    const fp1 = computeSourceFingerprint({ items: [1, 2, 3] });
    const fp2 = computeSourceFingerprint({ items: [1, 2, 3] });
    expect(fp1).toBe(fp2);

    const fp3 = computeSourceFingerprint({ items: [3, 2, 1] });
    expect(fp1).not.toBe(fp3);
  });

  it("handles arrays of objects", () => {
    const fp1 = computeSourceFingerprint({
      items: [{ z: 1, a: 2 }, { b: 3 }],
    });
    const fp2 = computeSourceFingerprint({
      items: [{ a: 2, z: 1 }, { b: 3 }],
    });
    expect(fp1).toBe(fp2);
  });

  it("handles primitive values", () => {
    expect(computeSourceFingerprint({ s: "hello" })).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSourceFingerprint({ n: 42 })).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSourceFingerprint({ b: true })).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSourceFingerprint({ n: null })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different inputs produce different fingerprints", () => {
    const fp1 = computeSourceFingerprint({ a: 1 });
    const fp2 = computeSourceFingerprint({ a: 2 });
    expect(fp1).not.toBe(fp2);
  });

  it("empty object produces a valid fingerprint", () => {
    const fp = computeSourceFingerprint({});
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deeply nested objects are canonicalized", () => {
    const fp1 = computeSourceFingerprint({
      outer: {
        middle: {
          z: { inner: "value" },
          a: { inner: "value" },
        },
      },
    });
    const fp2 = computeSourceFingerprint({
      outer: {
        middle: {
          a: { inner: "value" },
          z: { inner: "value" },
        },
      },
    });
    expect(fp1).toBe(fp2);
  });

  it("handles boolean values in nested structures", () => {
    const fp = computeSourceFingerprint({
      flags: { enabled: true, disabled: false },
    });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles mixed types in arrays", () => {
    const fp = computeSourceFingerprint({
      mixed: [1, "two", true, null, { a: 1 }],
    });
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("null differs from missing key", () => {
    const fp1 = computeSourceFingerprint({ a: null });
    const fp2 = computeSourceFingerprint({});
    expect(fp1).not.toBe(fp2);
  });

  it("primitive type differences matter", () => {
    const fp1 = computeSourceFingerprint({ v: 1 });
    const fp2 = computeSourceFingerprint({ v: "1" });
    expect(fp1).not.toBe(fp2);
  });

  it("null-prototype objects are supported", () => {
    const obj = Object.create(null);
    obj.a = 1;
    obj.b = 2;
    const fp = computeSourceFingerprint(obj as Record<string, unknown>);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("Unicode keys are handled correctly", () => {
    const fp1 = computeSourceFingerprint({ "\u00e9": 1, "a": 2 });
    const fp2 = computeSourceFingerprint({ "a": 2, "\u00e9": 1 });
    expect(fp1).toBe(fp2);
  });

  it("repeated calls produce identical hashes", () => {
    const input = { a: { z: 1, b: { x: true, y: false } }, c: [1, null, "hi"] };
    const hashes = Array.from({ length: 5 }, () => computeSourceFingerprint(input));
    expect(hashes.every((h) => h === hashes[0])).toBe(true);
  });

  describe("rejection of unsupported values", () => {
    it("rejects undefined object property", () => {
      expect(() => computeSourceFingerprint({ a: undefined })).toThrow(TypeError);
    });

    it("rejects undefined array value", () => {
      expect(() => computeSourceFingerprint({ a: [undefined] })).toThrow(TypeError);
    });

    it("rejects NaN", () => {
      expect(() => computeSourceFingerprint({ a: NaN })).toThrow(TypeError);
    });

    it("rejects positive infinity", () => {
      expect(() => computeSourceFingerprint({ a: Infinity })).toThrow(TypeError);
    });

    it("rejects negative infinity", () => {
      expect(() => computeSourceFingerprint({ a: -Infinity })).toThrow(TypeError);
    });

    it("rejects function", () => {
      expect(() => computeSourceFingerprint({ a: () => {} })).toThrow(TypeError);
    });

    it("rejects symbol", () => {
      expect(() => computeSourceFingerprint({ a: Symbol("test") })).toThrow(TypeError);
    });

    it("rejects bigint", () => {
      expect(() => computeSourceFingerprint({ a: BigInt(42) })).toThrow(TypeError);
    });

    it("rejects accessor", () => {
      const obj = { a: 1 };
      Object.defineProperty(obj, "b", { get: () => 2, enumerable: true });
      expect(() => computeSourceFingerprint(obj)).toThrow(TypeError);
    });

    it("rejects symbol property", () => {
      const obj: Record<string | symbol, unknown> = { a: 1 };
      obj[Symbol("sym")] = "value";
      expect(() => computeSourceFingerprint(obj as Record<string, unknown>)).toThrow(TypeError);
    });

    it("rejects Date", () => {
      expect(() => computeSourceFingerprint({ a: new Date() })).toThrow(TypeError);
    });

    it("rejects RegExp", () => {
      expect(() => computeSourceFingerprint({ a: /test/ })).toThrow(TypeError);
    });

    it("rejects Map", () => {
      expect(() => computeSourceFingerprint({ a: new Map() })).toThrow(TypeError);
    });

    it("rejects Set", () => {
      expect(() => computeSourceFingerprint({ a: new Set() })).toThrow(TypeError);
    });

    it("rejects class instance", () => {
      class Foo { bar = 1; }
      expect(() => computeSourceFingerprint({ a: new Foo() })).toThrow(TypeError);
    });

    it("rejects cyclic object", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect(() => computeSourceFingerprint(obj)).toThrow();
    });

    it("rejects cyclic array", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr);
      expect(() => computeSourceFingerprint({ a: arr })).toThrow();
    });
  });
});
