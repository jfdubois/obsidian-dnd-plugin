import type {
  ModMaxSize,
  ModPrefixSuffixStringProp,
  ModReplaceTxt,
  ModScalarAddDc,
  ModScalarAddHit,
  ModScalarAddProp,
  ModScalarMultProp,
  ModScalarMultXp,
  ModSetProp,
} from "./mod-types";

const SIZE_ORDER = ["T", "S", "M", "L", "H", "G", "C"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      cloned[key] = cloneUnknown(child);
    }
    return cloned;
  }
  return value;
}

function replaceStrings(value: unknown, pattern: RegExp, replacement: string): unknown {
  if (typeof value === "string") {
    return value.replace(pattern, replacement);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, pattern, replacement));
  }
  if (isPlainObject(value)) {
    const replaced: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      replaced[key] = replaceStrings(child, pattern, replacement);
    }
    return replaced;
  }
  return value;
}

function scalarDcStrings(value: unknown, scalar: number): unknown {
  if (typeof value === "string") {
    return value.replace(/\bDC\s*(\d+)\b/g, (_match, digits: string) => {
      const current = Number.parseInt(digits, 10);
      return `DC ${current + scalar}`;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => scalarDcStrings(item, scalar));
  }
  if (isPlainObject(value)) {
    const replaced: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      replaced[key] = scalarDcStrings(child, scalar);
    }
    return replaced;
  }
  return value;
}

function scalarHitStrings(value: unknown, scalar: number): unknown {
  if (typeof value === "string") {
    return value.replace(/([+-])(\d+)\s*to hit\b/g, (_match, _sign: string, digits: string) => {
      const current = Number.parseInt(digits, 10);
      const next = current + scalar;
      const prefix = next >= 0 ? "+" : "";
      return `${prefix}${next} to hit`;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => scalarHitStrings(item, scalar));
  }
  if (isPlainObject(value)) {
    const replaced: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      replaced[key] = scalarHitStrings(child, scalar);
    }
    return replaced;
  }
  return value;
}

function transformNumber(value: unknown, scalar: number, floor: boolean | undefined): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }
  const transformed = value * scalar;
  return floor === true ? Math.floor(transformed) : transformed;
}

export function execMaxSize(record: Record<string, unknown>, operation: ModMaxSize): void {
  const maxIndex = SIZE_ORDER.indexOf(operation.max as (typeof SIZE_ORDER)[number]);
  const size = record.size;
  if (maxIndex < 0) {
    return;
  }
  if (typeof size === "string") {
    const sizeIndex = SIZE_ORDER.indexOf(size as (typeof SIZE_ORDER)[number]);
    if (sizeIndex > maxIndex) {
      record.size = operation.max;
    }
    return;
  }
  if (Array.isArray(size)) {
    record.size = size.map((entry) => {
      if (typeof entry !== "string") {
        return entry;
      }
      const sizeIndex = SIZE_ORDER.indexOf(entry as (typeof SIZE_ORDER)[number]);
      return sizeIndex > maxIndex ? operation.max : entry;
    });
  }
}

export function execPrefixSuffixStringProp(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModPrefixSuffixStringProp,
): void {
  const field = record[fieldTarget];
  if (!isPlainObject(field)) {
    return;
  }
  const current = field[operation.prop];
  if (typeof current === "string") {
    field[operation.prop] = `${operation.prefix}${current}${operation.suffix}`;
  }
}

export function execReplaceTxt(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModReplaceTxt,
): void {
  const flags = operation.flags ?? "g";
  const pattern = new RegExp(operation.replace, flags.includes("g") ? flags : `${flags}g`);
  if (fieldTarget === "*") {
    const replaced = replaceStrings(record, pattern, operation.with);
    if (isPlainObject(replaced)) {
      for (const key of Object.keys(record)) {
        delete record[key];
      }
      Object.assign(record, replaced);
    }
    return;
  }
  record[fieldTarget] = replaceStrings(record[fieldTarget], pattern, operation.with);
}

export function execScalarAddDc(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModScalarAddDc,
): void {
  record[fieldTarget] = scalarDcStrings(record[fieldTarget], operation.scalar);
}

export function execScalarAddHit(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModScalarAddHit,
): void {
  record[fieldTarget] = scalarHitStrings(record[fieldTarget], operation.scalar);
}

export function execScalarAddProp(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModScalarAddProp,
): void {
  const target = record[fieldTarget];
  if (!isPlainObject(target)) {
    return;
  }
  if (operation.prop === "*") {
    for (const [key, value] of Object.entries(target)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        target[key] = value + operation.scalar;
      }
    }
    return;
  }
  const current = target[operation.prop];
  if (typeof current === "number" && Number.isFinite(current)) {
    target[operation.prop] = current + operation.scalar;
  }
}

export function execScalarMultProp(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModScalarMultProp,
): void {
  const target = record[fieldTarget];
  if (!isPlainObject(target)) {
    return;
  }
  target[operation.prop] = transformNumber(target[operation.prop], operation.scalar, operation.floor);
}

export function execScalarMultXp(record: Record<string, unknown>, operation: ModScalarMultXp): void {
  record.xp = transformNumber(record.xp, operation.scalar, operation.floor);
}

export function execSetProp(
  record: Record<string, unknown>,
  fieldTarget: string,
  operation: ModSetProp,
): void {
  if (fieldTarget === "_") {
    record[operation.prop] = cloneUnknown(operation.value);
    return;
  }
  const target = record[fieldTarget];
  if (isPlainObject(target)) {
    target[operation.prop] = cloneUnknown(operation.value);
  }
}
