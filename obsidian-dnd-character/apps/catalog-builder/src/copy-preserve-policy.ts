import type { DiagnosticSeverity } from "./raw-loader";

/* ── Types ─────────────────────────────────────────────────────── */

/** Valid marker value for a _copy._preserve entry. */
export type PreserveMarkerValue = boolean | number | string;

/** Valid _copy._preserve payload: plain object mapping field names to marker values. */
export interface PreservePayload {
  readonly [fieldName: string]: PreserveMarkerValue;
}

/** Structured diagnostic emitted when a _copy._preserve payload fails validation. */
export interface PreserveValidationDiagnostic {
  readonly code: "INVALID_PRESERVE_PAYLOAD";
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly reason: PreserveValidationReason;
  readonly rawValue: unknown;
  readonly fieldKey?: string;
}

export type PreserveValidationReason =
  | "NOT_PLAIN_OBJECT"
  | "INVALID_MARKER_TYPE"
  | "INVALID_MARKER_VALUE"
  | "EMPTY_FIELD_KEY"
  | "PROTOTYPE_SENSITIVE_KEY";

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a marker value is a valid pinned-data truthy marker.
 * Accepts only: boolean true, number 1, or string "true".
 * Rejects: 0, false, empty string, other numbers, other strings, undefined.
 */
function isValidMarkerValue(value: unknown): value is PreserveMarkerValue {
  if (typeof value === "boolean") return value === true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "true";
  return false;
}

function createDiagnostic(
  reason: PreserveValidationReason,
  message: string,
  rawValue: unknown,
  fieldKey?: string,
): PreserveValidationDiagnostic {
  return Object.freeze({
    code: "INVALID_PRESERVE_PAYLOAD",
    severity: "error",
    message,
    reason,
    rawValue,
    fieldKey,
  });
}

/**
 * Validates a _copy._preserve payload from unknown input.
 * Returns structured diagnostics instead of throwing.
 *
 * Accepts:
 *   - Plain object with string keys mapping to valid marker values (true, 1, "true")
 *   - The wildcard "*" key is allowed
 *
 * Rejects:
 *   - Non-plain-object payloads (arrays, null, primitives, nested objects as values)
 *   - Marker values that are not valid truthy markers
 *   - Empty string keys
 *   - Prototype-sensitive keys
 */
export function validatePreservePayload(rawValue: unknown): PreserveValidationResult {
  if (!isPlainObject(rawValue)) {
    return {
      valid: false,
      diagnostics: Object.freeze([
        createDiagnostic(
          "NOT_PLAIN_OBJECT",
          `_copy._preserve must be a plain object, got ${Array.isArray(rawValue) ? "array" : rawValue === null ? "null" : typeof rawValue}`,
          rawValue,
        ),
      ]),
    };
  }

  const diagnostics: PreserveValidationDiagnostic[] = [];
  const payload: Record<string, PreserveMarkerValue> = {};

  // Check prototype-sensitive keys that may not appear in Object.entries
  // (__proto__ sets the prototype rather than being an own property)
  for (const sensitiveKey of PROTOTYPE_SENSITIVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawValue, sensitiveKey)) {
      diagnostics.push(
        createDiagnostic(
          "PROTOTYPE_SENSITIVE_KEY",
          `_copy._preserve contains prototype-sensitive key "${sensitiveKey}"`,
          rawValue,
          sensitiveKey,
        ),
      );
    }
  }

  for (const [key, value] of Object.entries(rawValue)) {
    if (key.length === 0) {
      diagnostics.push(
        createDiagnostic(
          "EMPTY_FIELD_KEY",
          `_copy._preserve contains an empty string field key`,
          rawValue,
          key,
        ),
      );
      continue;
    }

    if (PROTOTYPE_SENSITIVE_KEYS.has(key)) {
      diagnostics.push(
        createDiagnostic(
          "PROTOTYPE_SENSITIVE_KEY",
          `_copy._preserve contains prototype-sensitive key "${key}"`,
          rawValue,
          key,
        ),
      );
      continue;
    }

    if (!isValidMarkerValue(value)) {
      diagnostics.push(
        createDiagnostic(
          "INVALID_MARKER_VALUE",
          `_copy._preserve["${key}"] has an invalid marker value: ${JSON.stringify(value)}`,
          rawValue,
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
