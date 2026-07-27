import {
  getRecordIdentity,
  type CopyResolverContext,
} from "./copy-resolver";
import {
  materializeCopyWithMods,
  type CopyModRawRecord,
} from "./mod-copy-resolver";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import { expandAbstractVersionEntry } from "./version-abstract-expander";
import {
  invalidVersionRecordDiagnostic,
  invalidVersionsPayloadDiagnostic,
  materializationFailureDiagnostic,
  type VersionExpansionDiagnostic,
} from "./version-diagnostics";
import {
  isVersionRecordValidationDiagnostic,
  validateVersionRecord,
  type ValidatedVersionRecord,
} from "./version-record-validator";

export type {
  VersionExpansionDiagnostic,
  VersionExpansionDiagnosticCode,
} from "./version-diagnostics";

const VERSION_BASE_DISCRIMINATOR_KEYS = new Set([
  "abbreviation",
  "className",
  "classSource",
  "level",
  "name",
  "pantheon",
  "raceName",
  "raceSource",
  "source",
  "subclassName",
  "subclassShortName",
  "subclassSource",
]);

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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

function isCopyDiscriminatorValue(value: unknown): boolean {
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && Number.isInteger(value);
  if (typeof value === "boolean") return true;
  return false;
}

function versionBaseIdentity(base: RawRecord): Record<string, unknown> {
  const identity = getRecordIdentity(base);
  const copyIdentity: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(identity)) {
    if (!VERSION_BASE_DISCRIMINATOR_KEYS.has(key)) continue;
    if (!isCopyDiscriminatorValue(value)) continue;
    copyIdentity[key] = value;
  }
  return copyIdentity;
}

function ensureNoVersions(record: RawRecord): RawRecord {
  const remaining = cloneObject(record.remaining);
  delete remaining._versions;
  return {
    name: record.name,
    source: record.source,
    remaining,
  };
}

function versionRecord(
  base: RawRecord,
  version: ValidatedVersionRecord,
): CopyModRawRecord {
  const copyValue: Record<string, unknown> = {
    ...versionBaseIdentity(base),
    _preserve: version.preserve === undefined
      ? { "*": true }
      : cloneUnknown(version.preserve),
  };
  if (version.mod !== undefined) {
    copyValue._mod = cloneUnknown(version.mod);
  }
  if (version.templates !== undefined) {
    copyValue._templates = cloneUnknown(version.templates);
  }

  const remaining: Record<string, unknown> = {
    _copy: copyValue,
  };
  for (const [key, value] of Object.entries(version.fields)) {
    remaining[key] = cloneUnknown(value);
  }

  return {
    name: version.name,
    source: version.source,
    remaining,
  };
}

interface CollectionExpansionResult {
  records: RawRecord[];
  diagnostics: VersionExpansionDiagnostic[];
}

function expandCollection(
  collection: ValidatedCollection,
  context: CopyResolverContext,
  sourcePath: string,
): CollectionExpansionResult {
  const records: RawRecord[] = [];
  const diagnostics: VersionExpansionDiagnostic[] = [];

  for (const record of collection.records) {
    const baseRecord = baseWithoutVersions(record);
    records.push(baseRecord);
    const rawVersions = record.remaining._versions;
    if (rawVersions === undefined) {
      continue;
    }
    if (!Array.isArray(rawVersions)) {
      diagnostics.push(
        invalidVersionsPayloadDiagnostic(
          sourcePath,
          collection.entityKind,
          record,
          rawVersions,
        ),
      );
      continue;
    }

    rawVersions.forEach((rawVersion, index) => {
      const expandedVersion = expandAbstractVersionEntry(rawVersion, {
        sourcePath,
        entityKind: collection.entityKind,
        recordName: record.name,
        recordSource: record.source,
        versionIndex: index,
      });
      if (!expandedVersion.ok) {
        diagnostics.push(...expandedVersion.diagnostics);
        return;
      }

      expandedVersion.versions.forEach((concreteVersion) => {
        const validatedVersion = validateVersionRecord(concreteVersion, index);
        if (isVersionRecordValidationDiagnostic(validatedVersion)) {
          diagnostics.push(
            invalidVersionRecordDiagnostic(
              sourcePath,
              collection.entityKind,
              record,
              index,
              validatedVersion,
            ),
          );
          return;
        }

        const rawVersionRecord = versionRecord(baseRecord, validatedVersion);
        const resolved = materializeCopyWithMods(rawVersionRecord, context, {
          sourcePath,
          sourceEntityKind: collection.entityKind,
        });
        if (!resolved.ok) {
          diagnostics.push(
            materializationFailureDiagnostic(
              sourcePath,
              collection.entityKind,
              record,
              index,
              validatedVersion.name,
              validatedVersion.source,
              resolved.diagnostics,
            ),
          );
          return;
        }
        records.push(ensureNoVersions(resolved.result.record));
      });
    });
  }

  return { records, diagnostics };
}

export function expandVersionsInFile(
  envelope: ValidatedFileEnvelope,
  sourcePath: string,
): VersionExpansionResult {
  const allRecords: RawRecord[] = [];
  const allDiagnostics: VersionExpansionDiagnostic[] = [];
  const context: CopyResolverContext = {
    validatedFiles: {
      [sourcePath]: envelope,
    },
  };

  for (const collection of envelope.collections) {
    const result = expandCollection(collection, context, sourcePath);
    allRecords.push(...result.records);
    allDiagnostics.push(...result.diagnostics);
  }

  return Object.freeze({
    ok: allDiagnostics.length === 0,
    records: allRecords,
    diagnostics: allDiagnostics,
  });
}

export function expandVersions(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
): VersionExpansionFilesResult {
  const expandedFiles: Record<string, ValidatedFileEnvelope> = {};
  const diagnostics: VersionExpansionDiagnostic[] = [];
  const context: CopyResolverContext = { validatedFiles };

  for (const [sourcePath, envelope] of Object.entries(validatedFiles)) {
    const expandedCollections: ValidatedCollection[] = [];

    for (const collection of envelope.collections) {
      const result = expandCollection(collection, context, sourcePath);
      diagnostics.push(...result.diagnostics);

      expandedCollections.push({
        entityKind: collection.entityKind,
        records: result.records,
        recordCount: result.records.length,
      });
    }

    expandedFiles[sourcePath] = {
      filePath: envelope.filePath,
      collections: expandedCollections,
      totalRecords: expandedCollections.reduce((sum, c) => sum + c.recordCount, 0),
    };
  }

  return Object.freeze({
    ok: diagnostics.length === 0,
    validatedFiles: expandedFiles,
    diagnostics,
  });
}
