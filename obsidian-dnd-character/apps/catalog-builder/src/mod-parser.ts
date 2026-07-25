import type { DiagnosticSeverity } from "./raw-loader";

/* ── _mod Operation Types ────────────────────────────────────────

   The _mod field in 5eTools JSON describes modifications applied to
   a copied entity. Each key in the _mod object targets a specific
   field (or _ for top-level, * for all text), and the value is
   either a single operation or an array of operations.

   This module defines the discriminated union of all known operation
   modes, provides parsing and validation functions, and rejects
   unknown modes as build failures.
──────────────────────────────────────────────────────────────────── */

/* ── Array modification operations ─────────────────────────────── */

export interface AppendArrMod {
  readonly mode: "appendArr";
  readonly items: unknown | unknown[];
}

export interface PrependArrMod {
  readonly mode: "prependArr";
  readonly items: unknown | unknown[];
}

export interface AppendIfNotExistsArrMod {
  readonly mode: "appendIfNotExistsArr";
  readonly items: unknown[];
}

export interface InsertArrMod {
  readonly mode: "insertArr";
  readonly index: number;
  readonly items: unknown;
}

export interface RemoveArrMod {
  readonly mode: "removeArr";
  readonly names: string;
}

export interface RenameArrMod {
  readonly mode: "renameArr";
  readonly renames: Record<string, string>;
}

export interface ReplaceArrMod {
  readonly mode: "replaceArr";
  readonly replace: string;
  readonly items: unknown;
}

/* ── Text replacement operations ───────────────────────────────── */

export interface ReplaceTxtMod {
  readonly mode: "replaceTxt";
  readonly replace: string;
  readonly with: string;
  readonly flags?: string;
}

/* ── Spell operations ──────────────────────────────────────────── */

export interface AddSpellsMod {
  readonly mode: "addSpells";
  readonly spells: Record<string, unknown>;
}

export interface RemoveSpellsMod {
  readonly mode: "removeSpells";
  readonly daily?: Record<string, string[]>;
}

export interface ReplaceSpellsMod {
  readonly mode: "replaceSpells";
  readonly spells: Record<string, unknown[]>;
}

/* ── Sensory / skill operations ────────────────────────────────── */

export interface AddSensesMod {
  readonly mode: "addSenses";
  readonly senses: { readonly type: string; readonly range: number };
}

export interface AddSkillsMod {
  readonly mode: "addSkills";
  readonly skills: Record<string, number>;
}

/* ── Scalar operations ─────────────────────────────────────────── */

export interface ScalarAddDcMod {
  readonly mode: "scalarAddDc";
  readonly scalar: number;
}

export interface ScalarAddHitMod {
  readonly mode: "scalarAddHit";
  readonly scalar: number;
}

export interface ScalarAddPropMod {
  readonly mode: "scalarAddProp";
  readonly scalar: number;
  readonly prop: string;
}

export interface ScalarMultPropMod {
  readonly mode: "scalarMultProp";
  readonly prop: string;
  readonly scalar: number;
  readonly floor?: boolean;
}

export interface ScalarMultXpMod {
  readonly mode: "scalarMultXp";
  readonly scalar: number;
  readonly floor?: boolean;
}

/* ── Size / property operations ────────────────────────────────── */

export interface MaxSizeMod {
  readonly mode: "maxSize";
  readonly max: string;
}

export interface SetPropMod {
  readonly mode: "setProp";
  readonly prop: string;
  readonly value: unknown;
}

export interface PrefixSuffixStringPropMod {
  readonly mode: "prefixSuffixStringProp";
  readonly prop: string;
  readonly prefix: string;
  readonly suffix: string;
}

/* ── Discriminated union of all known _mod operations ──────────── */

export type KnownModOperation =
  | AppendArrMod
  | PrependArrMod
  | AppendIfNotExistsArrMod
  | InsertArrMod
  | RemoveArrMod
  | RenameArrMod
  | ReplaceArrMod
  | ReplaceTxtMod
  | AddSpellsMod
  | RemoveSpellsMod
  | ReplaceSpellsMod
  | AddSensesMod
  | AddSkillsMod
  | ScalarAddDcMod
  | ScalarAddHitMod
  | ScalarAddPropMod
  | ScalarMultPropMod
  | ScalarMultXpMod
  | MaxSizeMod
  | SetPropMod
  | PrefixSuffixStringPropMod;

/* ── Raw _mod block structure ──────────────────────────────────── */

/** A single raw operation object as it appears in 5eTools data. */
export interface RawModOperation {
  readonly mode: string;
  readonly [key: string]: unknown;
}

/** A _mod block maps field targets to operations (single or array). */
export interface RawModBlock {
  readonly [fieldTarget: string]: RawModOperation | RawModOperation[];
}

/** Parsed _mod block with validated operations. */
export interface ParsedModBlock {
  readonly [fieldTarget: string]: readonly ParsedModOperation[];
}

