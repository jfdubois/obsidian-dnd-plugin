import { describe, it, expect } from "vitest";

describe("monorepo test framework", () => {
  it("passes a basic assertion", () => {
    expect(true).toBe(true);
  });

  it("handles arithmetic", () => {
    expect(2 + 2).toBe(4);
  });

  it("handles objects", () => {
    const obj = { a: 1, b: 2 };
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it("handles arrays", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it("handles strings", () => {
    expect("hello").toBe("hello");
    expect("hello").not.toBe("world");
  });

  it("handles errors", () => {
    expect(() => {
      throw new Error("expected");
    }).toThrow("expected");
  });
});
