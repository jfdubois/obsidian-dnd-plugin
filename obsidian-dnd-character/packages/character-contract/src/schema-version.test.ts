import { describe, it, expect } from "vitest";
import {
  CHARACTER_SCHEMA_VERSION,
  isSupportedCharacterSchemaVersion,
} from "./schema-version";

describe("Schema Version", () => {
  it("exports schema version 1", () => {
    expect(CHARACTER_SCHEMA_VERSION).toBe(1);
  });

  it("accepts version 1", () => {
    expect(isSupportedCharacterSchemaVersion(1)).toBe(true);
  });

  it("rejects version 0", () => {
    expect(isSupportedCharacterSchemaVersion(0)).toBe(false);
  });

  it("rejects version 2 (future)", () => {
    expect(isSupportedCharacterSchemaVersion(2)).toBe(false);
  });

  it("rejects negative version", () => {
    expect(isSupportedCharacterSchemaVersion(-1)).toBe(false);
  });

  it("rejects non-integer version", () => {
    expect(isSupportedCharacterSchemaVersion(1.5)).toBe(false);
  });

  it("rejects non-number values", () => {
    expect(isSupportedCharacterSchemaVersion("1")).toBe(false);
    expect(isSupportedCharacterSchemaVersion(null)).toBe(false);
    expect(isSupportedCharacterSchemaVersion(undefined)).toBe(false);
    expect(isSupportedCharacterSchemaVersion({})).toBe(false);
  });
});
