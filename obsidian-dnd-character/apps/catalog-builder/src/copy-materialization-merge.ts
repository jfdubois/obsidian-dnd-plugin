import {
  shouldPreserveField,
  type PreservePayload,
} from "./copy-preserve-policy";
import type { CopyModRawRecord } from "./mod-types";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    return cloneObject(value);
  }
  return value;
}

export function cloneObject(record: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    cloned[key] = cloneUnknown(value);
  }
  return cloned;
}

export function cloneRecord(record: CopyModRawRecord): CopyModRawRecord {
  return {
    name: record.name,
    source: record.source,
    remaining: cloneObject(record.remaining),
  };
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        deepFreeze(item);
      }
    }
  } else {
    for (const key of Object.keys(value)) {
      const prop = (value as Record<string, unknown>)[key];
      if (typeof prop === "object" && prop !== null) {
        deepFreeze(prop);
      }
    }
  }
  return value;
}

/**
 * Strips copy directives (_copy, _preserve) from a record's remaining fields.
 * These are resolution-time directives and should not appear in materialized output.
 */
export function stripCopyDirectives(
  remaining: Record<string, unknown>,
): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(remaining)) {
    if (key !== "_copy" && key !== "_preserve" && key !== "_mod") {
      stripped[key] = value;
    }
  }
  return stripped;
}

/**
 * Applies the 5eTools-compatible direct-field overlay merge.
 */
export function applyDirectFieldOverlay(
  baseRemaining: Record<string, unknown>,
  derivedRemaining: Record<string, unknown>,
  preservePayload: PreservePayload,
  entityKind: string,
): void {
  for (const [key, value] of Object.entries(derivedRemaining)) {
    if (key.startsWith("_")) continue;
    if (value === null || value === undefined) continue;
    baseRemaining[key] = cloneUnknown(value);
  }

  for (const key of Object.keys(baseRemaining)) {
    const derivedValue = derivedRemaining[key];

    if (derivedValue === null) {
      delete baseRemaining[key];
      continue;
    }

    if (derivedValue === undefined) {
      if (!shouldPreserveField(key, entityKind, preservePayload)) {
        delete baseRemaining[key];
      }
    }
  }
}
