import type { DiagnosticSeverity } from "./raw-loader";

/* ── Types ─────────────────────────────────────────────────────── */

/** Valid marker value for a _copy._preserve entry: only boolean true. */
export type PreserveMarkerValue = true;

/** Valid _copy._preserve payload: plain object mapping field names to boolean true. */
export interface PreservePayload {
  readonly [fieldName: string]: PreserveMarkerValue;
}

/** Structured diagnostic emitted when a _copy._preserve payload fails validation. */
export type PreserveValidationDiagnostic =
  | PreservePayloadDiagnostic
  | PreserveKeyDiagnostic
  | PreserveMarkerDiagnostic;

interface PreservePayloadDiagnostic {
  readonly code: "INVALID_PRESERVE_PAYLOAD";
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly reason: PreserveValidationReason;
  readonly rawPreservePayload: unknown;
  readonly validationReason: string;
}

interface PreserveKeyDiagnostic {
  readonly code: "INVALID_PRESERVE_KEY";
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly reason: PreserveValidationReason;
  readonly rawPreservePayload: unknown;
  readonly invalidPreserveKey: string;
  readonly validationReason: string;
}

interface PreserveMarkerDiagnostic {
  readonly code: "INVALID_PRESERVE_MARKER";
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly reason: PreserveValidationReason;
  readonly rawPreservePayload: unknown;
  readonly invalidMarkerValue: unknown;
  readonly invalidPreserveKey?: string;
  readonly validationReason: string;
}

export type PreserveValidationReason =
  | "NOT_PLAIN_OBJECT"
  | "INVALID_MARKER_TYPE"
  | "INVALID_MARKER_VALUE"
  | "EMPTY_FIELD_KEY"
  | "PROTOTYPE_SENSITIVE_KEY"
  | "UNKNOWN_FIELD_KEY"
  | "CROSS_ENTITY_KEY";

/** Result of validating a _copy._preserve payload. */
export type PreserveValidationResult =
  | { readonly valid: true; readonly payload: PreservePayload }
  | { readonly valid: false; readonly diagnostics: readonly PreserveValidationDiagnostic[] };

/* ── Preserve-gated field sets ─────────────────────────────────── */

/**
 * Generic fields that require an explicit _preserve directive to be copied
 * from the base during a _copy merge. Matches 5eTools _MERGE_REQUIRES_PRESERVE_BASE.
 */
const PRESERVE_BASE_FIELDS: ReadonlySet<string> = new Set([
  "page",
  "otherSources",
  "referenceSources",
  "srd",
  "srd52",
  "basicRules",
  "basicRules2024",
  "reprintedAs",
  "hasFluff",
  "hasFluffImages",
  "hasToken",
  "tokenCredit",
  "tokenCustom",
  "foundryTokenScale",
  "altArt",
  "_versions",
]);

/**
 * Entity-specific preserve-gated fields. Maps entity kind to additional fields
 * beyond the base set. Matches 5eTools per-entity _MERGE_REQUIRES_PRESERVE.
 */
const PRESERVE_ENTITY_FIELDS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["monster", new Set(["legendaryGroup", "environment", "soundClip", "altArt", "variant", "dragonCastingColor", "familiar"])],
  ["item", new Set(["lootTables", "tier"])],
  ["itemGroup", new Set(["lootTables", "tier"])],
  ["magicvariant", new Set(["lootTables", "tier"])],
]);

/** Keys that must not appear in a _copy._preserve payload. */
const PROTOTYPE_SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  "constructor",
  "__proto__",
  "prototype",
]);

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Strict plain-object check. Only accepts objects whose prototype is Object.prototype or null.
 * Rejects Date, Map, Set, RegExp, class instances, custom prototypes, functions.
 */
function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
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
function isValidMarkerValue(value: unknown): value is true {
  return value === true;
}

