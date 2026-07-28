import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import { classifySpeciesSourceScopeBatch } from "./species-source-scope";

function rec(source: string, name = "Test Species"): RawRecord {
  return { name, source, remaining: {} };
}

const ctx = {
  knownPinnedSources: Object.freeze(new Set(["MPMM", "VGM", "EEPC", "PHB", "XPHB"])),
};

/* ── Batch classification ──────────────────────────────────────── */

describe("classifySpeciesSourceScopeBatch", () => {
  it("deterministic accepted order", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("XPHB"), recordIndex: 0 },
        { record: rec("PHB"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.classifications.map((c) => c.source)).toEqual(["XPHB", "PHB"]);
  });

  it("deterministic diagnostic order", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("MPMM"), recordIndex: 0 },
        { record: rec("TST"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.diagnostics.map((d) => d.code)).toEqual([
      "UNSUPPORTED_SPECIES_SOURCE",
      "UNKNOWN_SOURCE",
    ]);
  });

  it("represented rulesets when both present", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("PHB"), recordIndex: 0 },
        { record: rec("XPHB"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.representedRulesets).toEqual(["2014", "2024"]);
  });

  it("excludes unsupported records from classifications", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("PHB"), recordIndex: 0 },
        { record: rec("MPMM"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.classifications).toHaveLength(1);
    expect(r.classifications[0]?.source).toBe("PHB");
  });

  it("excludes unknown records from classifications", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("PHB"), recordIndex: 0 },
        { record: rec("TST"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.classifications).toHaveLength(1);
  });

  it("no duplicate rulesets in representedRulesets", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("PHB"), recordIndex: 0 },
        { record: rec("PHB"), recordIndex: 1 },
        { record: rec("PHB"), recordIndex: 2 },
      ],
      ctx,
    );
    expect(r.representedRulesets).toEqual(["2014"]);
  });

  it("empty batch returns empty results", () => {
    const r = classifySpeciesSourceScopeBatch([], ctx);
    expect(r.classifications).toEqual([]);
    expect(r.diagnostics).toEqual([]);
    expect(r.representedRulesets).toEqual([]);
  });
});

/* ── Immutability and freezing ─────────────────────────────────── */

describe("batch immutability and freezing", () => {
  it("input records remain unchanged", () => {
    const phb = rec("PHB");
    const orig = phb.source;
    classifySpeciesSourceScopeBatch([{ record: phb }], ctx);
    expect(phb.source).toBe(orig);
  });

  it("batch result object is frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("PHB") }], ctx);
    expect(Object.isFrozen(r)).toBe(true);
  });

  it("classifications array is frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("PHB") }], ctx);
    expect(Object.isFrozen(r.classifications)).toBe(true);
  });

  it("diagnostics array is frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("MPMM") }], ctx);
    expect(Object.isFrozen(r.diagnostics)).toBe(true);
  });

  it("representedRulesets array is frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("PHB") }], ctx);
    expect(Object.isFrozen(r.representedRulesets)).toBe(true);
  });

  it("diagnostic objects are frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("MPMM") }], ctx);
    expect(Object.isFrozen(r.diagnostics[0])).toBe(true);
  });
});
