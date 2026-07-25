import {
  isCopyResolutionFailure,
  isCopyResolutionSuccess,
  resolveCopy,
  type CopyDiagnosticCode,
  type CopyResolverDiagnostic,
  type CopyResolverContext,
} from "./copy-resolver";
import { resolveCopyWithMods, type CopyModRawRecord } from "./mod-copy-resolver";
import { KNOWN_RAW_FIELDS, type RawBoundaryResult, type RawRecord } from "./raw-boundary";
import type { DiagnosticSeverity, RawLoaderDiagnostic, RawLoadResult } from "./raw-loader";
import type { ModOperationDiagnostic } from "./mod-types";

export interface IngestionDiagnosticReportInput {
  readonly rawLoadResult?: Pick<RawLoadResult, "diagnostics">;
  readonly rawBoundaryResult: RawBoundaryResult;
}

export interface IngestionParseFailure {
  readonly code: "JSON_PARSE_ERROR";
  readonly severity: "error";
  readonly message: string;
  readonly path: string;
}

export interface IngestionResolutionFailure {
  readonly code: CopyDiagnosticCode | ModOperationDiagnostic["code"];
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sourcePath: string;
  readonly entityType: string;
  readonly entityName: string;
  readonly entitySource: string;
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawParam?: unknown;
  readonly copyDiagnostic?: CopyResolverDiagnostic;
  readonly modDiagnostic?: ModOperationDiagnostic;
}

export interface EntityFieldInventoryReport {
  readonly entityType: string;
  readonly observedFields: readonly string[];
  readonly envelopeFields: readonly string[];
  readonly claimedFields: readonly string[];
  readonly narrativeFields: readonly string[];
  readonly unclaimedFields: readonly string[];
}

export interface UnclaimedFieldReport {
  readonly field: string;
  readonly entityType: string;
  readonly sourcePath: string;
  readonly entityName: string;
  readonly entitySource: string;
  readonly recordIndex: number;
}

export type StructuredValueKind = "array" | "object" | "number" | "boolean" | "string" | "null" | "undefined";

export interface UnclaimedCandidateMechanicalField extends UnclaimedFieldReport {
  readonly valueKind: StructuredValueKind;
}

export interface IngestionDiagnosticReport {
  readonly parseFailures: readonly IngestionParseFailure[];
  readonly resolutionFailures: readonly IngestionResolutionFailure[];
  readonly entityFieldInventory: Readonly<Record<string, EntityFieldInventoryReport>>;
  readonly claimedFields: readonly string[];
  readonly claimedFieldsByEntityType: Readonly<Record<string, readonly string[]>>;
  readonly narrativeFields: readonly string[];
  readonly unclaimedFields: readonly UnclaimedFieldReport[];
  readonly unclaimedCandidateMechanicalFields: readonly UnclaimedCandidateMechanicalField[];
}

const ENVELOPE_FIELDS = new Set(["name", "source"]);
const FUTURE_IMPORTER_CLAIMED_FIELDS: ReadonlySet<string> = new Set([...KNOWN_RAW_FIELDS, "classFeatures"]);

function isJsonParseFailure(
  diagnostic: RawLoaderDiagnostic,
): diagnostic is IngestionParseFailure {
  return diagnostic.code === "JSON_PARSE_ERROR" && diagnostic.severity === "error";
}

function sorted(values: Iterable<string>): readonly string[] {
  return [...values].sort();
}

function valueKind(value: unknown): StructuredValueKind {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function isCandidateMechanicalKind(kind: StructuredValueKind): boolean {
  return kind === "array" || kind === "object" || kind === "number" || kind === "boolean";
}

function toCopyModRecord(record: RawRecord): CopyModRawRecord {
  return { name: record.name, source: record.source, remaining: record.remaining };
}

function createCopyFailure(
  diagnostic: CopyResolverDiagnostic,
  sourcePath: string,
  entityType: string,
  record: RawRecord,
): IngestionResolutionFailure {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    sourcePath,
    entityType,
    entityName: record.name,
    entitySource: record.source,
    copyDiagnostic: diagnostic,
  };
}

function createModFailure(
  diagnostic: ModOperationDiagnostic,
  sourcePath: string,
  entityType: string,
  record: RawRecord,
): IngestionResolutionFailure {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    sourcePath,
    entityType,
    entityName: record.name,
    entitySource: record.source,
    fieldTarget: diagnostic.fieldTarget,
    mode: diagnostic.mode,
    rawParam: diagnostic.rawParam,
    modDiagnostic: diagnostic,
  };
}

