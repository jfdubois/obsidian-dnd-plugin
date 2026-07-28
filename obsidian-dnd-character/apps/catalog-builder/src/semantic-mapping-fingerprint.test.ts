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

  it("skips undefined values in object properties", () => {
    const fp1 = computeSourceFingerprint({ a: 1, b: undefined });
    const fp2 = computeSourceFingerprint({ a: 1 });
    expect(fp1).toBe(fp2);
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
});
