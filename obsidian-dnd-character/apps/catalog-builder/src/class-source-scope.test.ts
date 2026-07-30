import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import {
  SUPPORTED_CLASS_SOURCES,
  classifyClassSourceScope,
  classifyClassSourceScopeBatch,
} from "./class-source-scope";

/* ── Helpers ───────────────────────────────────────────────────── */

function rec(source: string, name = "Test Class", rem: Record<string, unknown> = {}): RawRecord {
  return { name, source, remaining: rem };
}

const ctx = {
  knownPinnedSources: new Set(["PHB", "XPHB", "XGtE", "ERLW", "DMG", "MM"]),
};

/* ── classifyClassSourceScope ──────────────────────────────────── */

describe("classifyClassSourceScope - supported", () => {
  it("accepts PHB as 2014", () => {
    const r = classifyClassSourceScope({ record: rec("PHB") }, ctx);
    expect(r).toMatchObject({ ok: true, source: "PHB", ruleset: "2014" });
  });

  it("accepts XPHB as 2024", () => {
    const r = classifyClassSourceScope({ record: rec("XPHB") }, ctx);
    expect(r).toMatchObject({ ok: true, source: "XPHB", ruleset: "2024" });
  });

  it("narrative fields cannot alter classification", () => {
    const r = classifyClassSourceScope({
      record: rec("PHB", "Test", { description: "A 2024 ruleset class.", entries: [] }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("success result is frozen", () => {
    const r = classifyClassSourceScope({ record: rec("PHB") }, ctx);
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe("classifyClassSourceScope - known unsupported", () => {
  it("emits UNSUPPORTED_CLASS_SOURCE for pinned optional source", () => {
    const r = classifyClassSourceScope({ record: rec("XGtE") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("UNSUPPORTED_CLASS_SOURCE");
  });

  it("does NOT emit UNKNOWN_SOURCE for known pinned source", () => {
    const r = classifyClassSourceScope({ record: rec("ERLW") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).not.toBe("UNKNOWN_SOURCE");
  });

  it("diagnostic includes supported sources PHB and XPHB", () => {
    const r = classifyClassSourceScope({ record: rec("XGtE") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.supportedSources).toEqual(["PHB", "XPHB"]);
  });

  it("failure result is frozen", () => {
    const r = classifyClassSourceScope({ record: rec("XGtE") }, ctx);
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe("classifyClassSourceScope - unknown", () => {
  it("fabricated TST emits UNKNOWN_SOURCE", () => {
    const r = classifyClassSourceScope({ record: rec("TST") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("UNKNOWN_SOURCE");
  });
});

describe("classifyClassSourceScope - invalid", () => {
  it("rejects empty source", () => {
    const r = classifyClassSourceScope({ record: rec("") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects whitespace-only source", () => {
    const r = classifyClassSourceScope({ record: rec("   ") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects leading whitespace", () => {
    const r = classifyClassSourceScope({ record: rec(" PHB") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects trailing whitespace", () => {
    const r = classifyClassSourceScope({ record: rec("PHB ") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });
});

describe("classifyClassSourceScope - diagnostic context", () => {
  const uctx = { knownPinnedSources: new Set(["XGtE"]) };

  it("preserves record name, source, entity kind, path, index", () => {
    const r = classifyClassSourceScope({
      record: { name: "Fighter", source: "XGtE", remaining: {} },
      entityKind: "class",
      sourcePath: "data/classes/XGtE.json",
      recordIndex: 3,
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordName).toBe("Fighter");
    expect(r.diagnostic.source).toBe("XGtE");
    expect(r.diagnostic.entityKind).toBe("class");
    expect(r.diagnostic.sourcePath).toBe("data/classes/XGtE.json");
    expect(r.diagnostic.recordIndex).toBe(3);
  });

  it("preserves raw structured identity", () => {
    const r = classifyClassSourceScope({
      record: { name: "Ranger", source: "XGtE", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity).toEqual({ name: "Ranger", source: "XGtE" });
  });
});

describe("classifyClassSourceScopeBatch", () => {
  it("classifies multiple records correctly", () => {
    const inputs = [
      { record: rec("PHB", "Fighter") },
      { record: rec("XPHB", "Fighter", { hitdie: 10 }) },
      { record: rec("XGtE", "Artificer") },
    ];
    const r = classifyClassSourceScopeBatch(inputs, ctx);
    expect(r.classifications).toHaveLength(2);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.representedRulesets).toContain("2014");
    expect(r.representedRulesets).toContain("2024");
  });

  it("returns empty results for empty input", () => {
    const r = classifyClassSourceScopeBatch([], ctx);
    expect(r.classifications).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(r.representedRulesets).toEqual([]);
  });

  it("batch result is frozen", () => {
    const r = classifyClassSourceScopeBatch([{ record: rec("PHB") }], ctx);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.classifications)).toBe(true);
    expect(Object.isFrozen(r.diagnostics)).toBe(true);
  });
});

/* ── Registry ──────────────────────────────────────────────────── */

describe("SUPPORTED_CLASS_SOURCES", () => {
  it("contains exactly PHB/2014 and XPHB/2024", () => {
    expect(SUPPORTED_CLASS_SOURCES).toEqual([
      { source: "PHB", ruleset: "2014" },
      { source: "XPHB", ruleset: "2024" },
    ]);
  });

  it("array is frozen", () => {
    expect(Object.isFrozen(SUPPORTED_CLASS_SOURCES)).toBe(true);
  });

  it("each registry entry is frozen", () => {
    for (const entry of SUPPORTED_CLASS_SOURCES) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});
