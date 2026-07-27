import { describe, expect, it } from "vitest";
import type { RecordAccessClassification } from "./record-access-classifier";
import { classifyRecordAccess } from "./record-access-classifier";
import type { RawRecord } from "./raw-boundary";
import {
  classifyRecordRuleset,
  classifyResolvedRecordRulesets,
  type RulesetRecordClassification,
} from "./ruleset-classifier";
import { createSourceManifest } from "./source-manifest";
import { normalizeSourceMetadata } from "./source-metadata-normalizer";
import { pinnedFiveEToolsRevision } from "./test-pinned-source-path";

const PINNED_REVISION = pinnedFiveEToolsRevision();

const sourceManifest = createSourceManifest({
  clonePath: "/repo/external/5etools-src",
  commitHash: PINNED_REVISION,
  shortHash: PINNED_REVISION.slice(0, 7),
  subject: "Source fixture commit",
  date: "2024-01-01T00:00:00+00:00",
});

function rawRecord(
  name: string,
  source: string,
  remaining: Record<string, unknown> = {},
): RawRecord {
  return Object.freeze({
    name,
    source,
    remaining: Object.freeze(remaining),
  });
}

function classifiedRecord(
  record: RawRecord,
  recordIndex: number,
): RulesetRecordClassification {
  const result = classifyRecordRuleset({
    record,
    sourcePath: "class/class.json",
    entityKind: "class",
    recordIndex,
  });
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.classification;
}

describe("normalizeSourceMetadata", () => {
  it("normalizes deterministic source metadata with ruleset and access provenance", () => {
    const accessClassifications = [
      classifyRecordAccess(classifiedRecord(rawRecord("Alpha", "PHB", { srd: true }), 0)),
      classifyRecordAccess(classifiedRecord(rawRecord("Beta", "XPHB"), 1)),
      classifyRecordAccess(classifiedRecord(rawRecord("Gamma", "PHB", { srd: true }), 2)),
    ];

    const result = normalizeSourceMetadata({
      sourceManifest,
      accessClassifications,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.metadata).toHaveLength(2);
    expect(result.metadata.map((metadata) => metadata.key)).toEqual([
      "2014:PHB:core",
      "2024:XPHB:source",
    ]);

    expect(result.metadata[0]).toMatchObject({
      source: "PHB",
      ruleset: "2014",
      access: "core",
      classification: {
        rulesetMethod: "reviewed-source-map",
        accessMethod: "structured-core-marker",
        coreMarker: { field: "srd", value: true },
      },
    });
    expect(result.metadata[0]?.provenance).toHaveLength(2);
    expect(result.metadata[0]?.provenance[0]).toMatchObject({
      sourceManifest: {
        commitHash: PINNED_REVISION,
        shortHash: PINNED_REVISION.slice(0, 7),
        date: "2024-01-01T00:00:00+00:00",
      },
      sourcePath: "class/class.json",
      entityKind: "class",
      recordIndex: 0,
      recordName: "Alpha",
    });
    expect(result.metadata[1]).toMatchObject({
      source: "XPHB",
      ruleset: "2024",
      access: "source",
      classification: {
        rulesetMethod: "reviewed-source-map",
        accessMethod: "default-source-access",
      },
    });
    expect(Object.isFrozen(result.metadata)).toBe(true);
    expect(Object.isFrozen(result.metadata[0]?.provenance)).toBe(true);
  });

  it("converts upstream ruleset failures to source metadata exclusion diagnostics", () => {
    const batch = classifyResolvedRecordRulesets([
      {
        record: rawRecord("Unsupported", "UA"),
        sourcePath: "class/class.json",
        entityKind: "class",
        recordIndex: 3,
      },
    ]);

    const result = normalizeSourceMetadata({
      sourceManifest,
      accessClassifications: [],
      rulesetDiagnostics: batch.diagnostics,
    });

    expect(result.metadata).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "UPSTREAM_RULESET_EXCLUSION",
        upstreamCode: "UNKNOWN_SOURCE",
        source: "UA",
        recordName: "Unsupported",
        recordIndex: 3,
      }),
    ]);
  });

  it("excludes invalid access classifications instead of emitting metadata", () => {
    const invalidClassification: RecordAccessClassification = Object.freeze({
      record: rawRecord("Broken", ""),
      source: "",
      ruleset: "2014",
      access: "source",
      method: "default-source-access",
    });

    const result = normalizeSourceMetadata({
      sourceManifest,
      accessClassifications: [invalidClassification],
    });

    expect(result.metadata).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "INVALID_SOURCE_METADATA",
        source: "",
        ruleset: "2014",
        access: "source",
        recordName: "Broken",
      }),
    ]);
  });
});
