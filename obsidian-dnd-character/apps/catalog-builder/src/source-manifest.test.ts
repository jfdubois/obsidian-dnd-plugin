import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it, expect } from "vitest";
import {
  readSourceManifest,
  createSourceManifest,
  isSourceManifest,
  SourceManifestError,
} from "./source-manifest";

const FIVEETOOLS_PATH =
  "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src";

describe("readSourceManifest", () => {
  it("succeeds with the real 5eTools clone", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(manifest.clonePath).toContain("5etools-src");
    expect(manifest.commitHash).toBeDefined();
    expect(manifest.shortHash).toBeDefined();
    expect(manifest.subject).toBeDefined();
    expect(manifest.date).toBeDefined();
  });

  it("returns expected commit hash", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(manifest.commitHash).toBe("3c5d9d3175ca9637132011c75efd73aad7a2364d");
  });

  it("returns expected short hash", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(manifest.shortHash).toBe("3c5d9d3");
  });

  it("returns non-empty subject", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(manifest.subject).toBeTypeOf("string");
    expect(manifest.subject.length).toBeGreaterThan(0);
  });

  it("returns non-empty ISO 8601 date", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(manifest.date).toBeTypeOf("string");
    expect(manifest.date.length).toBeGreaterThan(0);
    expect(() => new Date(manifest.date)).not.toThrow();
  });

  it("returns a frozen manifest", () => {
    const manifest = readSourceManifest(FIVEETOOLS_PATH);
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("throws PATH_NOT_FOUND for non-existent path", () => {
    expect(() =>
      readSourceManifest("/nonexistent/path/that/does/not/exist"),
    ).toThrow(SourceManifestError);
    try {
      readSourceManifest("/nonexistent/path/that/does/not/exist");
    } catch (error) {
      expect((error as SourceManifestError).code).toBe("PATH_NOT_FOUND");
    }
  });

  it("throws NOT_GIT_REPO for directory without .git", () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), "source-manifest-"));

    try {
      expect(() => readSourceManifest(nonGitDir)).toThrow(SourceManifestError);
      try {
        readSourceManifest(nonGitDir);
      } catch (error) {
        expect((error as SourceManifestError).code).toBe("NOT_GIT_REPO");
      }
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  it("throws NOT_GIT_REPO for a file path", () => {
    expect(() =>
      readSourceManifest(
        "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character/package.json",
      ),
    ).toThrow(SourceManifestError);
    try {
      readSourceManifest(
        "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character/package.json",
      );
    } catch (error) {
      expect((error as SourceManifestError).code).toBe("NOT_GIT_REPO");
    }
  });
});

describe("SourceManifestError", () => {
  it("has correct name", () => {
    const err = new SourceManifestError("PATH_NOT_FOUND", "test message");
    expect(err.name).toBe("SourceManifestError");
  });

  it("preserves code", () => {
    const err = new SourceManifestError("NOT_GIT_REPO", "test message");
    expect(err.code).toBe("NOT_GIT_REPO");
  });

  it("preserves cause", () => {
    const cause = new Error("original");
    const err = new SourceManifestError(
      "GIT_COMMAND_FAILED",
      "test message",
      cause,
    );
    expect(err.cause).toBe(cause);
  });
});

describe("isSourceManifest", () => {
  const validManifest = createSourceManifest({
    clonePath: "/some/path",
    commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d",
    shortHash: "3c5d9d3",
    subject: "Some commit message",
    date: "2024-01-01T00:00:00+00:00",
  });

  it("accepts valid manifest from factory", () => {
    expect(isSourceManifest(validManifest)).toBe(true);
  });

  it("rejects null", () => {
    expect(isSourceManifest(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSourceManifest(undefined)).toBe(false);
  });

  it("rejects plain string", () => {
    expect(isSourceManifest("not a manifest")).toBe(false);
  });

  it("rejects number", () => {
    expect(isSourceManifest(42)).toBe(false);
  });

  it("rejects array", () => {
    expect(isSourceManifest([])).toBe(false);
  });

  it("rejects object with missing fields", () => {
    expect(
      isSourceManifest({
        clonePath: "/some/path",
        commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d",
      }),
    ).toBe(false);
  });

  it("rejects object with wrong types", () => {
    expect(
      isSourceManifest({
        clonePath: 123,
        commitHash: true,
        shortHash: [],
        subject: null,
        date: undefined,
      }),
    ).toBe(false);
  });

  it("rejects invalid commit hash (not 40 hex chars)", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        commitHash: "abc",
      }),
    ).toBe(false);
  });

  it("rejects commit hash with uppercase hex", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        commitHash: "3C5D9D3175CA9637132011C75EFD73AAD7A2364D",
      }),
    ).toBe(false);
  });

  it("rejects commit hash too long", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d00",
      }),
    ).toBe(false);
  });

  it("rejects invalid short hash (not 7 hex chars)", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        shortHash: "abc",
      }),
    ).toBe(false);
  });

  it("rejects short hash too long", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        shortHash: "3c5d9d30",
      }),
    ).toBe(false);
  });

  it("rejects empty clonePath", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        clonePath: "",
      }),
    ).toBe(false);
  });

  it("rejects empty commitHash", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        commitHash: "",
      }),
    ).toBe(false);
  });

  it("rejects empty shortHash", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        shortHash: "",
      }),
    ).toBe(false);
  });

  it("rejects empty subject", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        subject: "",
      }),
    ).toBe(false);
  });

  it("rejects empty date", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        date: "",
      }),
    ).toBe(false);
  });

  it("rejects non-ISO-8601 date", () => {
    expect(
      isSourceManifest({
        ...validManifest,
        date: "not-a-date",
      }),
    ).toBe(false);
  });
});

describe("createSourceManifest", () => {
  it("creates a valid manifest", () => {
    const manifest = createSourceManifest({
      clonePath: "/some/path",
      commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d",
      shortHash: "3c5d9d3",
      subject: "Some commit message",
      date: "2024-01-01T00:00:00+00:00",
    });
    expect(manifest.clonePath).toBe("/some/path");
    expect(manifest.commitHash).toBe("3c5d9d3175ca9637132011c75efd73aad7a2364d");
    expect(manifest.shortHash).toBe("3c5d9d3");
    expect(manifest.subject).toBe("Some commit message");
    expect(manifest.date).toBe("2024-01-01T00:00:00+00:00");
  });

  it("produces a frozen object", () => {
    const manifest = createSourceManifest({
      clonePath: "/some/path",
      commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d",
      shortHash: "3c5d9d3",
      subject: "Some commit message",
      date: "2024-01-01T00:00:00+00:00",
    });
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("factory output passes validator", () => {
    const manifest = createSourceManifest({
      clonePath: "/some/path",
      commitHash: "3c5d9d3175ca9637132011c75efd73aad7a2364d",
      shortHash: "3c5d9d3",
      subject: "Some commit message",
      date: "2024-01-01T00:00:00+00:00",
    });
    expect(isSourceManifest(manifest)).toBe(true);
  });
});
