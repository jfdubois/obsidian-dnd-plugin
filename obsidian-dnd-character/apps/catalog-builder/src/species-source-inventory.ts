import type { RawRecord } from "./raw-boundary";

/* ── ReadonlySet ───────────────────────────────────────────────── */

/**
 * Mutation-safe readonly set interface.
 * Matches the read-only surface of Set without exposing add/delete/clear.
 */
export interface FrozenReadonlySet<T> {
  readonly size: number;
  has(value: T): boolean;
  forEach(callback: (value: T, value2: T, set: FrozenReadonlySet<T>) => void, thisArg?: unknown): void;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
  readonly [Symbol.toStringTag]: string;
}

/**
 * Mutation-safe ReadonlySet implementation.
 * Internal set is private; exposed surface only allows read operations.
 * add, delete, clear are not available on the returned object.
 */
function createFrozenReadonlySet<T>(values: readonly T[]): FrozenReadonlySet<T> {
  const internal = new Set(values);
  const wrapper: FrozenReadonlySet<T> = Object.freeze({
    get size() { return internal.size; },
    has(value: T): boolean { return internal.has(value); },
    forEach(callback: (value: T, value2: T, set: FrozenReadonlySet<T>) => void, thisArg?: unknown) {
      internal.forEach((v) => callback.call(thisArg, v, v, wrapper));
    },
    entries(): IterableIterator<[T, T]> { return internal.entries(); },
    keys(): IterableIterator<T> { return internal.keys(); },
    values(): IterableIterator<T> { return internal.values(); },
    [Symbol.iterator](): IterableIterator<T> { return internal[Symbol.iterator](); },
    get [Symbol.toStringTag]() { return "ReadonlySet"; },
  });
  return wrapper;
}

/* ── Inventory diagnostic types ────────────────────────────────── */

/**
 * Diagnostic emitted by the inventory collector for malformed source entries.
 */
export interface SpeciesSourceInventoryDiagnostic {
  readonly code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY";
  readonly severity: "warning";
  readonly message: string;
  readonly recordName: string;
  readonly source: string;
  readonly recordIndex: number;
  readonly recordIdentity: {
    readonly name: string;
    readonly source: string;
  };
}

/**
 * Result of collecting known species sources from validated records.
 */
export interface KnownSpeciesSourceInventoryResult {
  readonly sources: FrozenReadonlySet<string>;
  readonly diagnostics: readonly SpeciesSourceInventoryDiagnostic[];
}

/* ── Known pinned source inventory ─────────────────────────────── */

/**
 * Derive the set of known source abbreviations from validated species records.
 * Returns a mutation-safe ReadonlySet and diagnostics for malformed entries.
 * Does NOT trim or accept malformed values; diagnoses them instead.
 * Does not assign rulesets.
 */
export function collectKnownSpeciesSources(
  records: readonly RawRecord[],
): KnownSpeciesSourceInventoryResult {
  const sources = new Set<string>();
  const diagnostics: SpeciesSourceInventoryDiagnostic[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (record === undefined) continue;
    const source = record.source;

    // Diagnose empty source
    if (source.length === 0) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has an empty source abbreviation.`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose whitespace-only source
    if (source.trim().length === 0) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has a whitespace-only source abbreviation.`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose leading whitespace
    if (source !== source.trimStart()) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has leading whitespace in source abbreviation "${source}".`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Diagnose trailing whitespace
    if (source !== source.trimEnd()) {
      diagnostics.push(Object.freeze({
        code: "INVALID_SPECIES_SOURCE_INVENTORY_ENTRY" as const,
        severity: "warning" as const,
        message: `Species record "${record.name}" has trailing whitespace in source abbreviation "${source}".`,
        recordName: record.name,
        source,
        recordIndex: i,
        recordIdentity: Object.freeze({ name: record.name, source }),
      }));
      continue;
    }

    // Valid exact source — add to set
    sources.add(source);
  }

  return Object.freeze({
    sources: createFrozenReadonlySet([...sources]),
    diagnostics: Object.freeze(diagnostics),
  });
}
