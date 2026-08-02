/**
 * Tests for the CurrentRevision contract type.
 *
 * Validates that:
 * - isCurrentRevision correctly identifies valid current.json payloads
 * - isCurrentRevision rejects invalid payloads
 * - createCurrentRevision produces valid instances
 */

import { describe, it, expect } from "vitest";
import {
  isCurrentRevision,
  createCurrentRevision,
} from "./current-revision";

/* ── Positive tests ────────────────────────────────────────────── */

describe("isCurrentRevision — positive", () => {
  it("returns true for a valid current revision object", () => {
    expect(isCurrentRevision({ currentRevision: "smoke-test-rev-001" })).toBe(
      true,
    );
  });

  it("returns true for a revision with special characters", () => {
    expect(
      isCurrentRevision({ currentRevision: "v2.0.0-alpha.1+build.42" }),
    ).toBe(true);
  });

  it("returns true for a revision from createCurrentRevision", () => {
    const rev = createCurrentRevision("rev-001");
    expect(isCurrentRevision(rev)).toBe(true);
  });
});

/* ── Negative tests ────────────────────────────────────────────── */

describe("isCurrentRevision — negative", () => {
  it("returns false for null", () => {
    expect(isCurrentRevision(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCurrentRevision(undefined)).toBe(false);
  });

  it("returns false for a plain string", () => {
    expect(isCurrentRevision("smoke-test-rev-001")).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isCurrentRevision({})).toBe(false);
  });

  it("returns false when currentRevision is missing", () => {
    expect(isCurrentRevision({ foo: "bar" })).toBe(false);
  });

  it("returns false when currentRevision is empty string", () => {
    expect(isCurrentRevision({ currentRevision: "" })).toBe(false);
  });

  it("returns false when currentRevision is a number", () => {
    expect(isCurrentRevision({ currentRevision: 123 })).toBe(false);
  });

  it("returns false when currentRevision is null", () => {
    expect(isCurrentRevision({ currentRevision: null })).toBe(false);
  });

  it("returns false for an array", () => {
    expect(isCurrentRevision(["rev-001"])).toBe(false);
  });
});

/* ── Factory tests ─────────────────────────────────────────────── */

describe("createCurrentRevision", () => {
  it("creates a valid CurrentRevision object", () => {
    const rev = createCurrentRevision("smoke-test-rev-001");
    expect(rev.currentRevision).toBe("smoke-test-rev-001");
    expect(isCurrentRevision(rev)).toBe(true);
  });
});
