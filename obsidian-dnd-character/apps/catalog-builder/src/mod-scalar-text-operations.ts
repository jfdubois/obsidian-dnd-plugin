import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModMaxSize,
  ModOperationDiagnostic,
  ModPrefixSuffixStringProp,
  ModReplaceTxt,
  ModScalarAddDc,
  ModScalarAddHit,
  ModScalarAddProp,
  ModScalarMultProp,
  ModScalarMultXp,
  ModSetProp,
} from "./mod-types";
import {
  execMaxSize,
  execPrefixSuffixStringProp,
  execReplaceTxt,
  execScalarAddDc,
  execScalarAddHit,
  execScalarAddProp,
  execScalarMultProp,
  execScalarMultXp,
  execSetProp,
} from "./mod-scalar-text-executors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function diagnostic(message: string, rawParam: unknown): ModOperationDiagnostic {
  return Object.freeze({
    code: "INVALID_MOD_PAYLOAD" as const,
    severity: "error" as DiagnosticSeverity,
    message,
    rawParam,
  });
}

function isDiagnostic(value: unknown): value is ModOperationDiagnostic {
  return isPlainObject(value) && typeof value.code === "string" && typeof value.message === "string";
}

function validateRecord(raw: unknown, mode: string): Record<string, unknown> | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return diagnostic(`${mode} payload must be a plain object`, raw);
  }
  if (raw.mode !== mode) {
    return diagnostic(`${mode} mode mismatch: got "${String(raw.mode)}"`, raw);
  }
  return raw;
}

function validateMaxSize(raw: unknown): ModMaxSize | ModOperationDiagnostic {
  const record = validateRecord(raw, "maxSize");
  if (isDiagnostic(record)) return record;
  if (!isString(record.max)) return diagnostic("maxSize requires a string 'max' property", raw);
  return Object.freeze({ mode: "maxSize" as const, max: record.max });
}

function validatePrefixSuffixStringProp(
  raw: unknown,
): ModPrefixSuffixStringProp | ModOperationDiagnostic {
  const record = validateRecord(raw, "prefixSuffixStringProp");
  if (isDiagnostic(record)) return record;
  if (!isString(record.prop)) return diagnostic("prefixSuffixStringProp requires a string 'prop'", raw);
  if (typeof record.prefix !== "string") {
    return diagnostic("prefixSuffixStringProp requires a string 'prefix'", raw);
  }
  if (typeof record.suffix !== "string") {
    return diagnostic("prefixSuffixStringProp requires a string 'suffix'", raw);
  }
  return Object.freeze({
    mode: "prefixSuffixStringProp" as const,
    prop: record.prop,
    prefix: record.prefix,
    suffix: record.suffix,
  });
}

function validateReplaceTxt(raw: unknown): ModReplaceTxt | ModOperationDiagnostic {
  const record = validateRecord(raw, "replaceTxt");
  if (isDiagnostic(record)) return record;
  if (!isString(record.replace)) return diagnostic("replaceTxt requires a string 'replace'", raw);
  if (typeof record.with !== "string") return diagnostic("replaceTxt requires a string 'with'", raw);
  if (record.flags !== undefined && typeof record.flags !== "string") {
    return diagnostic("replaceTxt 'flags' must be a string when present", raw);
  }
  try {
    new RegExp(record.replace, record.flags);
  } catch {
    return diagnostic("replaceTxt requires a valid regular expression", raw);
  }
  return Object.freeze({
    mode: "replaceTxt" as const,
    replace: record.replace,
    with: record.with,
    flags: record.flags,
  });
}

function validateScalarAddDc(raw: unknown): ModScalarAddDc | ModOperationDiagnostic {
  const record = validateRecord(raw, "scalarAddDc");
  if (isDiagnostic(record)) return record;
  if (!isNumber(record.scalar)) return diagnostic("scalarAddDc requires a finite numeric 'scalar'", raw);
  return Object.freeze({ mode: "scalarAddDc" as const, scalar: record.scalar });
}

function validateScalarAddHit(raw: unknown): ModScalarAddHit | ModOperationDiagnostic {
  const record = validateRecord(raw, "scalarAddHit");
  if (isDiagnostic(record)) return record;
  if (!isNumber(record.scalar)) return diagnostic("scalarAddHit requires a finite numeric 'scalar'", raw);
  return Object.freeze({ mode: "scalarAddHit" as const, scalar: record.scalar });
}