function createPayloadDiagnostic(
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

function createKeyDiagnostic(
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

function createMarkerDiagnostic(
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

/**
 * Validates a _copy._preserve payload from unknown input.
 * Returns structured diagnostics instead of throwing.
 *
 * Accepts:
 *   - Strict plain object (Object.prototype or null prototype)
 *   - String keys mapping to boolean true markers
 *   - The wildcard "*" key is allowed
 *   - Keys must be valid for the given entity kind
 *
 * Rejects:
 *   - Non-plain-object payloads (arrays, null, primitives, Date, Map, Set, RegExp, class instances)
 *   - Marker values that are not boolean true
 *   - Empty string keys
 *   - Prototype-sensitive keys
 *   - Unknown or cross-entity keys
 */
export function validatePreservePayload(
  rawValue: unknown,
  entityKind?: string,
): PreserveValidationResult {
  if (!isStrictPlainObject(rawValue)) {
    return {
      valid: false,
      diagnostics: Object.freeze([
        createPayloadDiagnostic(
          "NOT_PLAIN_OBJECT",
          `_copy._preserve must be a plain object, got ${Array.isArray(rawValue) ? "array" : rawValue === null ? "null" : typeof rawValue}`,
          rawValue,
        ),
      ]),
    };
  }

  const diagnostics: PreserveValidationDiagnostic[] = [];
  const payload: Record<string, true> = {};

  // Build allowed keys set for entity-kind-aware validation
  const allowedKeys = new Set<string>(["*"]);
  for (const key of PRESERVE_BASE_FIELDS) {
    allowedKeys.add(key);
  }
  if (entityKind) {
    const entityFields = PRESERVE_ENTITY_FIELDS.get(entityKind);
    if (entityFields) {
      for (const key of entityFields) {
        allowedKeys.add(key);
      }
    }
  }

  // Check prototype-sensitive keys that may not appear in Object.entries
  for (const sensitiveKey of PROTOTYPE_SENSITIVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawValue, sensitiveKey)) {
      diagnostics.push(
        createKeyDiagnostic(
          "PROTOTYPE_SENSITIVE_KEY",
          `_copy._preserve contains prototype-sensitive key "${sensitiveKey}"`,
          rawValue,
          sensitiveKey,
        ),
      );
    }
  }

  for (const [key, value] of Object.entries(rawValue)) {
    // Empty key check
    if (key.length === 0) {
      diagnostics.push(
        createKeyDiagnostic(
          "EMPTY_FIELD_KEY",
          `_copy._preserve contains an empty string field key`,
          rawValue,
          key,
        ),
      );
      continue;
    }

    // Prototype-sensitive key check (from Object.entries)
    if (PROTOTYPE_SENSITIVE_KEYS.has(key)) {
      diagnostics.push(
        createKeyDiagnostic(
          "PROTOTYPE_SENSITIVE_KEY",
          `_copy._preserve contains prototype-sensitive key "${key}"`,
          rawValue,
          key,
        ),
      );
      continue;
    }

    // Entity-kind-aware key validation
    if (entityKind && !allowedKeys.has(key)) {
      // Check if it's a cross-entity key
      let isCrossEntity = false;
      for (const [, fields] of PRESERVE_ENTITY_FIELDS) {
        if (fields.has(key)) {
          isCrossEntity = true;
          break;
        }
      }
      if (isCrossEntity) {
        diagnostics.push(
          createKeyDiagnostic(
            "CROSS_ENTITY_KEY",
            `_copy._preserve["${key}"] is not allowed for entity kind "${entityKind}"`,
            rawValue,
            key,
          ),
        );
      } else {
        diagnostics.push(
          createKeyDiagnostic(
            "UNKNOWN_FIELD_KEY",
            `_copy._preserve["${key}"] is not a recognized preserve-gated field for entity kind "${entityKind}"`,
            rawValue,
            key,
          ),
        );
      }
      continue;
    }

    // Marker value validation: only boolean true
    if (!isValidMarkerValue(value)) {
      diagnostics.push(
        createMarkerDiagnostic(
          "INVALID_MARKER_VALUE",
          `_copy._preserve["${key}"] has an invalid marker value: ${JSON.stringify(value)} (expected boolean true)`,
          rawValue,
          value,
          key,
        ),
      );
      continue;
    }

    payload[key] = value;
  }

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics: Object.freeze(diagnostics) };
  }

  return { valid: true, payload: Object.freeze(payload) as PreservePayload };
}

/* ── Entity-kind-aware preserve policy ─────────────────────────── */

/**
 * Returns the complete set of preserve-gated field names for a given entity kind.
 * Includes both the base fields and any entity-specific fields.
 */
export function getPreserveGatedFields(entityKind: string): ReadonlySet<string> {
  const entityFields = PRESERVE_ENTITY_FIELDS.get(entityKind);
  if (entityFields === undefined) {
    return PRESERVE_BASE_FIELDS;
  }
  return new Set([...PRESERVE_BASE_FIELDS, ...entityFields]);
}

/**
 * Checks whether a field name is preserve-gated for the given entity kind.
 */
export function isFieldPreserveGated(fieldName: string, entityKind: string): boolean {
  return getPreserveGatedFields(entityKind).has(fieldName);
}

/**
 * Determines whether a field should be inherited from the base during a _copy merge,
 * based on the validated preserve payload and entity kind.
 *
 * Returns true if the field value should be copied from base to derived.
 * Returns false if the field should be omitted (deleted) from the result.
 *
 * Logic (matches 5eTools utils.js:6174-6176):
 *   - If the field is NOT preserve-gated → always copy
 *   - If the field IS preserve-gated:
 *     - Wildcard "*" in payload → copy
 *     - Field name explicitly in payload → copy
 *     - Otherwise → do not copy
 */
export function shouldPreserveField(
  fieldName: string,
  entityKind: string,
  preservePayload: PreservePayload,
): boolean {
  const gatedFields = getPreserveGatedFields(entityKind);
  if (!gatedFields.has(fieldName)) {
    return true;
  }

  // Wildcard allows all preserve-gated fields
  if (preservePayload["*"] !== undefined) {
    return true;
  }

  // Explicit field name allows that specific field
  if (preservePayload[fieldName] !== undefined) {
    return true;
  }

  return false;
}

/**
 * Returns the set of allowed field names from a validated preserve payload.
 * Used to compute which preserve-gated fields are allowed for inheritance.
 */
export function computePreserveAllowance(preservePayload: PreservePayload): ReadonlySet<string> {
  const allowed = new Set<string>();
  if (preservePayload["*"] !== undefined) {
    allowed.add("*");
  }
  for (const key of Object.keys(preservePayload)) {
    if (key !== "*") {
      allowed.add(key);
    }
  }
  return allowed;
}
