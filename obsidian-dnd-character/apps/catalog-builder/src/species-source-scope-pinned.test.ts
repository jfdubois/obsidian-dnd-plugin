import { describe, expect, it } from "vitest";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary, type RawRecord } from "./raw-boundary";
import {
  classifySpeciesSourceScope,
  classifySpeciesSourceScopeBatch,
  type SpeciesSourceScopeContext,
} from "./species-source-scope";
import { collectKnownSpeciesSources } from "./species-source-inventory";
import { pinnedFiveEToolsPath } from "./test-pinned-source-path";
import { materializeCopyWithMods, type CopyModRawRecord } from "./mod-copy-resolver";
import { expandVersions } from "./versions-expander";
import type { CopyResolverContext } from "./copy-resolver";

/* ── Pinned species source-scope integration ───────────────────── */

/**
 * Find an exact record by name and source from materialized records.
 * Throws if the record is not found, ensuring deterministic identity
 * selection rather than positional [0] selectors.
 */
function findExactRecord(
  records: readonly RawRecord[],
  name: string,
  source: string,
): RawRecord {
  const found = records.find((r) => r.name === name && r.source === source);
  if (found === undefined) {
    throw new Error(`Missing representative record: ${name}|${source}`);
  }
  return found;
}

/**
 * Run the full materialization pipeline on pinned races.json:
 * 1. Load raw JSON files
 * 2. Validate raw boundary
 * 3. Expand versions
 * 4. Materialize copy+mod records
 * Returns the fully materialized species records.
 */
function loadMaterializedSpeciesRecords(): RawRecord[] {
  const loaded = loadRawJsonFiles(pinnedFiveEToolsPath());
  const boundary = validateRawBoundary(loaded.files);
  const racesEnvelope = boundary.validatedFiles["races.json"];
  expect(racesEnvelope).toBeDefined();
  expect(racesEnvelope!.collections.length).toBeGreaterThan(0);

  // Step 1: Expand versions to create version-expanded records
  const expanded = expandVersions({ "races.json": racesEnvelope! });
  expect(expanded.ok, expanded.diagnostics.map((d) => d.message).join("\n")).toBe(true);
  const expandedEnvelope = expanded.validatedFiles["races.json"];
  expect(expandedEnvelope).toBeDefined();

  // Step 2: Materialize copy+mod records to produce materialized species records
  const context: CopyResolverContext = { validatedFiles: expanded.validatedFiles };
  const materialized: RawRecord[] = [];

  for (const collection of expandedEnvelope!.collections) {
    for (const record of collection.records) {
      // Only materialize records that have _copy directives
      const copyValue = record.remaining._copy;
      if (copyValue !== undefined && typeof copyValue === "object" && copyValue !== null) {
        const result = materializeCopyWithMods(
          record as CopyModRawRecord,
          context,
          {
            sourceEntityKind: collection.entityKind,
            sourcePath: "races.json",
          },
        );
        if (result.ok) {
          materialized.push(result.result.record);
        } else {
          // Non-copy records pass through; copy failures are skipped for inventory
          materialized.push(record);
        }
      } else {
        // Non-copy records are already materialized
        materialized.push(record);
      }
    }
  }

  return materialized;
}

describe("pinned species source-scope integration", () => {
  // Load fully materialized species records through the complete pipeline
  const records = loadMaterializedSpeciesRecords();

  // Build the inventory from materialized records (not raw or manually constructed)
  const inventory = collectKnownSpeciesSources(records);

  // Build context from derived inventory
  const ctx: SpeciesSourceScopeContext = {
    knownPinnedSources: inventory.sources,
  };

  /* ── Inventory derivation ──────────────────────────────────── */

  it("inventory is derived from materialized records, not a manually authored set", () => {
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

  /* ── Exact representative acceptance ───────────────────────── */

  it("Human|PHB is accepted as 2014 ruleset", () => {
    const phbRecord = findExactRecord(records, "Human", "PHB");
    const result = classifySpeciesSourceScope(
      { record: phbRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("PHB");
    expect(result.ruleset).toBe("2014");
  });

  it("Human|XPHB is accepted as 2024 ruleset", () => {
    const xphbRecord = findExactRecord(records, "Human", "XPHB");
    const result = classifySpeciesSourceScope(
      { record: xphbRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("XPHB");
    expect(result.ruleset).toBe("2024");
  });

  /* ── Optional source rejection ─────────────────────────────── */

  it("Aarakocra|MPMM emits UNSUPPORTED_SPECIES_SOURCE", () => {
    const mpmmRecord = findExactRecord(records, "Aarakocra", "MPMM");
    const result = classifySpeciesSourceScope(
      { record: mpmmRecord, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected not ok");
    expect(result.diagnostic.code).toBe("UNSUPPORTED_SPECIES_SOURCE");
    expect(result.diagnostic.recordIdentity.name).toBe("Aarakocra");
    expect(result.diagnostic.recordIdentity.source).toBe("MPMM");
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
    const humanPhb = findExactRecord(records, "Human", "PHB");
    const humanXphb = findExactRecord(records, "Human", "XPHB");
    const batch = [
      { record: humanPhb, entityKind: "race", recordIndex: 0 },
      { record: humanXphb, entityKind: "race", recordIndex: 1 },
    ];

    const result = classifySpeciesSourceScopeBatch(batch, ctx);
    expect(result.classifications.length).toBe(batch.length);
    expect(result.diagnostics).toEqual([]);
    expect(result.representedRulesets).toEqual(["2014", "2024"]);
    // Verify exact source-ruleset pairings in batch output
    expect(result.classifications[0]?.source).toBe("PHB");
    expect(result.classifications[0]?.ruleset).toBe("2014");
    expect(result.classifications[1]?.source).toBe("XPHB");
    expect(result.classifications[1]?.ruleset).toBe("2024");
  });

  /* ── Inventory diagnostics on pinned records ───────────────── */

  it("pinned inventory has no diagnostics for well-formed records", () => {
    // All pinned records should have well-formed sources
    expect(inventory.diagnostics).toEqual([]);
  });
});
