import { createHash } from "crypto";

/**
 * Produces a canonical JSON string with sorted keys.
 * Handles nested objects and arrays recursively.
 * - Objects: keys are sorted lexicographically, values are recursed
 * - Arrays: elements are recursed in order (order preserved)
 * - Primitives (string, number, boolean, null): serialized as-is
 * - Undefined values in object properties are skipped
 */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return JSON.stringify(value);
    }
    // Infinity, -Infinity, NaN -> null for determinism
    return "null";
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
      if (val === undefined) {
        continue;
      }
      entries.push([key, canonicalJson(val)]);
    }
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    const pairs = entries.map(([k, v]) => `${JSON.stringify(k)}:${v}`);
    return `{${pairs.join(",")}}`;
  }

  // Fallback for any unexpected type (bigint, symbol, etc.)
  return "null";
}

/**
 * Computes a deterministic SHA-256 fingerprint from a structured input object.
 * - Sorts keys to be independent of insertion order
 * - Serializes to canonical JSON
 * - Produces 64-char lowercase hex string
 * - Independent of memory addresses, machines, etc.
 */
export function computeSourceFingerprint(input: Readonly<Record<string, unknown>>): string {
  const canonical = canonicalJson(input);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
