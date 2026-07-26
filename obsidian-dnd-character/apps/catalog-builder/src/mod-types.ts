import type { DiagnosticSeverity } from "./raw-loader";

/* ── Known modes registry ─────────────────────────────────────── */

const KNOWN_MOD_MODES: ReadonlySet<string> = new Set([
  "addSenses",
  "addSkills",
  "addSpells",
  "appendArr",
  "appendIfNotExistsArr",
  "insertArr",
  "maxSize",
  "prefixSuffixStringProp",
  "prependArr",
  "removeArr",
  "removeSpells",
  "renameArr",
  "replaceArr",
  "replaceSpells",
  "replaceTxt",
  "scalarAddDc",
  "scalarAddHit",
  "scalarAddProp",
  "scalarMultProp",
  "scalarMultXp",
  "setProp",
]);

export const KNOWN_MOD_MODES_SET: ReadonlySet<string> = KNOWN_MOD_MODES;

/* ── Discriminated union of all supported mod operation payloads ─ */

export type ModOperationPayload =
  | ModAddSenses
  | ModAddSkills
  | ModAddSpells
  | ModAppendArr
  | ModAppendIfNotExistsArr
  | ModInsertArr
  | ModMaxSize
  | ModPrefixSuffixStringProp
  | ModPrependArr
  | ModRemoveArr
  | ModRemoveSpells
  | ModRenameArr
  | ModReplaceArr
  | ModReplaceSpells
  | ModReplaceTxt
  | ModScalarAddDc
  | ModScalarAddHit
  | ModScalarAddProp
  | ModScalarMultProp
  | ModScalarMultXp
  | ModSetProp;

/* ── addSenses ─────────────────────────────────────────────────── */

export interface ModAddSenses {
  readonly mode: "addSenses";
  readonly senses: { readonly type: string; readonly range?: number };
}

/* ── addSkills ─────────────────────────────────────────────────── */

export interface ModAddSkills {
  readonly mode: "addSkills";
  readonly skills: Record<string, number>;
}

/* ── addSpells ─────────────────────────────────────────────────── */

export interface ModAddSpells {
  readonly mode: "addSpells";
  readonly additions: Record<string, ModSpellAddGroup>;
}

export type ModSpellAddGroup =
  | readonly string[]
  | Record<string, ModSpellLevelAddition>;

export interface ModSpellLevelAddition {
  readonly spells: readonly string[];
}

/* ── appendArr ─────────────────────────────────────────────────── */

export interface ModAppendArr {
  readonly mode: "appendArr";
  readonly items: unknown | readonly unknown[];
}

/* ── appendIfNotExistsArr ──────────────────────────────────────── */

export interface ModAppendIfNotExistsArr {
  readonly mode: "appendIfNotExistsArr";
  readonly items: string | readonly string[];
}

/* ── insertArr ─────────────────────────────────────────────────── */

export interface ModInsertArr {
  readonly mode: "insertArr";
  readonly index: number;
  readonly items: unknown | readonly unknown[];
}

/* ── maxSize ───────────────────────────────────────────────────── */

export interface ModMaxSize {
  readonly mode: "maxSize";
  readonly max: string;
}

/* ── prefixSuffixStringProp ────────────────────────────────────── */

export interface ModPrefixSuffixStringProp {
  readonly mode: "prefixSuffixStringProp";
  readonly prop: string;
  readonly prefix: string;
  readonly suffix: string;
}

/* ── prependArr ────────────────────────────────────────────────── */

export interface ModPrependArr {
  readonly mode: "prependArr";
  readonly items: unknown | readonly unknown[];
}

/* ── removeArr ─────────────────────────────────────────────────── */

export interface ModRemoveArr {
  readonly mode: "removeArr";
  readonly names: string | readonly string[];
  readonly force?: boolean;
}

/* ── removeSpells ──────────────────────────────────────────────── */

export interface ModRemoveSpells {
  readonly mode: "removeSpells";
  readonly removals: Record<string, ModSpellRemoveGroup>;
}

export type ModSpellRemoveGroup =
  | readonly string[]
  | Record<string, readonly string[]>;

/* ── renameArr ─────────────────────────────────────────────────── */

export interface ModRenameArr {
  readonly mode: "renameArr";
  readonly renames: readonly Readonly<ModRenameEntry>[];
}

export interface ModRenameEntry {
  readonly rename: string;
  readonly with: string;
}

/* ── replaceArr ────────────────────────────────────────────────── */

export interface ModReplaceArr {
  readonly mode: "replaceArr";
  readonly replace: string;
  readonly items: unknown | readonly unknown[];
}