/** A parsed operation with the field target it applies to. */
export interface ParsedModOperation {
  readonly fieldTarget: string;
  readonly operation: KnownModOperation;
}

/** Diagnostic emitted when an unknown _mod operation mode is found. */
export interface UnknownModDiagnostic {
  readonly code: "UNKNOWN_MOD_MODE";
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly unknownMode: string;
  readonly fieldTarget: string;
  readonly rawOperation: unknown;
}

/* ── Known mode registry ───────────────────────────────────────── */

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

export const KNOWN_MOD_OPERATION_MODES: ReadonlySet<string> = KNOWN_MOD_MODES;

/* ── Helpers ───────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Checks whether a mode string is a known _mod operation mode.
 */
export function isKnownModMode(mode: unknown): mode is string {
  return typeof mode === "string" && KNOWN_MOD_MODES.has(mode);
}

/**
 * Validates a raw _mod operation object and returns it as a typed
 * KnownModOperation, or an UnknownModDiagnostic if the mode is
 * unrecognized.
 */
export function parseModOperation(
  raw: unknown,
  fieldTarget: string,
): KnownModOperation | UnknownModDiagnostic {
  if (!isPlainObject(raw)) {
    return {
      code: "UNKNOWN_MOD_MODE",
      severity: "error",
      message: `Invalid _mod operation at field "${fieldTarget}": expected an object with a "mode" field, got ${typeof raw}`,
      unknownMode: "invalid",
      fieldTarget,
      rawOperation: raw,
    };
  }

  const rawOp = raw as Record<string, unknown>;
  const mode = rawOp.mode;

  if (typeof mode !== "string") {
    return {
      code: "UNKNOWN_MOD_MODE",
      severity: "error",
      message: `Invalid _mod operation at field "${fieldTarget}": "mode" must be a string, got ${typeof mode}`,
      unknownMode: String(mode),
      fieldTarget,
      rawOperation: raw,
    };
  }

  if (!KNOWN_MOD_MODES.has(mode)) {
    return {
      code: "UNKNOWN_MOD_MODE",
      severity: "error",
      message: `Unknown _mod operation mode "${mode}" at field "${fieldTarget}". Known modes: ${[...KNOWN_MOD_MODES].sort().join(", ")}`,
      unknownMode: mode,
      fieldTarget,
      rawOperation: raw,
    };
  }

  // The mode is known — return the raw object cast to the discriminated union.
  // Full structural validation of operation-specific fields can be added
  // in future tasks as each operation family is implemented.
  return raw as unknown as KnownModOperation;
}

/**
 * Parses a complete _mod block, expanding both single operations and
 * arrays of operations per field target. Returns parsed operations
 * and any diagnostics for unknown modes.
 */
export function parseModBlock(
  rawMod: unknown,
): {
  readonly operations: readonly ParsedModOperation[];
  readonly diagnostics: readonly UnknownModDiagnostic[];
} {
  if (!isPlainObject(rawMod)) {
    return {
      operations: [],
      diagnostics: [
        {
          code: "UNKNOWN_MOD_MODE",
          severity: "error",
          message: `Invalid _mod block: expected an object, got ${typeof rawMod}`,
          unknownMode: "invalid",
          fieldTarget: "(root)",
          rawOperation: rawMod,
        },
      ],
    };
  }

  const operations: ParsedModOperation[] = [];
  const diagnostics: UnknownModDiagnostic[] = [];

  for (const [fieldTarget, value] of Object.entries(rawMod)) {
    const ops: RawModOperation[] = Array.isArray(value)
      ? (value as RawModOperation[])
      : [value as RawModOperation];

    for (const rawOp of ops) {
      const result = parseModOperation(rawOp, fieldTarget);
      if (isUnknownModDiagnostic(result)) {
        diagnostics.push(result);
      } else {
        operations.push({
          fieldTarget,
          operation: result,
        });
      }
    }
  }

  return {
    operations: Object.freeze(operations),
    diagnostics: Object.freeze(diagnostics),
  };
}

/**
 * Type guard for UnknownModDiagnostic.
 */
export function isUnknownModDiagnostic(
  result: unknown,
): result is UnknownModDiagnostic {
  return (
    isPlainObject(result) &&
    (result as Record<string, unknown>).code === "UNKNOWN_MOD_MODE"
  );
}

/**
 * Type guard for KnownModOperation.
 */
export function isKnownModOperation(
  result: unknown,
): result is KnownModOperation {
  return (
    isPlainObject(result) &&
    isKnownModMode((result as Record<string, unknown>).mode)
  );
}

/**
 * Checks whether a raw value is a valid _mod block structure.
 */
export function isRawModBlock(value: unknown): value is RawModBlock {
  if (!isPlainObject(value)) {
    return false;
  }
  for (const entry of Object.values(value)) {
    const ops = Array.isArray(entry) ? entry : [entry];
    for (const op of ops) {
      if (!isPlainObject(op) || typeof (op as Record<string, unknown>).mode !== "string") {
        return false;
      }
    }
  }
  return true;
}
