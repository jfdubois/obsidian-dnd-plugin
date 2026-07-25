import type { Ruleset } from "@obsidian-dnd/domain";
import type { RawRecord } from "./raw-boundary";
import type { RulesetRecordClassification } from "./ruleset-classifier";

export type ContentAccess = "core" | "source";

export type RecordAccessClassificationMethod =
  | "structured-core-marker"
  | "default-source-access";

export type CoreAccessMarkerField =
  | "srd"
  | "basicRules"
  | "srd52"
  | "basicRules2024";

export interface CoreAccessMarker {
  readonly field: CoreAccessMarkerField;
  readonly value: true | string;
}

export interface RecordAccessClassification {
  readonly record: RawRecord;
  readonly source: string;
  readonly ruleset: Ruleset;
  readonly access: ContentAccess;
  readonly method: RecordAccessClassificationMethod;
  readonly coreMarker?: CoreAccessMarker;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

export interface RecordAccessBatchResult {
  readonly classifications: readonly RecordAccessClassification[];
}

const CORE_ACCESS_MARKERS_BY_RULESET: Readonly<Record<Ruleset, readonly CoreAccessMarkerField[]>> =
  {
    "2014": ["srd", "basicRules"],
    "2024": ["srd52", "basicRules2024"],
  } as const;

function asCoreAccessMarkerValue(value: unknown): true | string | undefined {
  if (value === true) return true;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function findCoreAccessMarker(record: RawRecord, ruleset: Ruleset): CoreAccessMarker | undefined {
  for (const field of CORE_ACCESS_MARKERS_BY_RULESET[ruleset]) {
    const value = asCoreAccessMarkerValue(record.remaining[field]);
    if (value !== undefined) {
      return { field, value };
    }
  }
  return undefined;
}

export function classifyRecordAccess(
  rulesetClassification: RulesetRecordClassification,
): RecordAccessClassification {
  const coreMarker = findCoreAccessMarker(
    rulesetClassification.record,
    rulesetClassification.ruleset,
  );

  return Object.freeze({
    record: rulesetClassification.record,
    source: rulesetClassification.source,
    ruleset: rulesetClassification.ruleset,
    access: coreMarker === undefined ? "source" : "core",
    method: coreMarker === undefined ? "default-source-access" : "structured-core-marker",
    coreMarker,
    sourcePath: rulesetClassification.sourcePath,
    entityKind: rulesetClassification.entityKind,
    recordIndex: rulesetClassification.recordIndex,
  });
}

export function classifyResolvedRecordAccess(
  rulesetClassifications: readonly RulesetRecordClassification[],
): RecordAccessBatchResult {
  return Object.freeze({
    classifications: Object.freeze(rulesetClassifications.map((classification) => (
      classifyRecordAccess(classification)
    ))),
  });
}
