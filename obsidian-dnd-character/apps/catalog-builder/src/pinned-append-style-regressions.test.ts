import { describe, expect, it } from "vitest";
import {
  extractStructuredIdentity,
  isCopyResolutionSuccess,
  recordMatchesIdentity,
  resolveCopy,
  type CopyResolverContext,
  type RawCopyValue,
} from "./copy-resolver";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary, type RawRecord, type ValidatedFileEnvelope } from "./raw-boundary";
import { expandVersions } from "./versions-expander";
import { classifySourceFileRole } from "./source-file-role";
import { pinnedFiveEToolsPath } from "./test-pinned-source-path";

const REAL_CATALOG_INTEGRATION_TIMEOUT_MS = 15_000;

interface LocatedRecord {
  readonly record: RawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRawCopyValue(value: unknown): value is RawCopyValue {
  return isPlainObject(value) && typeof value.source === "string";
}

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function loadContext(): {
  readonly context: CopyResolverContext;
  readonly records: readonly LocatedRecord[];
} {
  const loaded = loadRawJsonFiles(pinnedFiveEToolsPath());
  expect(loaded.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  const boundary = validateRawBoundary(loaded.files);
  return {
    context: { validatedFiles: boundary.validatedFiles },
    records: flattenRecords(boundary.validatedFiles),
  };
}

function flattenRecords(files: Record<string, ValidatedFileEnvelope>): LocatedRecord[] {
  const records: LocatedRecord[] = [];
  for (const [sourcePath, envelope] of Object.entries(files)) {
    for (const collection of envelope.collections) {
      for (const record of collection.records) {
        records.push({ record, entityKind: collection.entityKind, sourcePath });
      }
    }
  }
  return records;
}

function findRecord(
  records: readonly LocatedRecord[],
  entityKind: string,
  sourcePath: string,
  name: string,
  source: string,
): LocatedRecord {
  const found = records.find((located) =>
    located.entityKind === entityKind
    && located.sourcePath === sourcePath
    && located.record.name === name
    && located.record.source === source);
  if (found === undefined) throw new Error(`Missing ${entityKind}:${name}|${source} at ${sourcePath}`);
  return found;
}

describe("pinned append-style _mod regressions", () => {
  it("materializes the Shadow Dragon legendaryGroup template against a base without lairActions", () => {
    const { context } = loadContext();
    const sourcePath = "bestiary/legendarygroups.json";
    const selectedFiles = {
      [sourcePath]: context.validatedFiles[sourcePath]!,
      "bestiary/template.json": context.validatedFiles["bestiary/template.json"]!,
    };
    const before = clone(selectedFiles);
    const base = selectedFiles[sourcePath].collections
      .find((collection) => collection.entityKind === "legendaryGroup")!
      .records.find((record) => record.name === "Lunar Dragon" && record.source === "BAM")!;

    expect(base.remaining).not.toHaveProperty("lairActions");
    expect(base.remaining._versions).toEqual([
      {
        name: "Shadow Dragon (Lunar Dragon)",
        source: "BAM",
        _templates: [{ name: "Shadow Dragon", source: "FTD" }],
      },
    ]);

    const result = expandVersions(selectedFiles);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    const legendaryGroups = result.validatedFiles[sourcePath]!.collections
      .find((collection) => collection.entityKind === "legendaryGroup")!;
    const materialized = legendaryGroups.records.find((record) =>
      record.name === "Shadow Dragon (Lunar Dragon)" && record.source === "BAM")!;
    const lairActionText = JSON.stringify(materialized.remaining.lairActions);
    expect(lairActionText.match(/Additional Lair Action/g)).toHaveLength(1);
    expect(materialized.remaining.lairActions).toEqual([
      expect.objectContaining({ name: "Additional Lair Action" }),
    ]);
    expect(materialized.remaining).not.toHaveProperty("_copy");
    expect(materialized.remaining).not.toHaveProperty("_mod");
    expect(materialized.remaining).not.toHaveProperty("_templates");
    expect(materialized.remaining).not.toHaveProperty("_versions");
    expect(clone(selectedFiles)).toEqual(before);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);
});

describe("pinned vehicle copy-chain characterization", () => {
  it("documents the Vehicle (Air)|DMG chain label without changing production behavior", () => {
    const { context, records } = loadContext();
    const vehicle = findRecord(records, "itemType", "items-base.json", "Vehicle (Air)", "DMG");
    const rawCopy = vehicle.record.remaining._copy;
    expect(rawCopy).toEqual({ abbreviation: "SHP", source: "DMG" });
    if (!isRawCopyValue(rawCopy)) {
      throw new Error("Expected raw _copy payload");
    }

    const identity = extractStructuredIdentity(rawCopy);
    const candidates = records
      .filter((located) => located.entityKind === "itemType" && recordMatchesIdentity(located.record, identity))
      .map((located) => ({
        name: located.record.name,
        source: located.record.source,
        sourcePath: located.sourcePath,
        sourceRole: classifySourceFileRole(located.sourcePath).role,
      }));
    expect(candidates).toEqual([
      {
        name: "Vehicle (Water)",
        source: "DMG",
        sourcePath: "items-base.json",
        sourceRole: "canonical-content",
      },
    ]);

    const result = resolveCopy(vehicle.record, context, {
      sourceEntityKind: vehicle.entityKind,
      sourcePath: vehicle.sourcePath,
    });

    expect(isCopyResolutionSuccess(result)).toBe(true);
    if (!isCopyResolutionSuccess(result)) throw new Error(result.diagnostic.message);
    expect(result.chain).toEqual([
      {
        entityName: "Vehicle (Water)",
        sourceAbbr: "DMG",
        entityKind: "itemType",
        sourcePath: "items-base.json",
        identity: { abbreviation: "SHP", source: "DMG" },
      },
    ]);
    expect(result.baseEntity.name).toBe("Vehicle (Water)");
    expect(result.baseEntity.source).toBe("DMG");
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);
});
