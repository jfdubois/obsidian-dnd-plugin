import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary";
import type { CopyModRawRecord } from "./mod-types";
import type { ClassIndexDiagnostic, ClassIndexDiagnosticCode } from "./class-index-types";

/* ── Diagnostic builder ────────────────────────────────────────── */

export function makeDiagnostic(
  code: ClassIndexDiagnosticCode,
  message: string,
  recordName: string,
  opts: { sourcePath?: string; entityKind?: string; recordIndex?: number },
  source?: string,
): ClassIndexDiagnostic {
  const isError = [
    "INVALID_SOURCE",
    "UNKNOWN_SOURCE",
    "COPY_RESOLUTION_FAILED",
    "INVALID_CANONICAL_ID",
    "MISSING_HIT_DIE",
    "INVALID_HIT_DIE",
    "MISSING_PRIMARY_ABILITIES",
    "MISSING_SAVING_THROW_PROFICIENCIES",
  ].includes(code);

  return Object.freeze({
    code,
    severity: isError ? "error" : "warning",
    message,
    recordName,
    source,
    sourcePath: opts.sourcePath,
    entityKind: opts.entityKind,
    recordIndex: opts.recordIndex,
  });
}

/* ── Subclass detection ────────────────────────────────────────── */

export function isSubclassRecord(record: CopyModRawRecord): boolean {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return true;
  }
  return false;
}

export function extractParentId(record: CopyModRawRecord): string | undefined {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return parent;
  }
  return undefined;
}

/* ── Field extractors ──────────────────────────────────────────── */

export function extractHitDie(remaining: Record<string, unknown>): number | undefined {
  const hitDie = remaining.hitdie;
  if (typeof hitDie === "number" && Number.isInteger(hitDie) && hitDie > 0) {
    return hitDie;
  }
  return undefined;
}

export function extractAbilityArray(remaining: Record<string, unknown>, field: string): readonly string[] {
  const value = remaining[field];
  if (Array.isArray(value)) {
    return Object.freeze(value.filter((v) => typeof v === "string" && v.length > 0) as string[]);
  }
  return Object.freeze([]);
}

/* ── Record collection ─────────────────────────────────────────── */

export interface CollectedClassRecord {
  readonly record: RawRecord;
  readonly sourcePath: string;
  readonly entityKind: string;
  readonly recordIndex: number;
}

export function collectClassRecords(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  entityKind: string,
): readonly CollectedClassRecord[] {
  const results: CollectedClassRecord[] = [];

  for (const [filePath, envelope] of Object.entries(validatedFiles)) {
    for (const collection of envelope.collections) {
      if (collection.entityKind !== entityKind) continue;

      for (let i = 0; i < collection.records.length; i++) {
        const record = collection.records[i];
        if (record === undefined) continue;
        results.push({
          record,
          sourcePath: filePath,
          entityKind: collection.entityKind,
          recordIndex: i,
        });
      }
    }
  }

  return Object.freeze(results);
}
