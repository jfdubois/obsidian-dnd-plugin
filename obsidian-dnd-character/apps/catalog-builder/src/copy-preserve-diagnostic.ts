import type {
  PreserveKeyDiagnostic,
  PreserveMarkerDiagnostic,
  PreservePayloadDiagnostic,
  PreserveValidationReason,
} from "./copy-preserve-policy";

/**
 * Strict plain-object check. Only accepts objects whose prototype is Object.prototype or null.
 * Rejects Date, Map, Set, RegExp, class instances, custom prototypes, functions.
 */
export function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Checks whether a marker value is strictly boolean true.
 * Rejects: false, 1, 0, "true", other strings, null, arrays, objects, undefined.
 */
export function isValidMarkerValue(value: unknown): value is true {
  return value === true;
}

export function createPayloadDiagnostic(
  reason: PreserveValidationReason,
  message: string,
  rawPreservePayload: unknown,
): PreservePayloadDiagnostic {
  return Object.freeze({
    code: "INVALID_PRESERVE_PAYLOAD",
    severity: "error",
    message,
    reason,
    rawPreservePayload,
    validationReason: reason,
  });
}

export function createKeyDiagnostic(
  reason: PreserveValidationReason,
  message: string,
  rawPreservePayload: unknown,
  invalidPreserveKey: string,
): PreserveKeyDiagnostic {
  return Object.freeze({
    code: "INVALID_PRESERVE_KEY",
    severity: "error",
    message,
    reason,
    rawPreservePayload,
    invalidPreserveKey,
    validationReason: reason,
  });
}

export function createMarkerDiagnostic(
  reason: PreserveValidationReason,
  message: string,
  rawPreservePayload: unknown,
  invalidMarkerValue: unknown,
  invalidPreserveKey?: string,
): PreserveMarkerDiagnostic {
  return Object.freeze({
    code: "INVALID_PRESERVE_MARKER",
    severity: "error",
    message,
    reason,
    rawPreservePayload,
    invalidMarkerValue,
    invalidPreserveKey,
    validationReason: reason,
  });
}
