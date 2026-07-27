import type { StructuredIdentity } from "./copy-resolver";
import {
  cloneUnknown,
  deepFreeze,
} from "./copy-materialization-merge";
import type { MaterializationDiagnostic } from "./mod-types";
import type { DiagnosticSeverity } from "./raw-loader";
import type { RawRecord } from "./raw-boundary";
import type { VersionRecordValidationDiagnostic } from "./version-record-validator";

export type VersionExpansionDiagnosticCode =
  | "INVALID_VERSIONS_PAYLOAD"
  | "INVALID_VERSION_ABSTRACT"
  | "INVALID_VERSION_IMPLEMENTATIONS"
  | "INVALID_VERSION_IMPLEMENTATION"
  | "INVALID_VERSION_VARIABLES"
  | "UNRESOLVED_VERSION_VARIABLE"
  | "INVALID_VERSION_RECORD"
  | "INVALID_VERSION_DIRECTIVE"
  | "VERSION_COPY_FAILED"
  | "VERSION_PRESERVE_FAILED"
  | "VERSION_MOD_FAILED";

export interface VersionExpansionDiagnostic {
  readonly code: VersionExpansionDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sourcePath: string;
  readonly entityKind: string;
  readonly recordName: string;
  readonly recordSource: string;
  readonly versionIndex?: number;
  readonly implementationIndex?: number;
  readonly versionName?: string;
  readonly versionSource?: string;
  readonly materializationCode?: string;
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawPayload?: unknown;
  readonly requestedIdentity?: StructuredIdentity;
  readonly inheritanceChain?: MaterializationDiagnostic["inheritanceChain"];
  readonly ambiguityCandidates?: MaterializationDiagnostic["ambiguityCandidates"];
  readonly sourceEntityKind?: string;
  readonly allowedEntityKinds?: readonly string[];
  readonly invalidDiscriminatorField?: string;
  readonly invalidDiscriminatorValue?: unknown;
  readonly invalidPreserveKey?: string;
  readonly invalidField?: string;
  readonly invalidMarkerValue?: unknown;
  readonly validationReason?: string;
  readonly rawPreservePayload?: unknown;
  readonly modDiagnostics?: readonly MaterializationDiagnostic[];
}

function cloneStructuredIdentity(value: StructuredIdentity | undefined): StructuredIdentity | undefined {
  return value === undefined
    ? undefined
    : deepFreeze(cloneUnknown(value) as StructuredIdentity);
}

export function invalidVersionsPayloadDiagnostic(
  sourcePath: string,
  entityKind: string,
  sourceRecord: RawRecord,
  rawPayload: unknown,
): VersionExpansionDiagnostic {
  return Object.freeze({
    code: "INVALID_VERSIONS_PAYLOAD",
    severity: "error" as DiagnosticSeverity,
    message: `_versions for "${sourceRecord.name}" (${sourceRecord.source}) must be an array`,
    sourcePath,
    entityKind,
    recordName: sourceRecord.name,
    recordSource: sourceRecord.source,
    rawPayload,
  });
}

export function invalidVersionRecordDiagnostic(
  sourcePath: string,
  entityKind: string,
  sourceRecord: RawRecord,
  versionIndex: number,
  validationDiagnostic: VersionRecordValidationDiagnostic,
): VersionExpansionDiagnostic {
  return Object.freeze({
    code: validationDiagnostic.code,
    severity: validationDiagnostic.severity,
    message: `${validationDiagnostic.message} for "${sourceRecord.name}" (${sourceRecord.source})`,
    sourcePath,
    entityKind,
    recordName: sourceRecord.name,
    recordSource: sourceRecord.source,
    versionIndex,
    rawPayload: validationDiagnostic.rawPayload,
  });
}

function versionFailureCode(code: string): VersionExpansionDiagnosticCode {
  if (code.startsWith("INVALID_PRESERVE")) return "VERSION_PRESERVE_FAILED";
  if (code.startsWith("INVALID_") && code.includes("PRESERVE")) return "VERSION_PRESERVE_FAILED";
  if (code.startsWith("MOD_") || code.includes("_MOD_") || code === "UNKNOWN_MOD_MODE") return "VERSION_MOD_FAILED";
  return "VERSION_COPY_FAILED";
}

export function materializationFailureDiagnostic(
  sourcePath: string,
  entityKind: string,
  sourceRecord: RawRecord,
  versionIndex: number,
  versionName: string,
  versionSource: string,
  modDiagnostics: readonly MaterializationDiagnostic[],
): VersionExpansionDiagnostic {
  const first = modDiagnostics[0];
  return Object.freeze({
    code: first ? versionFailureCode(first.code) : "VERSION_COPY_FAILED",
    severity: "error" as DiagnosticSeverity,
    message: `Failed to materialize _versions[${versionIndex}] "${versionName}" (${versionSource}) for "${sourceRecord.name}" (${sourceRecord.source})`,
    sourcePath,
    entityKind,
    recordName: sourceRecord.name,
    recordSource: sourceRecord.source,
    versionIndex,
    versionName,
    versionSource,
    materializationCode: first?.code,
    fieldTarget: first?.fieldTarget,
    mode: first?.mode,
    rawPayload: first?.rawParam,
    requestedIdentity: cloneStructuredIdentity(first?.requestedIdentity),
    inheritanceChain: first?.inheritanceChain,
    ambiguityCandidates: first?.ambiguityCandidates,
    sourceEntityKind: first?.sourceEntityKind,
    allowedEntityKinds: first?.allowedEntityKinds,
    invalidDiscriminatorField: first?.invalidDiscriminatorField,
    invalidDiscriminatorValue: first?.invalidDiscriminatorValue,
    invalidPreserveKey: first?.invalidPreserveKey,
    invalidMarkerValue: first?.invalidMarkerValue,
    validationReason: first?.validationReason,
    rawPreservePayload: first?.rawPreservePayload,
    modDiagnostics,
  });
}