/* ── replaceSpells ─────────────────────────────────────────────── */

export interface ModReplaceSpells {
  readonly mode: "replaceSpells";
  readonly replacements: Record<string, ModSpellReplaceGroup>;
}

export type ModSpellReplaceGroup =
  | readonly ModSpellReplacement[]
  | Record<string, readonly ModSpellReplacement[]>;

export interface ModSpellReplacement {
  readonly replace: string;
  readonly with: string;
}

/* ── replaceTxt ────────────────────────────────────────────────── */

export interface ModReplaceTxt {
  readonly mode: "replaceTxt";
  readonly replace: string;
  readonly with: string;
  readonly flags?: string;
}

/* ── scalarAddDc ───────────────────────────────────────────────── */

export interface ModScalarAddDc {
  readonly mode: "scalarAddDc";
  readonly scalar: number;
}

/* ── scalarAddHit ──────────────────────────────────────────────── */

export interface ModScalarAddHit {
  readonly mode: "scalarAddHit";
  readonly scalar: number;
}

/* ── scalarAddProp ─────────────────────────────────────────────── */

export interface ModScalarAddProp {
  readonly mode: "scalarAddProp";
  readonly scalar: number;
  readonly prop: string;
}

/* ── scalarMultProp ────────────────────────────────────────────── */

export interface ModScalarMultProp {
  readonly mode: "scalarMultProp";
  readonly prop: string;
  readonly scalar: number;
  readonly floor?: boolean;
}

/* ── scalarMultXp ──────────────────────────────────────────────── */

export interface ModScalarMultXp {
  readonly mode: "scalarMultXp";
  readonly scalar: number;
  readonly floor?: boolean;
}

/* ── setProp ───────────────────────────────────────────────────── */

export interface ModSetProp {
  readonly mode: "setProp";
  readonly prop: string;
  readonly value: unknown;
}

/* ── Validation Error ──────────────────────────────────────────── */

export interface ModValidationError {
  readonly __brand: "ModValidationError";
  readonly raw: unknown;
  readonly message: string;
}

/* ── Diagnostic types ──────────────────────────────────────────── */

export interface ModOperationDiagnostic {
  readonly code: ModDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sourcePath?: string;
  readonly entityName?: string;
  readonly entitySource?: string;
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawParam?: unknown;
}

export type ModDiagnosticCode =
  | "UNKNOWN_MOD_MODE"
  | "INVALID_MOD_PAYLOAD"
  | "MOD_FIELD_TARGET_MISSING"
  | "MOD_EXECUTION_ERROR";

/* ── Materialization diagnostic union ────────────────────────────

   The copy resolver emits CopyDiagnosticCode values. The mod resolver
   emits ModDiagnosticCode values. Materialization diagnostics must
   carry either code type without unsafe casting.
───────────────────────────────────────────────────────────────────── */

import type { CopyDiagnosticCode } from "./copy-resolver";

/** Raw record shape used by the copy+mod materialization pipeline. */
export interface CopyModRawRecord {
  readonly name: string;
  readonly source: string;
  readonly remaining: Record<string, unknown>;
}

export type MaterializationDiagnosticCode = CopyDiagnosticCode | ModDiagnosticCode;

export interface MaterializationDiagnostic {
  readonly code: MaterializationDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly sourcePath?: string;
  readonly entityName?: string;
  readonly entitySource?: string;
  readonly fieldTarget?: string;
  readonly mode?: string;
  readonly rawParam?: unknown;
}

/* ── Materialized resolved record contract ───────────────────────

   The authoritative output of copy+mod materialization. Carries the
   final record, the inheritance chain, and any diagnostics emitted
   during resolution. Replaces the informal record+diagnostics tuple.
───────────────────────────────────────────────────────────────────── */

import type { CopyChainStep } from "./copy-resolver";

export interface MaterializedResolvedRecord {
  /** The final materialized record with all _copy and _mod applied. */
  readonly record: CopyModRawRecord;
  /** Ordered inheritance chain from immediate base to root. */
  readonly inheritanceChain: readonly CopyChainStep[];
  /** Diagnostics emitted during materialization (warnings only on success). */
  readonly diagnostics: readonly MaterializationDiagnostic[];
}

export interface ModApplyResult {
  readonly record: Record<string, unknown>;
  readonly diagnostics: readonly ModOperationDiagnostic[];
}

/* ── Raw _mod block shape ──────────────────────────────────────── */

/**
 * The raw _mod block as it appears inside a _copy object.
 * Keys are field targets, values are operations or arrays of operations.
 */
export interface RawModBlock {
  readonly [fieldTarget: string]: unknown;
}
