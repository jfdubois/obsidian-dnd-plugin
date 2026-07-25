import type { CopyResolverContext } from "./copy-resolver";
import {
  resolveCopyWithMods,
  type CopyModRawRecord,
} from "./mod-copy-resolver";
import type { ModOperationDiagnostic } from "./mod-types";
import type { DiagnosticSeverity } from "./raw-loader";
import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";

export type VersionExpansionDiagnosticCode =
  | "INVALID_VERSIONS_PAYLOAD"
  | "INVALID_VERSION_RECORD"
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
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawPayload?: unknown;
  readonly modDiagnostics?: readonly ModOperationDiagnostic[];
}

export interface VersionExpansionResult {
  readonly ok: boolean;
  readonly records: readonly RawRecord[];
  readonly diagnostics: readonly VersionExpansionDiagnostic[];
}

export interface VersionExpansionFilesResult {
  readonly ok: boolean;
  readonly validatedFiles: Record<string, ValidatedFileEnvelope>;
  readonly diagnostics: readonly VersionExpansionDiagnostic[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function cloneObject(record: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    cloned[key] = cloneUnknown(value);
  }
  return cloned;
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    return cloneObject(value);
  }
  return value;
}

function baseWithoutVersions(record: RawRecord): RawRecord {
  const remaining = cloneObject(record.remaining);
  delete remaining._versions;
  return {
    name: record.name,
    source: record.source,
    remaining,
  };
}

function diagnostic(
  code: VersionExpansionDiagnosticCode,
  message: string,
  sourcePath: string,
  entityKind: string,
  sourceRecord: RawRecord,
  rawPayload: unknown,
  versionIndex?: number,
): VersionExpansionDiagnostic {
  return Object.freeze({
    code,
    severity: "error" as DiagnosticSeverity,
    message,
    sourcePath,
    entityKind,
    recordName: sourceRecord.name,
    recordSource: sourceRecord.source,
    versionIndex,
    rawPayload,
  });
}

function versionRecord(
  base: RawRecord,
  version: Record<string, unknown>,
): CopyModRawRecord {
  const copyValue: Record<string, unknown> = {
    name: base.name,
    source: base.source,
  };
  if (version._mod !== undefined) {
    copyValue._mod = cloneUnknown(version._mod);
  }

  const remaining: Record<string, unknown> = {
    _copy: copyValue,
  };
  for (const [key, value] of Object.entries(version)) {
    if (key !== "name" && key !== "source" && key !== "_mod") {
      remaining[key] = cloneUnknown(value);
    }
  }

  return {
    name: version.name as string,
    source: version.source as string,
    remaining,
  };
}

function mergeVersionFields(
  record: RawRecord,
  version: Record<string, unknown>,
): RawRecord {
  const remaining = cloneObject(record.remaining);
  for (const [key, value] of Object.entries(version)) {
    if (key !== "name" && key !== "source" && key !== "_mod") {
      remaining[key] = cloneUnknown(value);
    }
  }
  return {
    name: version.name as string,
    source: version.source as string,
    remaining,
  };
}

function modFailureDiagnostic(
  sourcePath: string,
  entityKind: string,
  sourceRecord: RawRecord,
  versionIndex: number,
  modDiagnostics: readonly ModOperationDiagnostic[],
): VersionExpansionDiagnostic {
  const first = modDiagnostics[0];
  return Object.freeze({
    code: "VERSION_MOD_FAILED",
    severity: "error" as DiagnosticSeverity,
    message: `Failed to apply _versions[${versionIndex}] _mod for "${sourceRecord.name}" (${sourceRecord.source})`,
    sourcePath,
    entityKind,
    recordName: sourceRecord.name,
    recordSource: sourceRecord.source,
    versionIndex,
    fieldTarget: first?.fieldTarget,
    mode: first?.mode,
    rawPayload: first?.rawParam,
    modDiagnostics,
  });
}

export function expandVersionsInFile(
  envelope: ValidatedFileEnvelope,
  sourcePath: string,
): VersionExpansionResult {
  const records: RawRecord[] = [];
  const diagnostics: VersionExpansionDiagnostic[] = [];

  for (const record of envelope.records) {
    const baseRecord = baseWithoutVersions(record);
    records.push(baseRecord);
    const rawVersions = record.remaining._versions;
    if (rawVersions === undefined) {
      continue;
    }
    if (!Array.isArray(rawVersions)) {
      diagnostics.push(
        diagnostic(
          "INVALID_VERSIONS_PAYLOAD",
          `_versions for "${record.name}" (${record.source}) must be an array`,
          sourcePath,
          envelope.entityKind,
          record,
          rawVersions,
        ),
      );
      continue;
    }

    const context: CopyResolverContext = {
      validatedFiles: {
        [sourcePath]: {
          entityKind: envelope.entityKind,
          recordCount: 1,
          records: [baseRecord],
        },
      },
    };

    rawVersions.forEach((rawVersion, index) => {
      if (
        !isPlainObject(rawVersion) ||
        !isNonEmptyString(rawVersion.name) ||
        !isNonEmptyString(rawVersion.source)
      ) {
        diagnostics.push(
          diagnostic(
            "INVALID_VERSION_RECORD",
            `_versions[${index}] for "${record.name}" (${record.source}) must be an object with non-empty name and source`,
            sourcePath,
            envelope.entityKind,
            record,
            rawVersion,
            index,
          ),
        );
        return;
      }

      const rawVersionRecord = versionRecord(baseRecord, rawVersion);
      const resolved = resolveCopyWithMods(rawVersionRecord, context, { sourcePath });
      if (!resolved.ok) {
        diagnostics.push(
          modFailureDiagnostic(
            sourcePath,
            envelope.entityKind,
            record,
            index,
            resolved.diagnostics,
          ),
        );
        return;
      }
      records.push(mergeVersionFields(resolved.record, rawVersion));
    });
  }

  return Object.freeze({
    ok: diagnostics.length === 0,
    records,
    diagnostics,
  });
}

export function expandVersions(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
): VersionExpansionFilesResult {
  const expandedFiles: Record<string, ValidatedFileEnvelope> = {};
  const diagnostics: VersionExpansionDiagnostic[] = [];

  for (const [sourcePath, envelope] of Object.entries(validatedFiles)) {
    const expanded = expandVersionsInFile(envelope, sourcePath);
    diagnostics.push(...expanded.diagnostics);
    expandedFiles[sourcePath] = {
      entityKind: envelope.entityKind,
      records: [...expanded.records],
      recordCount: expanded.records.length,
    };
  }

  return Object.freeze({
    ok: diagnostics.length === 0,
    validatedFiles: expandedFiles,
    diagnostics,
  });
}
