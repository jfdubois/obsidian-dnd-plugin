import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import {
  SUPPORTED_SPECIES_SOURCES,
  collectKnownSpeciesSources,
  classifySpeciesSourceScope,
} from "./species-source-scope";

function rec(source: string, rem: Record<string, unknown> = {}): RawRecord {
  return { name: "Test Species", source, remaining: rem };
}

const ctx = {
  knownPinnedSources: Object.freeze(new Set(["MPMM", "VGM", "EEPC", "PHB", "XPHB"])),
};

/* ── collectKnownSpeciesSources ────────────────────────────────── */

describe("collectKnownSpeciesSources", () => {
  it("returns empty set for empty input", () => {
    expect(collectKnownSpeciesSources([])).toEqual(Object.freeze(new Set()));
  });

  it("derives sources from records", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec("XPHB"), rec("MPMM")]);
    expect(r.has("PHB")).toBe(true);
    expect(r.has("XPHB")).toBe(true);
    expect(r.has("MPMM")).toBe(true);
  });

  it("skips empty or whitespace-only sources", () => {
    const r = collectKnownSpeciesSources([rec("PHB"), rec(""), rec("  ")]);
    expect(r.has("PHB")).toBe(true);
    expect(r.has("")).toBe(false);
    expect(r.has("  ")).toBe(false);
  });

  it("returns a frozen set", () => {
    expect(Object.isFrozen(collectKnownSpeciesSources([rec("PHB")]))).toBe(true);
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
      record: rec("PHB", { description: "A 2024 ruleset species.", entries: [] }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("source-access flags cannot alter classification", () => {
    const r = classifySpeciesSourceScope({
      record: rec("PHB", { basicRules2024: true }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
  });

  it("publication-like fields cannot alter classification", () => {
    const r = classifySpeciesSourceScope({
      record: rec("PHB", { published: "2024-01-01", edition: "2024" }),
    }, ctx);
    if (!r.ok) throw new Error("Expected ok");
    expect(r.ruleset).toBe("2014");
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
  const uctx = { knownPinnedSources: Object.freeze(new Set(["MPMM"])) };

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

/* ── Registry ──────────────────────────────────────────────────── */

describe("SUPPORTED_SPECIES_SOURCES", () => {
  it("contains exactly PHB and XPHB", () => {
    expect(SUPPORTED_SPECIES_SOURCES).toEqual([
      { source: "PHB", ruleset: "2014" },
      { source: "XPHB", ruleset: "2024" },
    ]);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SUPPORTED_SPECIES_SOURCES)).toBe(true);
  });
});
