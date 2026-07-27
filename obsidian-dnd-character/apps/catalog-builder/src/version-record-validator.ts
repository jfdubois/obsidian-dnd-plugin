import type { DiagnosticSeverity } from "./raw-loader";

export type VersionRecordValidationCode =
  | "INVALID_VERSION_RECORD"
  | "INVALID_VERSION_DIRECTIVE";

export interface ValidatedVersionRecord {
  readonly name: string;
  readonly source: string;
  readonly fields: Record<string, unknown>;
  readonly mod?: unknown;
  readonly preserve?: unknown;
  readonly templates?: unknown;
}

export interface VersionRecordValidationDiagnostic {
  readonly code: VersionRecordValidationCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly rawPayload: unknown;
}

const DISCRIMINATOR_FIELDS = new Set([
  "abbreviation",
  "className",
  "classSource",
  "level",
  "pantheon",
  "raceName",
  "raceSource",
  "subclassName",
  "subclassShortName",
  "subclassSource",
]);

function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidDiscriminatorValue(value: unknown): boolean {
  if (typeof value === "string") return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && Number.isInteger(value);
  if (typeof value === "boolean") return true;
  return false;
}

function diagnostic(
  code: VersionRecordValidationCode,
  message: string,
  rawPayload: unknown,
): VersionRecordValidationDiagnostic {
  return Object.freeze({
    code,
    severity: "error",
    message,
    rawPayload,
  });
}

export function validateVersionRecord(
  rawVersion: unknown,
  versionIndex: number,
): ValidatedVersionRecord | VersionRecordValidationDiagnostic {
  if (!isStrictPlainObject(rawVersion)) {
    return diagnostic(
      "INVALID_VERSION_RECORD",
      `_versions[${versionIndex}] must be a plain object`,
      rawVersion,
    );
  }

  if (!isNonEmptyString(rawVersion.name) || !isNonEmptyString(rawVersion.source)) {
    return diagnostic(
      "INVALID_VERSION_RECORD",
      `_versions[${versionIndex}] must include non-empty string name and source`,
      rawVersion,
    );
  }

  if (rawVersion._mod !== undefined && !isStrictPlainObject(rawVersion._mod)) {
    return diagnostic(
      "INVALID_VERSION_DIRECTIVE",
      `_versions[${versionIndex}]._mod must be a plain object when present`,
      rawVersion._mod,
    );
  }

  if (rawVersion._preserve !== undefined && !isStrictPlainObject(rawVersion._preserve)) {
    return diagnostic(
      "INVALID_VERSION_DIRECTIVE",
      `_versions[${versionIndex}]._preserve must be a plain object when present`,
      rawVersion._preserve,
    );
  }

  if (rawVersion._templates !== undefined && !Array.isArray(rawVersion._templates)) {
    return diagnostic(
      "INVALID_VERSION_DIRECTIVE",
      `_versions[${versionIndex}]._templates must be an array when present`,
      rawVersion._templates,
    );
  }

  for (const [key, value] of Object.entries(rawVersion)) {
    if (!DISCRIMINATOR_FIELDS.has(key)) continue;
    if (!isValidDiscriminatorValue(value)) {
      return diagnostic(
        "INVALID_VERSION_RECORD",
        `_versions[${versionIndex}].${key} must be a non-empty scalar discriminator`,
        value,
      );
    }
  }

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawVersion)) {
    if (key === "name" || key === "source" || key === "_mod" || key === "_preserve" || key === "_templates") {
      continue;
    }
    fields[key] = value;
  }

  return Object.freeze({
    name: rawVersion.name,
    source: rawVersion.source,
    fields,
    mod: rawVersion._mod,
    preserve: rawVersion._preserve,
    templates: rawVersion._templates,
  });
}

export function isVersionRecordValidationDiagnostic(
  value: ValidatedVersionRecord | VersionRecordValidationDiagnostic,
): value is VersionRecordValidationDiagnostic {
  return "code" in value;
}
