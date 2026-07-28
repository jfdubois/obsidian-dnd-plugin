import { describe, expect, it } from "vitest";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary, type RawRecord } from "./raw-boundary";
import {
  collectKnownSpeciesSources,
  classifySpeciesSourceScope,
  classifySpeciesSourceScopeBatch,
  type SpeciesSourceScopeContext,
} from "./species-source-scope";
import { pinnedFiveEToolsPath } from "./test-pinned-source-path";

/* ── Pinned species source-scope integration ───────────────────── */

/**
 * Load pinned species records from the actual 5eTools checkout.
 * Uses races.json as the species collection file.
 */
function loadPinnedSpeciesRecords(): RawRecord[] {
  const loaded = loadRawJsonFiles(pinnedFiveEToolsPath());
  const boundary = validateRawBoundary(loaded.files);
  const racesEnvelope = boundary.validatedFiles["races.json"];
  expect(racesEnvelope).toBeDefined();
  expect(racesEnvelope!.collections.length).toBeGreaterThan(0);
  return racesEnvelope!.collections.flatMap((c) => c.records);
}

describe("pinned species source-scope integration", () => {
  const records = loadPinnedSpeciesRecords();

  // Build the inventory from pinned records
  const inventory = collectKnownSpeciesSources(records);

  // Build context from derived inventory
  const ctx: SpeciesSourceScopeContext = {
    knownPinnedSources: inventory.sources,
  };

  /* ── Inventory derivation ──────────────────────────────────── */

  it("inventory is based on pinned records, not a manually authored set", () => {
    expect(inventory.sources.size).toBeGreaterThan(0);
    // The inventory must contain at least the core sources
    expect(inventory.sources.has("PHB")).toBe(true);
    expect(inventory.sources.has("XPHB")).toBe(true);
  });

  it("at least one actual optional source exists in the derived inventory", () => {
    const optionalSources = [...inventory.sources].filter(
      (s) => s !== "PHB" && s !== "XPHB",
    );
    expect(optionalSources.length).toBeGreaterThan(0);
  });

  /* ── PHB species acceptance ────────────────────────────────── */

  it("at least one resolved PHB species exists and is accepted as 2014", () => {
    const phbRecords = records.filter((r) => r.source === "PHB");
    expect(phbRecords.length).toBeGreaterThan(0);

    const phbRecord = phbRecords[0]!;
    const result = classifySpeciesSourceScope(
      { record: phbRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("PHB");
    expect(result.ruleset).toBe("2014");
    // Report the representative identity
    console.log(`PHB representative: ${phbRecord.name} (source: ${phbRecord.source})`);
  });

  /* ── XPHB species acceptance ───────────────────────────────── */

  it("at least one resolved XPHB species exists and is accepted as 2024", () => {
    const xphbRecords = records.filter((r) => r.source === "XPHB");
    expect(xphbRecords.length).toBeGreaterThan(0);

    const xphbRecord = xphbRecords[0]!;
    const result = classifySpeciesSourceScope(
      { record: xphbRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("XPHB");
    expect(result.ruleset).toBe("2024");
    // Report the representative identity
    console.log(`XPHB representative: ${xphbRecord.name} (source: ${xphbRecord.source})`);
  });

  /* ── Optional source rejection ─────────────────────────────── */

  it("at least one actual optional-source record emits UNSUPPORTED_SPECIES_SOURCE", () => {
    const optionalSources = [...inventory.sources].filter(
      (s) => s !== "PHB" && s !== "XPHB",
    );
    const optionalSource = optionalSources[0]!;
    expect(optionalSource).toBeDefined();

    const optionalRecords = records.filter((r) => r.source === optionalSource);
    expect(optionalRecords.length).toBeGreaterThan(0);

    const optionalRecord = optionalRecords[0]!;
    const result = classifySpeciesSourceScope(
      { record: optionalRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected not ok");
    expect(result.diagnostic.code).toBe("UNSUPPORTED_SPECIES_SOURCE");
    // Report the representative identity
    console.log(`Optional representative: ${optionalRecord.name} (source: ${optionalSource})`);
  });

  /* ── Fabricated source ─────────────────────────────────────── */

  it("fabricated TST remains absent from the inventory and emits UNKNOWN_SOURCE", () => {
    expect(inventory.sources.has("TST")).toBe(false);

    const result = classifySpeciesSourceScope(
      { record: { name: "Fabricated", source: "TST", remaining: {} }, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected not ok");
    expect(result.diagnostic.code).toBe("UNKNOWN_SOURCE");
  });

  /* ── Batch classification on pinned records ────────────────── */

  it("batch classification on pinned records preserves order and determinism", () => {
    const phbRecords = records.filter((r) => r.source === "PHB").slice(0, 3);
    const xphbRecords = records.filter((r) => r.source === "XPHB").slice(0, 2);
    const batch = [
      ...phbRecords.map((r, i) => ({ record: r, entityKind: "race", recordIndex: i })),
      ...xphbRecords.map((r, i) => ({ record: r, entityKind: "race", recordIndex: phbRecords.length + i })),
    ];

    const result = classifySpeciesSourceScopeBatch(batch, ctx);
    expect(result.classifications.length).toBe(batch.length);
    expect(result.diagnostics).toEqual([]);
    expect(result.representedRulesets).toEqual(["2014", "2024"]);
  });

  /* ── Inventory diagnostics on pinned records ───────────────── */

  it("pinned inventory has no diagnostics for well-formed records", () => {
    // All pinned records should have well-formed sources
    expect(inventory.diagnostics).toEqual([]);
  });
});
