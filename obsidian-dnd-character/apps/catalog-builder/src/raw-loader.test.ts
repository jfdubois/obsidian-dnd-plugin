import { describe, it, expect } from "vitest";
import { loadRawJsonFiles } from "./raw-loader";
import { mkdirSync, writeFileSync, rmSync, chmodSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

const FIVEETOOLS_PATH =
  "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src";

/* ── Helpers ───────────────────────────────────────────────────── */

function createTempDir(name: string): string {
  const dir = resolve(tmpdir(), `raw-loader-test-${name}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/* ── Positive tests with real 5eTools clone ────────────────────── */

describe("loadRawJsonFiles — real 5eTools clone", () => {
  it("loads all JSON files from the real 5eTools data directory", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);

    expect(result.summary.totalFound).toBeGreaterThan(0);
    expect(result.summary.successfullyParsed).toBeGreaterThan(0);
    expect(result.summary.parseFailures).toBe(0);
    expect(result.summary.readFailures).toBe(0);
  });

  it("returns races.json with expected structure", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    const racesData = result.files["races.json"];

    expect(racesData).toBeDefined();
    expect(typeof racesData).toBe("object");
    expect(racesData).not.toBeNull();

    const racesObj = racesData as Record<string, unknown>;
    expect(racesObj._meta).toBeDefined();
  });

  it("returns backgrounds.json with expected structure", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    const bgData = result.files["backgrounds.json"];

    expect(bgData).toBeDefined();
    expect(typeof bgData).toBe("object");
    expect(bgData).not.toBeNull();

    const bgObj = bgData as Record<string, unknown>;
    expect(bgObj._meta).toBeDefined();
  });

  it("returns class files from nested directory", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);

    const classFiles = Object.keys(result.files).filter((k) =>
      k.startsWith("class/")
    );
    expect(classFiles.length).toBeGreaterThan(0);
    expect(classFiles[0]).toContain(".json");
  });

  it("uses forward-slash relative paths", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    const keys = Object.keys(result.files);

    for (const key of keys) {
      expect(key).not.toContain("\\");
    }
  });

  it("includes discovery info diagnostic", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    const infoDiagnostics = result.diagnostics.filter(
      (d) => d.severity === "info" && d.code === "DISCOVERY_COMPLETE"
    );
    expect(infoDiagnostics.length).toBe(1);
    expect(infoDiagnostics[0]!.message).toContain("Discovered");
  });

  it("returns unknown-typed parsed values", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    const firstKey = Object.keys(result.files)[0];
    expect(firstKey).toBeDefined();

    // The value is stored as unknown — we can read it but TypeScript treats it as unknown
    const value = result.files[firstKey as string];
    expect(value).toBeDefined();
  });

  it("total found equals successfully parsed when no errors", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);
    expect(result.summary.totalFound).toBe(result.summary.successfullyParsed);
  });
});

/* ── Negative tests: missing data directory ────────────────────── */

describe("loadRawJsonFiles — missing data directory", () => {
  it("returns empty result for non-existent clone path", () => {
    const result = loadRawJsonFiles("/nonexistent/path/that/does/not/exist");

    expect(result.files).toEqual({});
    expect(result.summary.totalFound).toBe(0);
    expect(result.summary.successfullyParsed).toBe(0);
    expect(result.summary.parseFailures).toBe(0);
    expect(result.summary.readFailures).toBe(0);
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0]!.code).toBe("DATA_DIR_NOT_FOUND");
    expect(result.diagnostics[0]!.severity).toBe("error");
  });

  it("returns error when data/ exists but is a file", () => {
    const tempDir = createTempDir("data-is-file");
    try {
      writeFileSync(resolve(tempDir, "data"), "not a directory");
      const result = loadRawJsonFiles(tempDir);

      expect(result.files).toEqual({});
      expect(result.summary.totalFound).toBe(0);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("DATA_DIR_NOT_DIRECTORY");
      expect(result.diagnostics[0]!.severity).toBe("error");
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("returns empty result when data/ directory has no JSON files", () => {
    const tempDir = createTempDir("empty-data");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "readme.txt"), "not json");

      const result = loadRawJsonFiles(tempDir);

      expect(result.files).toEqual({});
      expect(result.summary.totalFound).toBe(0);
      expect(result.summary.successfullyParsed).toBe(0);
      expect(result.diagnostics.length).toBe(0);
    } finally {
      cleanupDir(tempDir);
    }
  });
});

/* ── Negative tests: invalid JSON ──────────────────────────────── */

describe("loadRawJsonFiles — invalid JSON", () => {
  it("handles a file with invalid JSON without crashing", () => {
    const tempDir = createTempDir("invalid-json");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "broken.json"), "{invalid json");
      writeFileSync(
        resolve(tempDir, "data", "valid.json"),
        JSON.stringify({ key: "value" })
      );

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(2);
      expect(result.summary.successfullyParsed).toBe(1);
      expect(result.summary.parseFailures).toBe(1);

      expect(result.files["valid.json"]).toEqual({ key: "value" });
      expect(result.files["broken.json"]).toBeUndefined();

      const parseError = result.diagnostics.find(
        (d) => d.code === "JSON_PARSE_ERROR"
      );
      expect(parseError).toBeDefined();
      expect(parseError!.severity).toBe("error");
      expect(parseError!.path).toContain("broken.json");
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("handles multiple invalid JSON files independently", () => {
    const tempDir = createTempDir("multiple-invalid");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "bad1.json"), "{{{");
      writeFileSync(resolve(tempDir, "data", "bad2.json"), "not json at all");
      writeFileSync(resolve(tempDir, "data", "bad3.json"), '{"unclosed": ');

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(3);
      expect(result.summary.successfullyParsed).toBe(0);
      expect(result.summary.parseFailures).toBe(3);
      expect(Object.keys(result.files).length).toBe(0);
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("includes line information in parse error message", () => {
    const tempDir = createTempDir("parse-line-info");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(
        resolve(tempDir, "data", "error.json"),
        '{"line1": "ok",\n"line2": [broken]\n}'
      );

      const result = loadRawJsonFiles(tempDir);

      const parseError = result.diagnostics.find(
        (d) => d.code === "JSON_PARSE_ERROR"
      );
      expect(parseError).toBeDefined();
      expect(parseError!.message).toContain("line");
    } finally {
      cleanupDir(tempDir);
    }
  });
});

/* ── Negative tests: permission issues (simulated) ─────────────── */

describe("loadRawJsonFiles — permission issues", () => {
  it("handles unreadable file gracefully", () => {
    const tempDir = createTempDir("permissions");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      const readablePath = resolve(tempDir, "data", "readable.json");
      const unreadablePath = resolve(tempDir, "data", "unreadable.json");

      writeFileSync(readablePath, JSON.stringify({ ok: true }));
      writeFileSync(unreadablePath, JSON.stringify({ secret: true }));

      // Attempt to make file unreadable — may not work on all platforms
      try {
        chmodSync(unreadablePath, 0o000);
      } catch {
        // chmod may fail in containers or as root; skip this assertion
      }

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(2);
      expect(result.files["readable.json"]).toEqual({ ok: true });
    } finally {
      // Restore permissions before cleanup
      try {
        chmodSync(resolve(tempDir, "data", "unreadable.json"), 0o644);
      } catch {
        // Ignore
      }
      cleanupDir(tempDir);
    }
  });
});

/* ── Nested directory tests ────────────────────────────────────── */

describe("loadRawJsonFiles — nested directories", () => {
  it("discovers JSON files in deeply nested directories", () => {
    const tempDir = createTempDir("nested");
    try {
      mkdirSync(resolve(tempDir, "data", "level1", "level2", "level3"), {
        recursive: true,
      });
      writeFileSync(
        resolve(tempDir, "data", "root.json"),
        JSON.stringify({ level: 0 })
      );
      writeFileSync(
        resolve(tempDir, "data", "level1", "l1.json"),
        JSON.stringify({ level: 1 })
      );
      writeFileSync(
        resolve(tempDir, "data", "level1", "level2", "l2.json"),
        JSON.stringify({ level: 2 })
      );
      writeFileSync(
        resolve(tempDir, "data", "level1", "level2", "level3", "l3.json"),
        JSON.stringify({ level: 3 })
      );

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(4);
      expect(result.summary.successfullyParsed).toBe(4);
      expect(result.files["root.json"]).toEqual({ level: 0 });
      expect(result.files["level1/l1.json"]).toEqual({ level: 1 });
      expect(result.files["level1/level2/l2.json"]).toEqual({ level: 2 });
      expect(result.files["level1/level2/level3/l3.json"]).toEqual({ level: 3 });
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("skips non-JSON files in data directory", () => {
    const tempDir = createTempDir("mixed-files");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(
        resolve(tempDir, "data", "valid.json"),
        JSON.stringify({ ok: true })
      );
      writeFileSync(resolve(tempDir, "data", "readme.md"), "# readme");
      writeFileSync(resolve(tempDir, "data", "image.png"), "binary data");
      writeFileSync(resolve(tempDir, "data", "script.js"), "console.log(1)");

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(1);
      expect(result.summary.successfullyParsed).toBe(1);
      expect(Object.keys(result.files)).toEqual(["valid.json"]);
    } finally {
      cleanupDir(tempDir);
    }
  });
});

/* ── Result structure tests ────────────────────────────────────── */

describe("RawLoadResult structure", () => {
  it("result has all required fields", () => {
    const result = loadRawJsonFiles(FIVEETOOLS_PATH);

    expect(result).toHaveProperty("files");
    expect(result).toHaveProperty("diagnostics");
    expect(result).toHaveProperty("summary");
    expect(typeof result.files).toBe("object");
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(typeof result.summary.totalFound).toBe("number");
    expect(typeof result.summary.successfullyParsed).toBe("number");
    expect(typeof result.summary.parseFailures).toBe("number");
    expect(typeof result.summary.readFailures).toBe("number");
  });

  it("diagnostics have required fields", () => {
    const tempDir = createTempDir("diag-structure");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "bad.json"), "{invalid");

      const result = loadRawJsonFiles(tempDir);
      const errorDiag = result.diagnostics.find((d) => d.severity === "error");

      expect(errorDiag).toBeDefined();
      expect(errorDiag!.code).toBeDefined();
      expect(typeof errorDiag!.code).toBe("string");
      expect(errorDiag!.severity).toBe("error");
      expect(errorDiag!.message).toBeDefined();
      expect(typeof errorDiag!.message).toBe("string");
      expect(errorDiag!.path).toBeDefined();
      expect(typeof errorDiag!.path).toBe("string");
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("summary counts add up correctly", () => {
    const tempDir = createTempDir("summary-check");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(
        resolve(tempDir, "data", "a.json"),
        JSON.stringify({ a: 1 })
      );
      writeFileSync(
        resolve(tempDir, "data", "b.json"),
        JSON.stringify({ b: 2 })
      );
      writeFileSync(resolve(tempDir, "data", "c.json"), "{invalid");

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(3);
      expect(
        result.summary.successfullyParsed +
          result.summary.parseFailures +
          result.summary.readFailures
      ).toBe(result.summary.totalFound);
    } finally {
      cleanupDir(tempDir);
    }
  });
});

/* ── Edge cases ────────────────────────────────────────────────── */

describe("loadRawJsonFiles — edge cases", () => {
  it("handles empty JSON object", () => {
    const tempDir = createTempDir("empty-object");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "empty.json"), "{}");

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.successfullyParsed).toBe(1);
      expect(result.files["empty.json"]).toEqual({});
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("handles empty JSON array", () => {
    const tempDir = createTempDir("empty-array");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "array.json"), "[]");

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.successfullyParsed).toBe(1);
      expect(result.files["array.json"]).toEqual([]);
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("handles null JSON value", () => {
    const tempDir = createTempDir("null-value");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(resolve(tempDir, "data", "null.json"), "null");

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.successfullyParsed).toBe(1);
      expect(result.files["null.json"]).toBeNull();
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("handles large JSON file", () => {
    const tempDir = createTempDir("large-file");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` })) };
      writeFileSync(
        resolve(tempDir, "data", "large.json"),
        JSON.stringify(largeData)
      );

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.successfullyParsed).toBe(1);
      const parsed = result.files["large.json"] as Record<string, unknown>;
      expect(Array.isArray(parsed.items)).toBe(true);
      expect((parsed.items as unknown[]).length).toBe(1000);
    } finally {
      cleanupDir(tempDir);
    }
  });

  it("one file failure does not prevent loading others", () => {
    const tempDir = createTempDir("partial-failure");
    try {
      mkdirSync(resolve(tempDir, "data"), { recursive: true });
      writeFileSync(
        resolve(tempDir, "data", "good1.json"),
        JSON.stringify({ id: 1 })
      );
      writeFileSync(resolve(tempDir, "data", "bad.json"), "{broken");
      writeFileSync(
        resolve(tempDir, "data", "good2.json"),
        JSON.stringify({ id: 2 })
      );

      const result = loadRawJsonFiles(tempDir);

      expect(result.summary.totalFound).toBe(3);
      expect(result.summary.successfullyParsed).toBe(2);
      expect(result.summary.parseFailures).toBe(1);
      expect(result.files["good1.json"]).toEqual({ id: 1 });
      expect(result.files["good2.json"]).toEqual({ id: 2 });
      expect(result.files["bad.json"]).toBeUndefined();
    } finally {
      cleanupDir(tempDir);
    }
  });
});
