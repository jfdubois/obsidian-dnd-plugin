import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModAddSenses,
  ModAddSkills,
  ModOperationDiagnostic,
} from "./mod-types";

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

function formatSense(sense: ModAddSenses["senses"]): string {
  return sense.range === undefined ? sense.type : `${sense.type} ${sense.range} ft.`;
}

function formatSkillBonus(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function execAddSenses(
  record: Record<string, unknown>,
  payload: ModAddSenses,
): ModOperationDiagnostic | undefined {
  const current = record.senses;
  if (current !== undefined && !Array.isArray(current)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "addSenses target 'senses' field is not an array",
      current,
    );
  }

  const senses = current === undefined ? [] : [...current];
  senses.push(formatSense(payload.senses));
  record.senses = senses;
  return undefined;
}

export function execAddSkills(
  record: Record<string, unknown>,
  payload: ModAddSkills,
): ModOperationDiagnostic | undefined {
  const current = record.skill;
  if (current !== undefined && !isPlainObject(current)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      "addSkills target 'skill' field is not a plain object",
      current,
    );
  }

  const skill: Record<string, unknown> = current === undefined ? {} : { ...current };
  for (const [name, bonus] of Object.entries(payload.skills)) {
    skill[name] = formatSkillBonus(bonus);
  }
  record.skill = skill;
  return undefined;
}