function collectResolutionFailures(
  boundary: RawBoundaryResult,
): readonly IngestionResolutionFailure[] {
  const context: CopyResolverContext = {
    validatedFiles: boundary.validatedFiles,
  };
  const failures: IngestionResolutionFailure[] = [];

  for (const [sourcePath, envelope] of Object.entries(boundary.validatedFiles)) {
    for (const collection of envelope.collections) {
      for (const record of collection.records) {
        const copyResult = resolveCopy(record, context);
        if (isCopyResolutionFailure(copyResult)) {
          if (copyResult.diagnostic.code !== "NO_COPY_FIELD") {
            failures.push(
              createCopyFailure(copyResult.diagnostic, sourcePath, collection.entityKind, record),
            );
          }
          continue;
        }

        if (isCopyResolutionSuccess(copyResult)) {
          const modResult = resolveCopyWithMods(toCopyModRecord(record), context, { sourcePath });
          if (!modResult.ok) {
            for (const diagnostic of modResult.diagnostics) {
              failures.push(createModFailure(diagnostic, sourcePath, collection.entityKind, record));
            }
          }
        }
      }
    }
  }
  return failures;
}

function collectEntityInventory(
  boundary: RawBoundaryResult,
): Readonly<Record<string, EntityFieldInventoryReport>> {
  const narrative = new Set(boundary.fieldInventory.narrative);
  const byEntity = new Map<string, Set<string>>();

  for (const envelope of Object.values(boundary.validatedFiles)) {
    for (const collection of envelope.collections) {
      const fields = byEntity.get(collection.entityKind) ?? new Set<string>();
      byEntity.set(collection.entityKind, fields);
      fields.add("name");
      fields.add("source");
      for (const record of collection.records) {
        for (const field of Object.keys(record.remaining)) {
          fields.add(field);
        }
      }
    }
  }

  const result: Record<string, EntityFieldInventoryReport> = {};
  for (const [entityType, fields] of byEntity.entries()) {
    const envelopeFields = new Set<string>();
    const claimedFields = new Set<string>();
    const narrativeFields = new Set<string>();
    const unclaimedFields = new Set<string>();

    for (const field of fields) {
      if (ENVELOPE_FIELDS.has(field)) {
        envelopeFields.add(field);
      } else if (narrative.has(field)) {
        narrativeFields.add(field);
      } else if (FUTURE_IMPORTER_CLAIMED_FIELDS.has(field)) {
        claimedFields.add(field);
      } else {
        unclaimedFields.add(field);
      }
    }

    result[entityType] = {
      entityType,
      observedFields: sorted(fields),
      envelopeFields: sorted(envelopeFields),
      claimedFields: sorted(claimedFields),
      narrativeFields: sorted(narrativeFields),
      unclaimedFields: sorted(unclaimedFields),
    };
  }
  return result;
}

function collectUnclaimed(
  boundary: RawBoundaryResult,
): {
  readonly unclaimedFields: readonly UnclaimedFieldReport[];
  readonly candidateMechanicalFields: readonly UnclaimedCandidateMechanicalField[];
} {
  const unclaimedFields: UnclaimedFieldReport[] = [];
  const candidateMechanicalFields: UnclaimedCandidateMechanicalField[] = [];

  for (const diagnostic of boundary.unclaimedDiagnostics) {
    const envelope = boundary.validatedFiles[diagnostic.path];
    const collection = envelope?.collections.find(
      (c) => c.entityKind === diagnostic.entityKind,
    );
    const record = collection?.records[diagnostic.recordIndex];
    if (record === undefined) continue;
    if (FUTURE_IMPORTER_CLAIMED_FIELDS.has(diagnostic.field)) continue;

    const base = {
      field: diagnostic.field,
      entityType: diagnostic.entityKind,
      sourcePath: diagnostic.path,
      entityName: diagnostic.recordName,
      entitySource: record.source,
      recordIndex: diagnostic.recordIndex,
    };
    unclaimedFields.push(base);

    const kind = valueKind(record.remaining[diagnostic.field]);
    if (isCandidateMechanicalKind(kind)) {
      candidateMechanicalFields.push({ ...base, valueKind: kind });
    }
  }

  return { unclaimedFields, candidateMechanicalFields };
}

export function createIngestionDiagnosticReport(
  input: IngestionDiagnosticReportInput,
): IngestionDiagnosticReport {
  const entityFieldInventory = collectEntityInventory(input.rawBoundaryResult);
  const { unclaimedFields, candidateMechanicalFields } = collectUnclaimed(input.rawBoundaryResult);
  const claimedFieldsByEntityType = Object.fromEntries(
    Object.entries(entityFieldInventory).map(([entityType, inventory]) => [
      entityType,
      inventory.claimedFields,
    ]),
  );
  const claimedFields = new Set<string>();
  for (const inventory of Object.values(entityFieldInventory)) {
    for (const field of inventory.claimedFields) {
      claimedFields.add(field);
    }
  }

  return {
    parseFailures: (input.rawLoadResult?.diagnostics ?? []).filter(isJsonParseFailure),
    resolutionFailures: collectResolutionFailures(input.rawBoundaryResult),
    entityFieldInventory,
    claimedFields: sorted(claimedFields),
    claimedFieldsByEntityType,
    narrativeFields: sorted(input.rawBoundaryResult.fieldInventory.narrative),
    unclaimedFields,
    unclaimedCandidateMechanicalFields: candidateMechanicalFields,
  };
}
