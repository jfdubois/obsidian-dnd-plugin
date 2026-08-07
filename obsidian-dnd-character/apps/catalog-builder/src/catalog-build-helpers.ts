import type { FrozenReadonlySet } from "./species-source-inventory.js";
import type { RawRecord } from "./raw-boundary.js";
import type { CopyModRawRecord } from "./mod-types.js";

/* ── FrozenReadonlySet helper ──────────────────────────────────── */

/** Create a frozen readonly set from an array of values. */
export function createFrozenReadonlySet<T>(values: readonly T[]): FrozenReadonlySet<T> {
  const internal = new Set(values);
  return Object.freeze({
    get size() { return internal.size; },
    has(value: T): boolean { return internal.has(value); },
    forEach(callback: (value: T, _v2: T, set: FrozenReadonlySet<T>) => void, thisArg?: unknown) {
      internal.forEach((v) => callback.call(thisArg, v, v, this as FrozenReadonlySet<T>));
    },
    entries(): IterableIterator<[T, T]> { return internal.entries(); },
    keys(): IterableIterator<T> { return internal.keys(); },
    values(): IterableIterator<T> { return internal.values(); },
    [Symbol.iterator](): IterableIterator<T> { return internal[Symbol.iterator](); },
    get [Symbol.toStringTag]() { return "ReadonlySet"; },
  }) as FrozenReadonlySet<T>;
}

/* ── Entity kind classification ────────────────────────────────── */

/**
 * Map 5eTools JSON collection keys to orchestrator entity kinds.
 * The raw boundary preserves the original 5eTools collection names,
 * but normalizers expect canonical orchestrator kind names.
 */
export const ET_TOOLS_KIND_MAP: ReadonlyMap<string, string> = new Map([
  ["race", "species"],
  ["subrace", "species"],
  ["classFeature", "class-feature"],
  ["subclassFeature", "subclass-feature"],
]);

/** Resolve a 5eTools JSON collection key to the orchestrator entity kind. */
export function resolveEntityKind(etKind: string): string {
  return ET_TOOLS_KIND_MAP.get(etKind) ?? etKind;
}

export const RAW_RECORD_KINDS: ReadonlySet<string> = new Set([
  "species",
  "background",
]);

export const COPY_MOD_KINDS: ReadonlySet<string> = new Set([
  "feat",
  "spell",
  "item",
  "skill",
  "language",
  "class-feature",
  "subclass-feature",
  "optional-feature",
]);

/* ── Source collection helpers ─────────────────────────────────── */

function collectKnownSources(records: readonly RawRecord[]): FrozenReadonlySet<string> {
  const sources = new Set<string>();
  for (const record of records) {
    const source = record.source;
    if (source.length > 0 && source === source.trim()) {
      sources.add(source);
    }
  }
  return createFrozenReadonlySet([...sources]);
}

function collectCopyModSources(records: readonly CopyModRawRecord[]): FrozenReadonlySet<string> {
  const sources = new Set<string>();
  for (const record of records) {
    const source = record.source;
    if (source.length > 0 && source === source.trim()) {
      sources.add(source);
    }
  }
  return createFrozenReadonlySet([...sources]);
}

/** Convert RawRecord to CopyModRawRecord (same shape, different type). */
export function toCopyModRecord(record: RawRecord): CopyModRawRecord {
  return { name: record.name, source: record.source, remaining: record.remaining };
}

export { collectKnownSources, collectCopyModSources };
