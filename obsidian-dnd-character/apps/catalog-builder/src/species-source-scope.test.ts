import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import {
  SUPPORTED_SPECIES_SOURCES,
  classifySpeciesSourceScope,
} from "./species-source-scope";
import { collectKnownSpeciesSources } from "./species-source-inventory";

function rec(source: string, name = "Test Species", rem: Record<string, unknown> = {}): RawRecord {
  return { name, source, remaining: rem };
}

const ctx = {
  knownPinnedSources: new Set(["MPMM", "VGM", "EEPC", "PHB", "XPHB"]),
};

/* ── collectKnownSpeciesSources ────────────────────────────────── */

describe("collectKnownSpeciesSources", () => {
  it("returns empty set and no diagnostics for empty input", () => {
    const r = collectKnownSpeciesSources([]);
    expect(r.sources.size).toBe(0);
    expect(r.diagnostics).toEqual([]);
  });

  it("derives valid sources from records", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("XPHB"), rec("MPMM")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has("XPHB")).toBe(true);
    expect(r.sources.has("MPMM")).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it("removes duplicate sources", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("PHB"), rec("PHB")]);
    expect(r.sources.size).toBe(1);
    expect(r.sources.has("PHB")).toBe(true);
  });

  it("deterministic iteration order", () => {
    const r = collectKnownSpeciesSources([rec("XPHB"), rec("PHB"), rec("MPMM")]);
    const arr = [...r.sources];
    expect(arr).toEqual(["XPHB", "PHB", "MPMM"]);
  });

  it("diagnoses empty source", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("", "Empty")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has("")).toBe(false);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("INVALID_SPECIES_SOURCE_INVENTORY_ENTRY");
    expect(r.diagnostics[0]?.recordName).toBe("Empty");
    expect(r.diagnostics[0]?.source).toBe("");
    expect(r.diagnostics[0]?.recordIndex).toBe(1);
  });

  it("diagnoses whitespace-only source", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("   ", "Whitespace")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has("   ")).toBe(false);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("INVALID_SPECIES_SOURCE_INVENTORY_ENTRY");
    expect(r.diagnostics[0]?.recordName).toBe("Whitespace");
  });

  it("diagnoses leading whitespace", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec(" XPHB", "Leading")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has(" XPHB")).toBe(false);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("INVALID_SPECIES_SOURCE_INVENTORY_ENTRY");
    expect(r.diagnostics[0]?.recordName).toBe("Leading");
    expect(r.diagnostics[0]?.source).toBe(" XPHB");
  });

  it("diagnoses trailing whitespace", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("MPMM ", "Trailing")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has("MPMM ")).toBe(false);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("INVALID_SPECIES_SOURCE_INVENTORY_ENTRY");
    expect(r.diagnostics[0]?.recordName).toBe("Trailing");
  });

  it("malformed source not included in sources", () => {
    const r = collectKnownSpeciesSources([rec(" PHB"), rec("XPHB "), rec("")]);
    expect(r.sources.size).toBe(0);
    expect(r.diagnostics).toHaveLength(3);
  });

  it("inputs remain unchanged", () => {
    const records = [rec("PHB"), rec(" XPHB"), rec("")];
    const origSources = records.map((r) => r.source);
    collectKnownSpeciesSources(records);
    expect(records.map((r) => r.source)).toEqual(origSources);
  });

  it("result object is frozen", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    expect(Object.isFrozen(r)).toBe(true);
  });

  it("diagnostics array is frozen", () => {
    const r = collectKnownSpeciesSources([rec("")]);
    expect(Object.isFrozen(r.diagnostics)).toBe(true);
  });

  it("individual diagnostic objects are frozen", () => {
    const r = collectKnownSpeciesSources([rec("")]);
    expect(Object.isFrozen(r.diagnostics[0])).toBe(true);
  });

  it("diagnostics preserve input record order", () => {
    const r = collectKnownSpeciesSources([
      rec("PHB"),
      rec("", "Empty"),
      rec(" XPHB", "Leading"),
      rec("MPMM ", "Trailing"),
    ]);
    expect(r.diagnostics).toHaveLength(3);
    expect(r.diagnostics[0]?.recordName).toBe("Empty");
    expect(r.diagnostics[1]?.recordName).toBe("Leading");
    expect(r.diagnostics[2]?.recordName).toBe("Trailing");
  });
});

/* ── ReadonlySet mutation safety ───────────────────────────────── */

