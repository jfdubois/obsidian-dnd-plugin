import { createHash } from "crypto";

/** Tracks objects/arrays currently in the active recursion path for cycle detection. */
const activeCycleSet = new WeakSet<object>();

/**
 * Validates that a value is a JSON-compatible structured value suitable for
 * fingerprinting. Throws deterministic TypeError for unsupported values.
 */
function validateFingerprintValue(value: unknown, path: string = "root"): void {
  if (value === undefined) {
    throw new TypeError(`Unsupported value at "${path}": undefined is not allowed`);
  }

  if (value === null) {
    return;
  }

  if (typeof value === "string") {
    return;
  }

  if (typeof value === "boolean") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Unsupported value at "${path}": ${value} is not a finite number`);
    }
    return;
  }

  if (typeof value === "function") {
    throw new TypeError(`Unsupported value at "${path}": function is not allowed`);
  }

  if (typeof value === "symbol") {
    throw new TypeError(`Unsupported value at "${path}": symbol is not allowed`);
  }

  if (typeof value === "bigint") {
    throw new TypeError(`Unsupported value at "${path}": bigint is not allowed`);
  }

  if (typeof value !== "object") {
    throw new TypeError(`Unsupported value at "${path}": unexpected type`);
  }

  // Cycle detection — reject if already in active recursion path
  if (activeCycleSet.has(value)) {
    throw new TypeError(`Cyclic reference detected at "${path}"`);
  }

  // Check for non-plain objects (arrays and null-prototype objects are OK)
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    if (!Array.isArray(value)) {
      const ctorName = proto.constructor?.name ?? "unknown";
      throw new TypeError(`Unsupported value at "${path}": ${ctorName} instance is not allowed`);
    }
  }

  activeCycleSet.add(value);

  try {
    // Reject symbol-keyed properties
    for (const _sym of Object.getOwnPropertySymbols(value)) {
      throw new TypeError(`Unsupported value at "${path}": symbol-keyed property is not allowed`);
    }

    const ownNames = Object.getOwnPropertyNames(value);
    for (const name of ownNames) {
      const desc = Object.getOwnPropertyDescriptor(value, name);
      if (desc && (desc.get !== undefined || desc.set !== undefined)) {
        throw new TypeError(`Unsupported value at "${path}.${name}": accessor is not allowed`);
      }

      // Plain objects: reject non-enumerable own string properties
      if (!Array.isArray(value) && desc && !desc.enumerable) {
        throw new TypeError(`Unsupported value at "${path}.${name}": non-enumerable property is not allowed`);
      }

      // Arrays: reject non-enumerable properties except "length"
      if (Array.isArray(value) && name !== "length" && desc && !desc.enumerable) {
        throw new TypeError(`Unsupported value at "${path}": non-enumerable array property "${name}" is not allowed`);
      }
    }

    // Recurse into arrays
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!(i in value)) {
          throw new TypeError(`Unsupported value at "${path}[${i}]": sparse array hole is not allowed`);
        }
        validateFingerprintValue(value[i], `${path}[${i}]`);
      }
      return;
    }

    // Recurse into plain objects
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      validateFingerprintValue(val, `${path}.${key}`);
    }
  } finally {
    activeCycleSet.delete(value);
  }
}

/**
 * Ordinal string comparison for deterministic key sorting.
 * Does NOT use locale-sensitive comparison.
 */
function ordinalCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Produces a canonical JSON string with sorted keys.
 * Handles nested objects and arrays recursively.
 * - Objects: keys are sorted ordinally, values are recursed
 * - Arrays: elements are recursed in order (order preserved)
 * - Primitives (string, number, boolean, null): serialized as-is
 */
function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalJson(item));
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object") {
    const entries: Array<[string, string]> = [];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      entries.push([key, canonicalJson(val)]);
    }
    entries.sort((a, b) => ordinalCompare(a[0], b[0]));
    const pairs = entries.map(([k, v]) => `${JSON.stringify(k)}:${v}`);
    return `{${pairs.join(",")}}`;
  }

  /* istanbul ignore next */
  throw new TypeError(`Unexpected value type in canonicalJson: ${typeof value}`);
}

/**
 * Computes a deterministic SHA-256 fingerprint from a structured input value.
 * - Validates all values are JSON-compatible structured values
 * - Sorts keys ordinally to be independent of insertion order
 * - Serializes to canonical JSON
 * - Produces 64-char lowercase hex string
 *
 * Accepts: null, strings, booleans, finite numbers, arrays of valid values,
 *          plain objects (with Object.prototype or null prototype) of valid values.
 *
 * Rejects (throws TypeError): undefined, NaN, Infinity, -Infinity, functions,
 * symbols, bigint, accessors, symbol-keyed properties, non-enumerable properties,
 * sparse arrays, Date, RegExp, Map, Set, class instances, other non-plain objects,
 * cyclic structures.
 */
export function computeSourceFingerprint(input: unknown): string {
  validateFingerprintValue(input);
  const canonical = canonicalJson(input);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
