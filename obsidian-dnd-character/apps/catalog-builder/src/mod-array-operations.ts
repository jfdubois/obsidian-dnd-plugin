import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModAppendArr,
  ModAppendIfNotExistsArr,
  ModInsertArr,
  ModOperationDiagnostic,
  ModPrependArr,
  ModRemoveArr,
  ModRenameArr,
  ModReplaceArr,
  ModRenameEntry,
} from "./mod-types";
import {
  execAppendArr,
  execAppendIfNotExistsArr,
  execInsertArr,
  execPrependArr,
  execRemoveArr,
  execRenameArr,
  execReplaceArr,
} from "./mod-array-executors";

/* ── Helpers ─────────────────────────────────────────────────────── */

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function createDiagnostic(
  code: ModOperationDiagnostic["code"],
  message: string,
  rawParam?: unknown,
): ModOperationDiagnostic {
  return Object.freeze({
    code,
    severity: "error" as DiagnosticSeverity,
    message,
    rawParam,
  });
}

/* ── Validation functions ────────────────────────────────────────── */

function validateAppendArr(raw: unknown): ModAppendArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "appendArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "appendArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `appendArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.items === undefined || r.items === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "appendArr requires 'items' property", raw);
  }
  return Object.freeze({ mode: "appendArr" as const, items: r.items });
}

function validateAppendIfNotExistsArr(
  raw: unknown,
): ModAppendIfNotExistsArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "appendIfNotExistsArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "appendIfNotExistsArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `appendIfNotExistsArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.items === undefined || r.items === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "appendIfNotExistsArr requires 'items' property", raw);
  }
  const items = Array.isArray(r.items) ? [...r.items] : r.items;
  return Object.freeze({ mode: "appendIfNotExistsArr" as const, items });
}

function validateInsertArr(raw: unknown): ModInsertArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "insertArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "insertArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `insertArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.index === undefined || r.index === null || !isNumber(r.index)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "insertArr requires a finite numeric 'index'", raw);
  }
  if (r.items === undefined || r.items === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "insertArr requires 'items' property", raw);
  }
  return Object.freeze({
    mode: "insertArr" as const,
    index: r.index,
    items: r.items,
  });
}

function validatePrependArr(raw: unknown): ModPrependArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "prependArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "prependArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `prependArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.items === undefined || r.items === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "prependArr requires 'items' property", raw);
  }
  return Object.freeze({ mode: "prependArr" as const, items: r.items });
}

function validateRemoveArr(raw: unknown): ModRemoveArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "removeArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "removeArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `removeArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.names === undefined || r.names === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "removeArr requires 'names' property", raw);
  }
  const names: string[] = isString(r.names) ? [r.names] : Array.isArray(r.names) ? r.names : [];
  for (const name of names) {
    if (!isString(name)) {
      return createDiagnostic(
        "INVALID_MOD_PAYLOAD",
        "removeArr names must be strings or an array of strings",
        raw,
      );
    }
  }
  const force = isBoolean(r.force) ? r.force : undefined;
  return Object.freeze({ mode: "removeArr" as const, names: names as readonly string[], force });
}

function validateRenameArr(raw: unknown): ModRenameArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "renameArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "renameArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `renameArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (r.renames === undefined || r.renames === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "renameArr requires 'renames'", raw);
  }
  const rawEntries = Array.isArray(r.renames) ? r.renames : [r.renames];
  const entries: ModRenameEntry[] = [];
  for (const entry of rawEntries) {
    if (!isPlainObject(entry)) {
      return createDiagnostic("INVALID_MOD_PAYLOAD", "renameArr renames entries must be objects", raw);
    }
    const e = entry as Record<string, unknown>;
    if (!isString(e.rename) || !isString(e.with)) {
      return createDiagnostic(
        "INVALID_MOD_PAYLOAD",
        "renameArr renames entries require string 'rename' and 'with' properties",
        raw,
      );
    }
    entries.push(Object.freeze({ rename: e.rename, with: e.with }));
  }
  return Object.freeze({ mode: "renameArr" as const, renames: entries });
}

function validateReplaceArr(raw: unknown): ModReplaceArr | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceArr payload must be a plain object", raw);
  }
  const r = raw as Record<string, unknown>;
  if (r.mode !== "replaceArr") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `replaceArr mode mismatch: got "${r.mode}"`, raw);
  }
  if (!isString(r.replace)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceArr requires a string 'replace' property", raw);
  }
  if (r.items === undefined || r.items === null) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceArr requires 'items' property", raw);
  }
  return Object.freeze({
    mode: "replaceArr" as const,
    replace: r.replace,
    items: r.items,
  });
}

/* ── Unified dispatcher ──────────────────────────────────────────── */

/**
 * Validates and executes a single array-mode mod operation against a
 * cloned field value. Returns the transformed array or a diagnostic.
 */
export function applyArrayModOperation(
  fieldValue: unknown,
  rawPayload: unknown,
): unknown[] | ModOperationDiagnostic {
  const mode = isPlainObject(rawPayload)
    ? (rawPayload as Record<string, unknown>).mode
    : undefined;

  if (!isString(mode)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "Mod operation payload missing 'mode'", rawPayload);
  }

  switch (mode) {
    case "appendArr": {
      const validated = validateAppendArr(rawPayload);
      if ("code" in validated) return validated;
      return execAppendArr(fieldValue, validated);
    }
    case "appendIfNotExistsArr": {
      const validated = validateAppendIfNotExistsArr(rawPayload);
      if ("code" in validated) return validated;
      return execAppendIfNotExistsArr(fieldValue, validated);
    }
    case "insertArr": {
      const validated = validateInsertArr(rawPayload);
      if ("code" in validated) return validated;
      return execInsertArr(fieldValue, validated);
    }
    case "prependArr": {
      const validated = validatePrependArr(rawPayload);
      if ("code" in validated) return validated;
      return execPrependArr(fieldValue, validated);
    }
    case "removeArr": {
      const validated = validateRemoveArr(rawPayload);
      if ("code" in validated) return validated;
      return execRemoveArr(fieldValue, validated);
    }
    case "renameArr": {
      const validated = validateRenameArr(rawPayload);
      if ("code" in validated) return validated;
      return execRenameArr(fieldValue, validated);
    }
    case "replaceArr": {
      const validated = validateReplaceArr(rawPayload);
      if ("code" in validated) return validated;
      return execReplaceArr(fieldValue, validated);
    }
    default:
      return createDiagnostic(
        "UNKNOWN_MOD_MODE",
        `Unknown mod mode: "${mode}"`,
        rawPayload,
      );
  }
}

/* ── Re-export executors for direct use ──────────────────────────── */

export {
  execAppendArr,
  execAppendIfNotExistsArr,
  execInsertArr,
  execPrependArr,
  execRemoveArr,
  execRenameArr,
  execReplaceArr,
} from "./mod-array-executors";
