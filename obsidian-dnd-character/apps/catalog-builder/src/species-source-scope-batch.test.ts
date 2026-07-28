import { describe, expect, it } from "vitest";
import type { RawRecord } from "./raw-boundary";
import { classifySpeciesSourceScopeBatch, type SpeciesSourceScopeClassification } from "./species-source-scope";

function rec(source: string, name = "Test Species"): RawRecord {
  return { name, source, remaining: {} };
}

const ctx = {
  knownPinnedSources: new Set(["MPMM", "VGM", "EEPC", "PHB", "XPHB"]),
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

  it("each classification wrapper is frozen", () => {
    const r = classifySpeciesSourceScopeBatch([{ record: rec("PHB") }], ctx);
    expect(Object.isFrozen(r.classifications[0])).toBe(true);
  });
});

/* ── Parent identity in batch ──────────────────────────────────── */

describe("batch parent identity", () => {
  it("failure diagnostics retain parent identity", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        {
          record: { name: "Hill Dwarf", source: "MPMM", remaining: {} },
          parentIdentity: { name: "Dwarf", source: "PHB" },
        },
      ],
      ctx,
    );
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.recordIdentity.parent).toEqual({ name: "Dwarf", source: "PHB" });
  });

  it("inventory diagnostics remain separate from classification diagnostics", () => {
    // Batch classification diagnostics are about scope classification,
    // not about inventory collection.
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("MPMM") },
        { record: rec("PHB") },
      ],
      ctx,
    );
    // Classification diagnostics only include the MPMM failure
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]?.code).toBe("UNSUPPORTED_SPECIES_SOURCE");
    // Classifications only include the PHB success
    expect(r.classifications).toHaveLength(1);
    expect(r.classifications[0]?.source).toBe("PHB");
  });

  it("represented rulesets remain deterministic", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("XPHB"), recordIndex: 0 },
        { record: rec("PHB"), recordIndex: 1 },
        { record: rec("PHB"), recordIndex: 2 },
      ],
      ctx,
    );
    expect(r.representedRulesets).toEqual(["2024", "2014"]);
  });
});

/* ── Unsupported and unknown exclusion ─────────────────────────── */

describe("batch exclusion", () => {
  it("unsupported records remain excluded", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("MPMM"), recordIndex: 0 },
        { record: rec("VGM"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.classifications).toHaveLength(0);
    expect(r.diagnostics).toHaveLength(2);
    expect(r.diagnostics.map((d) => d.code)).toEqual([
      "UNSUPPORTED_SPECIES_SOURCE",
      "UNSUPPORTED_SPECIES_SOURCE",
    ]);
  });

  it("unknown records remain excluded", () => {
    const r = classifySpeciesSourceScopeBatch(
      [
        { record: rec("TST"), recordIndex: 0 },
        { record: rec("FAKE"), recordIndex: 1 },
      ],
      ctx,
    );
    expect(r.classifications).toHaveLength(0);
    expect(r.diagnostics).toHaveLength(2);
    expect(r.diagnostics.map((d) => d.code)).toEqual([
      "UNKNOWN_SOURCE",
      "UNKNOWN_SOURCE",
    ]);
  });
});

/* ── Paired union type compile-time proofs ─────────────────────── */

describe("SpeciesSourceScopeClassification paired union type", () => {
  it("enforces PHB must pair with 2014 (compile-time)", () => {
    // Valid: PHB paired with 2014
    const validPhb: SpeciesSourceScopeClassification = {
      record: rec("PHB"),
      source: "PHB",
      ruleset: "2014",
    };
    expect(validPhb.source).toBe("PHB");
    expect(validPhb.ruleset).toBe("2014");
  });

  it("enforces XPHB must pair with 2024 (compile-time)", () => {
    // Valid: XPHB paired with 2024
    const validXphb: SpeciesSourceScopeClassification = {
      record: rec("XPHB"),
      source: "XPHB",
      ruleset: "2024",
    };
    expect(validXphb.source).toBe("XPHB");
    expect(validXphb.ruleset).toBe("2024");
  });

  it("rejects PHB paired with 2024 (compile-time)", () => {
    // @ts-expect-error PHB must pair with 2014, not 2024
    const _invalid: SpeciesSourceScopeClassification = {
      record: rec("PHB"),
      source: "PHB",
      ruleset: "2024",
    };
    expect(_invalid).toBeDefined();
  });

  it("rejects XPHB paired with 2014 (compile-time)", () => {
    // @ts-expect-error XPHB must pair with 2024, not 2014
    const _invalid: SpeciesSourceScopeClassification = {
      record: rec("XPHB"),
      source: "XPHB",
      ruleset: "2014",
    };
    expect(_invalid).toBeDefined();
  });
});
