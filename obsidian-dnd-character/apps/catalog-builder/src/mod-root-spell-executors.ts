import type { DiagnosticSeverity } from "./raw-loader";
import type {
  ModAddSpells,
  ModOperationDiagnostic,
  ModRemoveSpells,
  ModReplaceSpells,
  ModSpellReplacement,
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

function isDiagnostic(value: unknown): value is ModOperationDiagnostic {
  return isPlainObject(value)
    && typeof value.code === "string"
    && typeof value.message === "string"
    && value.severity === "error";
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }
  if (isPlainObject(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      cloned[key] = cloneUnknown(item);
    }
    return cloned;
  }
  return value;
}

function clonePlainObject(record: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    cloned[key] = cloneUnknown(value);
  }
  return cloned;
}

function spellcastingTarget(
  record: Record<string, unknown>,
  mode: string,
): Record<string, unknown> | ModOperationDiagnostic {
  const current = record.spellcasting;
  if (!Array.isArray(current) || current.length === 0) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      `${mode} target 'spellcasting' field must be a non-empty array`,
      current,
    );
  }

  const clonedEntries: Record<string, unknown>[] = [];
  for (const entry of current) {
    if (!isPlainObject(entry)) {
      return createDiagnostic(
        "MOD_FIELD_TARGET_MISSING",
        `${mode} target 'spellcasting' entries must be plain objects`,
        entry,
      );
    }
    clonedEntries.push(clonePlainObject(entry));
  }
  record.spellcasting = clonedEntries;
  return clonedEntries[0] as Record<string, unknown>;
}

function stringArrayTarget(
  container: Record<string, unknown>,
  property: string,
  mode: string,
): string[] | ModOperationDiagnostic {
  const current = container[property];
  if (current !== undefined && !Array.isArray(current)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      `${mode} target '${property}' field is not an array`,
      current,
    );
  }
  if (current !== undefined && !current.every((item) => typeof item === "string")) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      `${mode} target '${property}' field contains non-string entries`,
      current,
    );
  }
  return current === undefined ? [] : [...current];
}

function objectTarget(
  container: Record<string, unknown>,
  property: string,
  mode: string,
): Record<string, unknown> | ModOperationDiagnostic {
  const current = container[property];
  if (current !== undefined && !isPlainObject(current)) {
    return createDiagnostic(
      "MOD_FIELD_TARGET_MISSING",
      `${mode} target '${property}' field is not a plain object`,
      current,
    );
  }
  return current === undefined ? {} : clonePlainObject(current);
}

function removeValues(values: readonly string[], removals: readonly string[]): string[] {
  const removalSet = new Set(removals);
  return values.filter((value) => !removalSet.has(value));
}

function replaceValues(
  values: readonly string[],
  replacements: readonly ModSpellReplacement[],
): string[] {
  const replacementMap = new Map(replacements.map((entry) => [entry.replace, entry.with]));
  return values.map((value) => replacementMap.get(value) ?? value);
}

function mutateNestedSpellList(
  group: Record<string, unknown>,
  key: string,
  mode: string,
  mutate: (values: readonly string[]) => string[],
): ModOperationDiagnostic | undefined {
  const current = group[key];
  if (Array.isArray(current)) {
    if (!current.every((item) => typeof item === "string")) {
      return createDiagnostic(
        "MOD_FIELD_TARGET_MISSING",
        `${mode} target spell list contains non-string entries`,
        current,
      );
    }
    group[key] = mutate(current);
    return undefined;
  }
  if (isPlainObject(current)) {
    const spells = current.spells;
    if (!Array.isArray(spells) || !spells.every((item) => typeof item === "string")) {
      return createDiagnostic(
        "MOD_FIELD_TARGET_MISSING",
        `${mode} target nested spell list must expose a string 'spells' array`,
        current,
      );
    }
    group[key] = { ...clonePlainObject(current), spells: mutate(spells) };
    return undefined;
  }
  return createDiagnostic(
    "MOD_FIELD_TARGET_MISSING",
    `${mode} target nested spell list is missing`,
    current,
  );
}

export function execAddSpells(
  record: Record<string, unknown>,
  payload: ModAddSpells,
): ModOperationDiagnostic | undefined {
  const target = spellcastingTarget(record, payload.mode);
  if (isDiagnostic(target)) return target;

  for (const [groupName, additions] of Object.entries(payload.additions)) {
    if (Array.isArray(additions)) {
      const current = stringArrayTarget(target, groupName, payload.mode);
      if (isDiagnostic(current)) return current;
      target[groupName] = [...current, ...additions];
      continue;
    }

    const group = objectTarget(target, groupName, payload.mode);
    if (isDiagnostic(group)) return group;
    for (const [level, addition] of Object.entries(additions)) {
      const current = group[level];
      if (current !== undefined && !isPlainObject(current)) {
        return createDiagnostic(
          "MOD_FIELD_TARGET_MISSING",
          `${payload.mode} target '${groupName}.${level}' field is not a plain object`,
          current,
        );
      }
      const levelRecord = current === undefined ? {} : clonePlainObject(current);
      const spellList = stringArrayTarget(levelRecord, "spells", payload.mode);
      if (isDiagnostic(spellList)) return spellList;
      group[level] = { ...levelRecord, spells: [...spellList, ...addition.spells] };
    }
    target[groupName] = group;
  }

  return undefined;
}

export function execRemoveSpells(
  record: Record<string, unknown>,
  payload: ModRemoveSpells,
): ModOperationDiagnostic | undefined {
  const target = spellcastingTarget(record, payload.mode);
  if (isDiagnostic(target)) return target;

  for (const [groupName, removals] of Object.entries(payload.removals)) {
    if (Array.isArray(removals)) {
      const current = stringArrayTarget(target, groupName, payload.mode);
      if (isDiagnostic(current)) return current;
      target[groupName] = removeValues(current, removals);
      continue;
    }

    const group = objectTarget(target, groupName, payload.mode);
    if (isDiagnostic(group)) return group;
    for (const [key, spellRemovals] of Object.entries(removals)) {
      const diagnostic = mutateNestedSpellList(group, key, payload.mode, (values) =>
        removeValues(values, spellRemovals),
      );
      if (diagnostic !== undefined) return diagnostic;
    }
    target[groupName] = group;
  }

  return undefined;
}

export function execReplaceSpells(
  record: Record<string, unknown>,
  payload: ModReplaceSpells,
): ModOperationDiagnostic | undefined {
  const target = spellcastingTarget(record, payload.mode);
  if (isDiagnostic(target)) return target;

  for (const [groupName, replacements] of Object.entries(payload.replacements)) {
    if (Array.isArray(replacements)) {
      const current = stringArrayTarget(target, groupName, payload.mode);
      if (isDiagnostic(current)) return current;
      target[groupName] = replaceValues(current, replacements);
      continue;
    }

    const group = objectTarget(target, groupName, payload.mode);
    if (isDiagnostic(group)) return group;
    for (const [key, spellReplacements] of Object.entries(replacements)) {
      const diagnostic = mutateNestedSpellList(group, key, payload.mode, (values) =>
        replaceValues(values, spellReplacements),
      );
      if (diagnostic !== undefined) return diagnostic;
    }
    target[groupName] = group;
  }

  return undefined;
}
