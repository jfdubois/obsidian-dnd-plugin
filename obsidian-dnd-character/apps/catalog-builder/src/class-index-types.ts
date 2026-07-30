import type { CopyModRawRecord } from "./mod-types";

/* ── Diagnostic types ──────────────────────────────────────────── */

export type ClassIndexDiagnosticCode =
  | "EXCLUDED_SOURCE"
  | "INVALID_SOURCE"
  | "UNKNOWN_SOURCE"
  | "COPY_RESOLUTION_FAILED"
  | "INVALID_CANONICAL_ID"
  | "MISSING_HIT_DIE"
  | "INVALID_HIT_DIE"
  | "MISSING_PRIMARY_ABILITIES"
  | "MISSING_SAVING_THROW_PROFICIENCIES";

export interface ClassIndexDiagnostic {
  readonly code: ClassIndexDiagnosticCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly recordName: string;
  readonly source?: string;
  readonly sourcePath?: string;
  readonly entityKind?: string;
  readonly recordIndex?: number;
}

/* ── Indexed class entry ───────────────────────────────────────── */

export interface IndexedClassEntry {
  readonly id: string;
  readonly sourceId: string;
  readonly name: string;
  readonly source: string;
  readonly ruleset: "2014" | "2024";
  readonly record: CopyModRawRecord;
  readonly isSubclass: boolean;
  readonly parentId?: string;
  readonly hitDie?: number;
  readonly primaryAbilities: readonly string[];
  readonly savingThrowProficiencies: readonly string[];
  readonly diagnostics: readonly ClassIndexDiagnostic[];
}

/* ── Loader input / output ─────────────────────────────────────── */

import type { CopyResolverContext } from "./copy-resolver";
import type { ValidatedFileEnvelope } from "./raw-boundary";
import type { ClassSourceScopeContext } from "./class-source-scope";

export interface ClassIndexLoaderInput {
  readonly validatedFiles: Record<string, ValidatedFileEnvelope>;
  readonly copyResolverContext: CopyResolverContext;
  readonly sourceScopeContext: ClassSourceScopeContext;
  readonly entityKind: string;
}

export interface ClassIndexLoaderResult {
  readonly classes: readonly IndexedClassEntry[];
  readonly diagnostics: readonly ClassIndexDiagnostic[];
  readonly summary: {
    readonly totalRecords: number;
    readonly indexedClasses: number;
    readonly baseClasses: number;
    readonly subclasses: number;
    readonly excludedRecords: number;
    readonly resolutionFailures: number;
  };
}
