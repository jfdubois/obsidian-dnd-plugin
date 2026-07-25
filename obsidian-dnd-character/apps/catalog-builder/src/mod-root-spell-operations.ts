import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModAddSpells,
  ModOperationDiagnostic,
  ModRemoveSpells,
  ModReplaceSpells,
  ModSpellReplacement,
} from "./mod-types";

function isString(value: unknown): value is string {
  return typeof value === "string";
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

function isDiagnostic(value: unknown): value is ModOperationDiagnostic {
  return isPlainObject(value)
    && typeof value.code === "string"
    && typeof value.message === "string"
    && value.severity === "error";
}

function stringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((item) => isString(item) && item.length > 0)
    ? value
    : undefined;
}

function validateSpellAdditions(
  record: Record<string, unknown>,
  raw: unknown,
): Record<string, ModAddSpells["additions"][string]> | ModOperationDiagnostic {
  const additions: Record<string, ModAddSpells["additions"][string]> = {};
  for (const [groupName, groupValue] of Object.entries(record)) {
    if (groupName === "mode") continue;
    const directList = stringArray(groupValue);
    if (directList !== undefined) {
      additions[groupName] = directList;
      continue;
    }
    if (!isPlainObject(groupValue)) {
      return createDiagnostic("INVALID_MOD_PAYLOAD", "addSpells groups must be spell lists or level objects", raw);
    }
    const levels: Record<string, { readonly spells: readonly string[] }> = {};
    for (const [level, levelValue] of Object.entries(groupValue)) {
      if (!isPlainObject(levelValue)) {
        return createDiagnostic("INVALID_MOD_PAYLOAD", "addSpells level entries must be plain objects", raw);
      }
      const spells = stringArray(levelValue.spells);
      if (spells === undefined) {
        return createDiagnostic("INVALID_MOD_PAYLOAD", "addSpells level entries require a string 'spells' array", raw);
      }
      levels[level] = Object.freeze({ spells });
    }
    additions[groupName] = levels;
  }
  if (Object.keys(additions).length === 0) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSpells requires at least one spell group", raw);
  }
  return additions;
}

function validateSpellRemovalGroups(
  record: Record<string, unknown>,
  mode: string,
  raw: unknown,
): Record<string, ModRemoveSpells["removals"][string]> | ModOperationDiagnostic {
  const removals: Record<string, ModRemoveSpells["removals"][string]> = {};
  for (const [groupName, groupValue] of Object.entries(record)) {
    if (groupName === "mode") continue;
    const directList = stringArray(groupValue);
    if (directList !== undefined) {
      removals[groupName] = directList;
      continue;
    }
    if (!isPlainObject(groupValue)) {
      return createDiagnostic("INVALID_MOD_PAYLOAD", `${mode} groups must be spell lists or keyed spell-list objects`, raw);
    }
    const keyedLists: Record<string, readonly string[]> = {};
    for (const [key, listValue] of Object.entries(groupValue)) {
      const spells = stringArray(listValue);
      if (spells === undefined) {
        return createDiagnostic("INVALID_MOD_PAYLOAD", `${mode} keyed entries must be string arrays`, raw);
      }
      keyedLists[key] = spells;
    }
    removals[groupName] = keyedLists;
  }
  if (Object.keys(removals).length === 0) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `${mode} requires at least one spell group`, raw);
  }
  return removals;
}

function validateReplacementList(value: unknown): readonly ModSpellReplacement[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const replacements: ModSpellReplacement[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry) || !isString(entry.replace) || !isString(entry.with)) {
      return undefined;
    }
    replacements.push(Object.freeze({ replace: entry.replace, with: entry.with }));
  }
  return replacements;
}

function validateSpellReplacementGroups(
  record: Record<string, unknown>,
  raw: unknown,
): Record<string, ModReplaceSpells["replacements"][string]> | ModOperationDiagnostic {
  const replacements: Record<string, ModReplaceSpells["replacements"][string]> = {};
  for (const [groupName, groupValue] of Object.entries(record)) {
    if (groupName === "mode") continue;
    const directList = validateReplacementList(groupValue);
    if (directList !== undefined) {
      replacements[groupName] = directList;
      continue;
    }
    if (!isPlainObject(groupValue)) {
      return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceSpells groups must be replacement lists or keyed objects", raw);
    }
    const keyedLists: Record<string, readonly ModSpellReplacement[]> = {};
    for (const [key, listValue] of Object.entries(groupValue)) {
      const spellReplacements = validateReplacementList(listValue);
      if (spellReplacements === undefined) {
        return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceSpells keyed entries must be replacement arrays", raw);
      }
      keyedLists[key] = spellReplacements;
    }
    replacements[groupName] = keyedLists;
  }
  if (Object.keys(replacements).length === 0) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceSpells requires at least one spell group", raw);
  }
  return replacements;
}

export function validateAddSpells(raw: unknown): ModAddSpells | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "addSpells payload must be a plain object", raw);
  }
  const record = raw;
  if (record.mode !== "addSpells") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `addSpells mode mismatch: got "${record.mode}"`, raw);
  }
  const additions = validateSpellAdditions(record, raw);
  if (isDiagnostic(additions)) return additions;
  return Object.freeze({ mode: "addSpells" as const, additions });
}

export function validateRemoveSpells(raw: unknown): ModRemoveSpells | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "removeSpells payload must be a plain object", raw);
  }
  const record = raw;
  if (record.mode !== "removeSpells") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `removeSpells mode mismatch: got "${record.mode}"`, raw);
  }
  const removals = validateSpellRemovalGroups(record, "removeSpells", raw);
  if (isDiagnostic(removals)) return removals;
  return Object.freeze({ mode: "removeSpells" as const, removals });
}

export function validateReplaceSpells(raw: unknown): ModReplaceSpells | ModOperationDiagnostic {
  if (!isPlainObject(raw)) {
    return createDiagnostic("INVALID_MOD_PAYLOAD", "replaceSpells payload must be a plain object", raw);
  }
  const record = raw;
  if (record.mode !== "replaceSpells") {
    return createDiagnostic("INVALID_MOD_PAYLOAD", `replaceSpells mode mismatch: got "${record.mode}"`, raw);
  }
  const replacements = validateSpellReplacementGroups(record, raw);
  if (isDiagnostic(replacements)) return replacements;
  return Object.freeze({ mode: "replaceSpells" as const, replacements });
}