describe("ReadonlySet mutation safety", () => {
  it("add is absent and cannot mutate", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    const before = r.sources.size;
    // add is not on FrozenReadonlySet — calling it throws
    const mutable = r.sources as unknown as { add: (v: string) => void };
    expect(() => { mutable.add("FAKE"); }).toThrow();
    expect(r.sources.size).toBe(before);
    expect(r.sources.has("FAKE")).toBe(false);
  });

  it("delete is absent and cannot mutate", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    expect(r.sources.has("PHB")).toBe(true);
    // delete is not on FrozenReadonlySet — calling it throws
    const mutable = r.sources as unknown as { delete: (v: string) => boolean };
    expect(() => { mutable.delete("PHB"); }).toThrow();
    expect(r.sources.has("PHB")).toBe(true);
  });

  it("clear is absent and cannot mutate", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("XPHB")]);
    expect(r.sources.size).toBe(2);
    // clear is not on FrozenReadonlySet — calling it throws
    const mutable = r.sources as unknown as { clear: () => void };
    expect(() => { mutable.clear(); }).toThrow();
    expect(r.sources.size).toBe(2);
  });

  it("iteration works correctly", () => {
    const r = collectKnownSpeciesSources([rec("XPHB"), rec("PHB")]);
    const arr = [...r.sources];
    expect(arr).toEqual(["XPHB", "PHB"]);
  });

  it("forEach works correctly", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("XPHB")]);
    const visited: string[] = [];
    r.sources.forEach((v) => visited.push(v));
    expect(visited).toEqual(["PHB", "XPHB"]);
  });

  it("has works correctly", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    expect(r.sources.has("PHB")).toBe(true);
    expect(r.sources.has("XPHB")).toBe(false);
  });

  it("size is correct", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("XPHB")]);
    expect(r.sources.size).toBe(2);
  });

  it("entries works correctly", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    const entries = [...r.sources.entries()];
    expect(entries).toEqual([["PHB", "PHB"]]);
  });

  it("keys works correctly", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    const keys = [...r.sources.keys()];
    expect(keys).toEqual(["PHB"]);
  });

  it("values works correctly", () => {
    const r = collectKnownSpeciesSources([rec("PHB")]);
    const values = [...r.sources.values()];
    expect(values).toEqual(["PHB"]);
  });
});

/* ── Supported sources ─────────────────────────────────────────── */

