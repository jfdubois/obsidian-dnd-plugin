import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModAddSenses,
  ModAddSkills,
  ModOperationDiagnostic,
} from "./mod-types";
import {
  execAddSenses,
  execAddSkills,
  execAddSpells,
  execRemoveSpells,
  execReplaceSpells,
} from "./mod-root-executors";
import {
  validateAddSpells,
  validateRemoveSpells,
  validateReplaceSpells,
} from "./mod-root-spell-operations";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createDiagnostic(
  code: ModOperationDiagnostic["code"],
  message: string,
  rawParam?: unknown,
): ModOperationDiagnostic {
  return Object.freeze({
    code,
    severity: "error" as DiagnosticSeverity,
    message,
    rawParam,
  });
}

function validateAddSenses(raw: unknown): ModAddSenses | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSenses payload must be a plain object", raw);
  }
  const record = raw;
  if (record.mode !== "addSenses") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `addSenses mode mismatch: got "${record.mode}"`, raw);
  }
  if (!isPlainObject(record.senses)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSenses requires a 'senses' object", raw);
  }
  if (!isString(record.senses.type) || record.senses.type.length === 0) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSenses senses.type must be a non-empty string", raw);
  }
  if (record.senses.range !== undefined && !isNumber(record.senses.range)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSenses senses.range must be a finite number", raw);
  }
  return Object.freeze({
    mode: "addSenses" as const,
    senses: Object.freeze({
      type: record.senses.type,
      range: record.senses.range,
    }),
  });
}

function validateAddSkills(raw: unknown): ModAddSkills | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSkills payload must be a plain object", raw);
  }
  const record = raw;
  if (record.mode !== "addSkills") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `addSkills mode mismatch: got "${record.mode}"`, raw);
  }
  if (!isPlainObject(record.skills)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSkills requires a 'skills' object", raw);
  }

  const skills: Record<string, number> = {};
  for (const [name, value] of Object.entries(record.skills)) {
    if (name.length === 0 || !isNumber(value)) {
      return createDiagnostic(
        "INVALID_MOD_PAYLOAD",
        "addSkills skills must map non-empty skill names to finite numbers",
        raw,
      );
    }
    skills[name] = value;
  }
  return Object.freeze({ mode: "addSkills" as const, skills });
}

export function applyRootModOperation(
  record: Record<string, unknown>,
  rawPayload: unknown,
): ModOperationDiagnostic | undefined {
  const mode = isPlainObject(rawPayload) ? rawPayload.mode : undefined;
  if (!isString(mode)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "Mod operation payload missing 'mode'", rawPayload);
  }

  switch (mode) {
    case "addSenses": {
      const validated = validateAddSenses(rawPayload);
      if ("code" in validated) return validated;
      return execAddSenses(record, validated);
    }
    case "addSkills": {
      const validated = validateAddSkills(rawPayload);
      if ("code" in validated) return validated;
      return execAddSkills(record, validated);
    }
    case "addSpells": {
      const validated = validateAddSpells(rawPayload);
      if ("code" in validated) return validated;
      return execAddSpells(record, validated);
    }
    case "removeSpells": {
      const validated = validateRemoveSpells(rawPayload);
      if ("code" in validated) return validated;
      return execRemoveSpells(record, validated);
    }
    case "replaceSpells": {
      const validated = validateReplaceSpells(rawPayload);
      if ("code" in validated) return validated;
      return execReplaceSpells(record, validated);
    }
    default:
      return createDiagnostic("UNKNOWN_MOD_MODE", `Unknown mod mode: "${mode}"`, rawPayload);
  }
}

export {
  execAddSenses,
  execAddSkills,
  execAddSpells,
  execRemoveSpells,
  execReplaceSpells,
} from "./mod-root-executors";
