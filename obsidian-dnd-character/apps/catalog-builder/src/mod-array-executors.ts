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
} from "./mod-types";

/* ── Helpers ─────────────────────────────────────────────────────── */

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

/* ── Execution functions ─────────────────────────────────────────── */

/**
 * Append items to the end of an array field value.
 * `items` may be a single element or an array of elements.
 */
export function execAppendArr(
  fieldValue: unknown,
  payload: ModAppendArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "appendArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  const items = Array.isArray(payload.items) ? payload.items : [payload.items];
  return [...cloned, ...items.map(deepClone)];
}

/**
 * Append string items only if they don't already exist in the array.
 */
export function execAppendIfNotExistsArr(
  fieldValue: unknown,
  payload: ModAppendIfNotExistsArr,
): string[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "appendIfNotExistsArr target field is not an array",
      fieldValue,
    );
  }
  const existing = fieldValue.filter((x: unknown) => typeof x === "string") as string[];
  const cloned = deepClone(existing);
  for (const item of payload.items) {
    if (!cloned.includes(item)) {
      cloned.push(item);
    }
  }
  return cloned;
}

/**
 * Insert items at a specific index in the array.
 * Negative indices are clamped to 0; indices past the end append.
 */
export function execInsertArr(
  fieldValue: unknown,
  payload: ModInsertArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "insertArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  const index = Math.max(0, Math.min(payload.index, cloned.length));
  const items = Array.isArray(payload.items) ? payload.items : [payload.items];
  const clonedItems = items.map(deepClone);
  cloned.splice(index, 0, ...clonedItems);
  return cloned;
}

/**
 * Prepend items to the beginning of an array field value.
 * `items` may be a single element or an array of elements.
 */
export function execPrependArr(
  fieldValue: unknown,
  payload: ModPrependArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "prependArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  const items = Array.isArray(payload.items) ? payload.items : [payload.items];
  return [...items.map(deepClone), ...cloned];
}

/**
 * Remove items whose `name` property matches any of the given names.
 */
export function execRemoveArr(
  fieldValue: unknown,
  payload: ModRemoveArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "removeArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  return cloned.filter((item: unknown) => {
    if (!isPlainObject(item)) return true;
    const itemName = item.name;
    if (!isString(itemName)) return true;
    return !payload.names.includes(itemName);
  });
}

/**
 * Rename the `name` property of items matching the rename entries.
 */
export function execRenameArr(
  fieldValue: unknown,
  payload: ModRenameArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "renameArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  return cloned.map((item: unknown) => {
    if (!isPlainObject(item) || !isString(item.name)) return item;
    const entry = payload.renames.find((e) => e.rename === item.name);
    if (!entry) return item;
    const renamed = { ...item };
    renamed.name = entry.with;
    return renamed;
  });
}

/**
 * Replace the first item whose `name` matches `replace` with `items`.
 * `items` may be a single element or an array of elements.
 */
export function execReplaceArr(
  fieldValue: unknown,
  payload: ModReplaceArr,
): unknown[] | ModOperationDiagnostic {
  if (!Array.isArray(fieldValue)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "replaceArr target field is not an array",
      fieldValue,
    );
  }
  const cloned = deepClone(fieldValue);
  const idx = cloned.findIndex((item: unknown) => {
    return isPlainObject(item) && isString(item.name) && item.name === payload.replace;
  });
  if (idx === -1) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      `replaceArr could not find item with name "${payload.replace}"`,
      fieldValue,
    );
  }
  const items = Array.isArray(payload.items) ? payload.items : [payload.items];
  const clonedItems = items.map(deepClone);
  cloned.splice(idx, 1, ...clonedItems);
  return cloned;
}