describe("classifySpeciesSourceScope - supported", () => {
  it("accepts PHB as 2014", () => {
    const r = classifySpeciesSourceScope({ record: rec("PHB") }, ctx);
    expect(r).toMatchObject({ ok: true, source: "PHB", ruleset: "2014" });
  });

  it("accepts XPHB as 2024", () => {
    const r = classifySpeciesSourceScope({ record: rec("XPHB") }, ctx);
    expect(r).toMatchObject({ ok: true, source: "XPHB", ruleset: "2024" });
  });

  it("narrative fields cannot alter classification", () => {
    const r = classifySpeciesSourceScope({
      record: rec("PHB", "Test", { description: "A 2024 ruleset species.", entries: [] }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("source-access flags cannot alter classification", () => {
    const r = classifySpeciesSourceScope({
      record: rec("PHB", "Test", { basicRules2024: true }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("publication-like fields cannot alter classification", () => {
    const r = classifySpeciesSourceScope({
      record: rec("PHB", "Test", { published: "2024-01-01", edition: "2024" }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("success result is frozen", () => {
    const r = classifySpeciesSourceScope({ record: rec("PHB") }, ctx);
    expect(Object.isFrozen(r)).toBe(true);
  });
});

/* ── Known unsupported sources ─────────────────────────────────── */

describe("classifySpeciesSourceScope - known unsupported", () => {
  it("emits UNSUPPORTED_SPECIES_SOURCE for pinned optional source", () => {
    const r = classifySpeciesSourceScope({ record: rec("MPMM") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("UNSUPPORTED_SPECIES_SOURCE");
  });

  it("does NOT emit UNKNOWN_SOURCE for known pinned source", () => {
    const r = classifySpeciesSourceScope({ record: rec("VGM") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).not.toBe("UNKNOWN_SOURCE");
  });

  it("diagnostic includes supported sources PHB and XPHB", () => {
    const r = classifySpeciesSourceScope({ record: rec("MPMM") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.supportedSources).toEqual(["PHB", "XPHB"]);
  });

  it("failure result is frozen", () => {
    const r = classifySpeciesSourceScope({ record: rec("MPMM") }, ctx);
    expect(Object.isFrozen(r)).toBe(true);
  });
});

/* ── Unknown sources ───────────────────────────────────────────── */

describe("classifySpeciesSourceScope - unknown", () => {
  it("fabricated TST emits UNKNOWN_SOURCE", () => {
    const r = classifySpeciesSourceScope({ record: rec("TST") }, ctx);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("UNKNOWN_SOURCE");
  });

  it("not treated as known unsupported source", () => {
    const r = classifySpeciesSourceScope({ record: rec("TST") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).not.toBe("UNSUPPORTED_SPECIES_SOURCE");
  });
});

/* ── Invalid sources ───────────────────────────────────────────── */

describe("classifySpeciesSourceScope - invalid", () => {
  it("rejects empty source", () => {
    const r = classifySpeciesSourceScope({ record: rec("") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects whitespace-only source", () => {
    const r = classifySpeciesSourceScope({ record: rec("   ") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects leading whitespace", () => {
    const r = classifySpeciesSourceScope({ record: rec(" PHB") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });

  it("rejects trailing whitespace", () => {
    const r = classifySpeciesSourceScope({ record: rec("PHB ") }, ctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.code).toBe("INVALID_SOURCE");
  });
});

/* ── Diagnostic context ────────────────────────────────────────── */

describe("classifySpeciesSourceScope - diagnostic context", () => {
  const uctx = { knownPinnedSources: new Set(["MPMM"]) };

  it("preserves record name, source, entity kind, path, index", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Aarakocra", source: "MPMM", remaining: {} },
      entityKind: "species",
      sourcePath: "data/species/MPMM.json",
      recordIndex: 7,
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordName).toBe("Aarakocra");
    expect(r.diagnostic.source).toBe("MPMM");
    expect(r.diagnostic.entityKind).toBe("species");
    expect(r.diagnostic.sourcePath).toBe("data/species/MPMM.json");
    expect(r.diagnostic.recordIndex).toBe(7);
  });

  it("preserves raw structured identity", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Vedalken", source: "MPMM", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity).toEqual({ name: "Vedalken", source: "MPMM" });
  });

  it("preserves supported source list", () => {
    const r = classifySpeciesSourceScope({ record: rec("MPMM") }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.supportedSources).toEqual(["PHB", "XPHB"]);
  });
});

/* ── Parent identity ───────────────────────────────────────────── */

describe("classifySpeciesSourceScope - parent identity", () => {
  const uctx = { knownPinnedSources: new Set(["MPMM"]) };

  it("no parent when none supplied", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Test", source: "MPMM", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity.parent).toBeUndefined();
  });

  it("subrace retains exact parent name and source", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Hill Dwarf", source: "MPMM", remaining: {} },
      parentIdentity: { name: "Dwarf", source: "PHB" },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity.parent).toEqual({ name: "Dwarf", source: "PHB" });
  });

  it("parent object is cloned", () => {
    const parent = { name: "Dwarf", source: "PHB" };
    const r = classifySpeciesSourceScope({
      record: { name: "Hill Dwarf", source: "MPMM", remaining: {} },
      parentIdentity: parent,
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity.parent).not.toBe(parent);
  });

  it("parent object is frozen", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Hill Dwarf", source: "MPMM", remaining: {} },
      parentIdentity: { name: "Dwarf", source: "PHB" },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(Object.isFrozen(r.diagnostic.recordIdentity.parent)).toBe(true);
  });

  it("modifying original parent after classification does not alter diagnostic", () => {
    const parent = { name: "Dwarf", source: "PHB" };
    const r = classifySpeciesSourceScope({
      record: { name: "Hill Dwarf", source: "MPMM", remaining: {} },
      parentIdentity: parent,
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    // Mutate original
    (parent as Record<string, string>).name = "Mutated";
    (parent as Record<string, string>).source = "FAKE";
    // Diagnostic must remain unchanged
    expect(r.diagnostic.recordIdentity.parent).toEqual({ name: "Dwarf", source: "PHB" });
  });

  it("no parent inferred from record name or prose", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Hill Dwarf (Dwarf)", source: "MPMM", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(r.diagnostic.recordIdentity.parent).toBeUndefined();
  });

  it("diagnostic recordIdentity is frozen", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Test", source: "MPMM", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(Object.isFrozen(r.diagnostic.recordIdentity)).toBe(true);
  });

  it("diagnostic object is frozen", () => {
    const r = classifySpeciesSourceScope({
      record: { name: "Test", source: "MPMM", remaining: {} },
    }, uctx);
    if (r.ok) throw new Error("Expected not ok");
    expect(Object.isFrozen(r.diagnostic)).toBe(true);
  });
});

/* ── Registry ──────────────────────────────────────────────────── */

describe("SUPPORTED_SPECIES_SOURCES", () => {
  it("contains exactly PHB/2014 and XPHB/2024", () => {
    expect(SUPPORTED_SPECIES_SOURCES).toEqual([
      { source: "PHB", ruleset: "2014" },
      { source: "XPHB", ruleset: "2024" },
    ]);
  });

  it("array is frozen", () => {
    expect(Object.isFrozen(SUPPORTED_SPECIES_SOURCES)).toBe(true);
  });

  it("each registry entry is frozen", () => {
    for (const entry of SUPPORTED_SPECIES_SOURCES) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it("mutation attempts cannot change source or ruleset values", () => {
    const entry = SUPPORTED_SPECIES_SOURCES[0]!;
    expect(() => {
      (entry as unknown as Record<string, string>).source = "FAKE";
    }).toThrow();
    expect(() => {
      (entry as unknown as Record<string, string>).ruleset = "2030";
    }).toThrow();
    // Values must remain unchanged
    expect(entry.source).toBe("PHB");
    expect(entry.ruleset).toBe("2014");
  });
});
