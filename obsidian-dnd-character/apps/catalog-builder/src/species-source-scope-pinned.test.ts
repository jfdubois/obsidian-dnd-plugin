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

/** Test-only structured location data for pipeline records. */
interface LocatedMaterializedSpeciesRecord {
  readonly record: RawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
}

/**
 * Find an exact record by entity kind, name, and source from materialized records.
 * Throws if the match count is not exactly one, enforcing deterministic identity
 * selection rather than positional [0] selectors.
 */
function findExactRecord(
  records: readonly LocatedMaterializedSpeciesRecord[],
  entityKind: string,
  name: string,
  source: string,
): LocatedMaterializedSpeciesRecord {
  const matches = records.filter(
    (candidate) =>
      candidate.entityKind === entityKind
      && candidate.record.name === name
      && candidate.record.source === source,
  );

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${entityKind}:${name}|${source}; found ${matches.length}`,
    );
  }

  return matches[0]!;
}

/** Consumed directives that must be absent from materialized records. */
const CONSUMED_DIRECTIVES = Object.freeze([
  "_copy",
  "_mod",
  "_preserve",
  "_templates",
  "_versions",
  "_abstract",
  "_implementations",
  "_variables",
] as const);

/**
 * Run the full materialization pipeline on pinned races.json:
 * 1. Load raw JSON files
 * 2. Validate raw boundary
 * 3. Expand versions
 * 4. Materialize copy+mod records
 * Returns the fully materialized species records with structured location data.
 */
function loadMaterializedSpeciesRecords(): LocatedMaterializedSpeciesRecord[] {
  const loaded = loadRawJsonFiles(pinnedFiveEToolsPath());
  const boundary = validateRawBoundary(loaded.files);
  const racesEnvelope = boundary.validatedFiles["races.json"];
  expect(racesEnvelope).toBeDefined();
  expect(racesEnvelope!.collections.length).toBeGreaterThan(0);

  // Step 1: Expand versions to create version-expanded records
  const expanded = expandVersions({ "races.json": racesEnvelope! });
  expect(expanded.ok, expanded.diagnostics.map((d) => d.message).join("\n")).toBe(true);
  expect(expanded.diagnostics).toEqual([]);
  const expandedEnvelope = expanded.validatedFiles["races.json"];
  expect(expandedEnvelope).toBeDefined();

  // Step 2: Materialize copy+mod records to produce materialized species records
  const context: CopyResolverContext = { validatedFiles: expanded.validatedFiles };
  const materialized: LocatedMaterializedSpeciesRecord[] = [];

  let copyBearingCount = 0;
  let successfullyMaterialized = 0;

  for (const collection of expandedEnvelope!.collections) {
    for (const record of collection.records) {
      const copyValue = record.remaining._copy;
      if (copyValue !== undefined && typeof copyValue === "object" && copyValue !== null) {
        copyBearingCount++;
        const result = materializeCopyWithMods(
          record as CopyModRawRecord,
          context,
          {
            sourceEntityKind: collection.entityKind,
            sourcePath: "races.json",
          },
        );
        if (result.ok) {
          successfullyMaterialized++;
          materialized.push({
            record: result.result.record,
            entityKind: collection.entityKind,
            sourcePath: "races.json",
          });
        } else {
          throw new Error(
            `Copy materialization failed for ${record.name}|${record.source} ` +
            `(entityKind: ${collection.entityKind}, sourcePath: races.json): ` +
            result.diagnostics.map((d) => d.message).join("; "),
          );
        }
      } else {
        // Non-copy records are already materialized
        materialized.push({
          record,
          entityKind: collection.entityKind,
          sourcePath: "races.json",
        });
      }
    }
  }

  // Assert copy materialization completeness
  expect(copyBearingCount).toBeGreaterThanOrEqual(0);
  expect(successfullyMaterialized).toBe(copyBearingCount);

  return materialized;
}

describe("pinned species source-scope integration", () => {
  // Load fully materialized species records through the complete pipeline
  const locatedRecords = loadMaterializedSpeciesRecords();

  // Build the inventory from successfully materialized records
  const inventory = collectKnownSpeciesSources(locatedRecords.map((item) => item.record));

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
    expect(inventory.sources.has("MPMM")).toBe(true);
  });

  it("at least one actual optional source exists in the derived inventory", () => {
    const optionalSources = [...inventory.sources].filter(
      (s) => s !== "PHB" && s !== "XPHB",
    );
    expect(optionalSources.length).toBeGreaterThan(0);
  });

  it("inventory diagnostics are empty", () => {
    expect(inventory.diagnostics).toEqual([]);
  });

  it("fabricated TST is absent from the derived inventory", () => {
    expect(inventory.sources.has("TST")).toBe(false);
  });

  /* ── Consumed directive cleanup ────────────────────────────── */

  it("Human|PHB has no consumed directives in remaining", () => {
    const phbLocated = findExactRecord(locatedRecords, "race", "Human", "PHB");
    for (const directive of CONSUMED_DIRECTIVES) {
      expect(phbLocated.record.remaining[directive]).toBeUndefined();
    }
  });

  it("Human|XPHB has no consumed directives in remaining", () => {
    const xphbLocated = findExactRecord(locatedRecords, "race", "Human", "XPHB");
    for (const directive of CONSUMED_DIRECTIVES) {
      expect(xphbLocated.record.remaining[directive]).toBeUndefined();
    }
  });

  it("Aarakocra|MPMM has no consumed directives in remaining", () => {
    const mpmmLocated = findExactRecord(locatedRecords, "race", "Aarakocra", "MPMM");
    for (const directive of CONSUMED_DIRECTIVES) {
      expect(mpmmLocated.record.remaining[directive]).toBeUndefined();
    }
  });

  /* ── Exact representative acceptance ───────────────────────── */

  it("Human|PHB is accepted as 2014 ruleset", () => {
    const phbLocated = findExactRecord(locatedRecords, "race", "Human", "PHB");
    const result = classifySpeciesSourceScope(
      { record: phbLocated.record, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("PHB");
    expect(result.ruleset).toBe("2014");
  });

  it("Human|XPHB is accepted as 2024 ruleset", () => {
    const xphbLocated = findExactRecord(locatedRecords, "race", "Human", "XPHB");
    const result = classifySpeciesSourceScope(
      { record: xphbLocated.record, entityKind: "race" },
      ctx,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.source).toBe("XPHB");
    expect(result.ruleset).toBe("2024");
  });

  /* ── Optional source rejection ─────────────────────────────── */

  it("Aarakocra|MPMM emits UNSUPPORTED_SPECIES_SOURCE (not UNKNOWN_SOURCE)", () => {
    const mpmmLocated = findExactRecord(locatedRecords, "race", "Aarakocra", "MPMM");
    const result = classifySpeciesSourceScope(
      { record: mpmmLocated.record, entityKind: "race" },
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
    const humanPhb = findExactRecord(locatedRecords, "race", "Human", "PHB").record;
    const humanXphb = findExactRecord(locatedRecords, "race", "Human", "XPHB").record;
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