function validateScalarAddProp(raw: unknown): ModScalarAddProp | ModOperationDiagnostic {
  const record = validateRecord(raw, "scalarAddProp");
  if (isDiagnostic(record)) return record;
  if (!isNumber(record.scalar)) return diagnostic("scalarAddProp requires a finite numeric 'scalar'", raw);
  if (!isString(record.prop)) return diagnostic("scalarAddProp requires a string 'prop'", raw);
  return Object.freeze({ mode: "scalarAddProp" as const, scalar: record.scalar, prop: record.prop });
}

function validateScalarMultProp(raw: unknown): ModScalarMultProp | ModOperationDiagnostic {
  const record = validateRecord(raw, "scalarMultProp");
  if (isDiagnostic(record)) return record;
  if (!isString(record.prop)) return diagnostic("scalarMultProp requires a string 'prop'", raw);
  if (!isNumber(record.scalar)) return diagnostic("scalarMultProp requires a finite numeric 'scalar'", raw);
  const floor = isBoolean(record.floor) ? record.floor : undefined;
  return Object.freeze({ mode: "scalarMultProp" as const, prop: record.prop, scalar: record.scalar, floor });
}

function validateScalarMultXp(raw: unknown): ModScalarMultXp | ModOperationDiagnostic {
  const record = validateRecord(raw, "scalarMultXp");
  if (isDiagnostic(record)) return record;
  if (!isNumber(record.scalar)) return diagnostic("scalarMultXp requires a finite numeric 'scalar'", raw);
  const floor = isBoolean(record.floor) ? record.floor : undefined;
  return Object.freeze({ mode: "scalarMultXp" as const, scalar: record.scalar, floor });
}

function validateSetProp(raw: unknown): ModSetProp | ModOperationDiagnostic {
  const record = validateRecord(raw, "setProp");
  if (isDiagnostic(record)) return record;
  if (!isString(record.prop)) return diagnostic("setProp requires a string 'prop'", raw);
  return Object.freeze({ mode: "setProp" as const, prop: record.prop, value: record.value });
}

export function applyScalarTextModOperation(
  record: Record<string, unknown>,
  fieldTarget: string,
  rawPayload: unknown,
): ModOperationDiagnostic | undefined {
  const mode = isPlainObject(rawPayload) ? rawPayload.mode : undefined;
  if (!isString(mode)) return diagnostic("Mod operation payload missing 'mode'", rawPayload);

  switch (mode) {
    case "maxSize": {
      const operation = validateMaxSize(rawPayload);
      if ("code" in operation) return operation;
      execMaxSize(record, operation);
      return undefined;
    }
    case "prefixSuffixStringProp": {
      const operation = validatePrefixSuffixStringProp(rawPayload);
      if ("code" in operation) return operation;
      execPrefixSuffixStringProp(record, fieldTarget, operation);
      return undefined;
    }
    case "replaceTxt": {
      const operation = validateReplaceTxt(rawPayload);
      if ("code" in operation) return operation;
      execReplaceTxt(record, fieldTarget, operation);
      return undefined;
    }
    case "scalarAddDc": {
      const operation = validateScalarAddDc(rawPayload);
      if (isDiagnostic(operation)) return operation;
      execScalarAddDc(record, fieldTarget, operation);
      return undefined;
    }
    case "scalarAddHit": {
      const operation = validateScalarAddHit(rawPayload);
      if (isDiagnostic(operation)) return operation;
      execScalarAddHit(record, fieldTarget, operation);
      return undefined;
    }
    case "scalarAddProp": {
      const operation = validateScalarAddProp(rawPayload);
      if ("code" in operation) return operation;
      execScalarAddProp(record, fieldTarget, operation);
      return undefined;
    }
    case "scalarMultProp": {
      const operation = validateScalarMultProp(rawPayload);
      if ("code" in operation) return operation;
      execScalarMultProp(record, fieldTarget, operation);
      return undefined;
    }
    case "scalarMultXp": {
      const operation = validateScalarMultXp(rawPayload);
      if ("code" in operation) return operation;
      execScalarMultXp(record, operation);
      return undefined;
    }
    case "setProp": {
      const operation = validateSetProp(rawPayload);
      if ("code" in operation) return operation;
      execSetProp(record, fieldTarget, operation);
      return undefined;
    }
    default:
      return undefined;
  }
}
