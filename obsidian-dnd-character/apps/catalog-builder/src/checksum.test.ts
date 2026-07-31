import { describe, it, expect } from "vitest";
import { computeChecksum, computeChecksums } from "./checksum";

describe("computeChecksum", () => {
  it("produces correct SHA-256 hex digest", () => {
    // Known SHA-256 of "hello world"
    const hash = computeChecksum("hello world");
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("produces correct digest for empty string", () => {
    // Known SHA-256 of empty string
    const hash = computeChecksum("");
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("is deterministic", () => {
    const content = '{"name":"Test"}';
    expect(computeChecksum(content)).toBe(computeChecksum(content));
  });

  it("produces different digests for different inputs", () => {
    const hash1 = computeChecksum("foo");
    const hash2 = computeChecksum("bar");
    expect(hash1).not.toBe(hash2);
  });

  it("returns lowercase hex string", () => {
    const hash = computeChecksum("TEST");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("computeChecksums", () => {
  it("computes checksums for multiple files", () => {
    const files: Record<string, string> = {
      "a.json": '{"id":1}',
      "b.json": '{"id":2}',
    };
    const checksums = computeChecksums(files);

    expect(checksums).toHaveProperty("a.json");
    expect(checksums).toHaveProperty("b.json");
    expect(checksums["a.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(checksums["b.json"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns results sorted by path", () => {
    const files: Record<string, string> = {
      "z.json": "z",
      "a.json": "a",
      "m.json": "m",
    };
    const checksums = computeChecksums(files);
    const keys = Object.keys(checksums);

    expect(keys).toEqual(["a.json", "m.json", "z.json"]);
  });

  it("returns empty object for empty input", () => {
    const checksums = computeChecksums({});
    expect(checksums).toEqual({});
  });

  it("freezes the result", () => {
    const checksums = computeChecksums({ "x.json": "x" });
    expect(Object.isFrozen(checksums)).toBe(true);
  });

  it("is deterministic across calls", () => {
    const files: Record<string, string> = {
      "manifest.json": '{"apiVersion":1}',
      "index.json": '{"kinds":["species"]}',
    };

    const result1 = computeChecksums(files);
    const result2 = computeChecksums(files);

    expect(result1).toEqual(result2);
  });
});
