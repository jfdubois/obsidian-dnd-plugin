import { applyArrayModOperation } from "./mod-array-operations";
import { applyRootModOperation } from "./mod-root-operations";
import { applyScalarTextModOperation } from "./mod-scalar-text-operations";
import type {
  CopyModRawRecord,
  ModOperationDiagnostic,
} from "./mod-types";
import { isPlainObject } from "./copy-materialization-merge";

const ARRAY_MODES = new Set([
  "appendArr",
  "appendIfNotExistsArr",
  "insertArr",
  "prependArr",
  "removeArr",
  "renameArr",
  "replaceArr",
]);

const ROOT_MODES = new Set([
  "addSenses",
  "addSkills",
  "addSpells",
  "removeSpells",
  "replaceSpells",
]);

const SCALAR_TEXT_MODES = new Set([
  "maxSize",
  "prefixSuffixStringProp",
  "replaceTxt",
  "scalarAddDc",
  "scalarAddHit",
  "scalarAddProp",
  "scalarMultProp",
  "scalarMultXp",
  "setProp",
]);

function diagnostic(
  code: ModOperationDiagnostic["code"],
  message: string,
  sourceRecord: CopyModRawRecord,
  fieldTarget: string,
  mode: string | undefined,
  sourcePath: string | undefined,
  rawParam: unknown,
): ModOperationDiagnostic {
  return Object.freeze({
    code,
    severity: "error",
    message,
    sourcePath,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget,
    mode,
    rawParam,
  });
}

function enrichDiagnostic(
  original: ModOperationDiagnostic,
  sourceRecord: CopyModRawRecord,
  fieldTarget: string,
  mode: string | undefined,
  sourcePath: string | undefined,
): ModOperationDiagnostic {
  return Object.freeze({
    ...original,
    sourcePath,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget,
    mode,
  });
}

function operationList(rawOperations: unknown): readonly unknown[] {
  return Array.isArray(rawOperations) ? rawOperations : [rawOperations];
}

function modeOf(rawOperation: unknown): string | undefined {
  if (!isPlainObject(rawOperation)) {
    return undefined;
  }
  return typeof rawOperation.mode === "string" ? rawOperation.mode : undefined;
}

export function applyModBlock(
  record: Record<string, unknown>,
  sourceRecord: CopyModRawRecord,
  rawMod: unknown,
  sourcePath: string | undefined,
): readonly ModOperationDiagnostic[] {
  if (!isPlainObject(rawMod)) {
    return [
      diagnostic(
        "INVALID_MOD_PAYLOAD",
        "_mod block must be a plain object",
        sourceRecord,
        "_",
        undefined,
        sourcePath,
        rawMod,
      ),
    ];
  }

  const diagnostics: ModOperationDiagnostic[] = [];
  for (const [fieldTarget, rawOperations] of Object.entries(rawMod)) {
    for (const rawOperation of operationList(rawOperations)) {
      const mode = modeOf(rawOperation);
      if (mode === undefined) {
        diagnostics.push(
          diagnostic(
            "INVALID_MOD_PAYLOAD",
            "Mod operation payload missing string 'mode'",
            sourceRecord,
            fieldTarget,
            undefined,
            sourcePath,
            rawOperation,
          ),
        );
        continue;
      }

      if (ARRAY_MODES.has(mode)) {
        const applied = applyArrayModOperation(record[fieldTarget], rawOperation);
        if (Array.isArray(applied)) {
          record[fieldTarget] = applied;
        } else {
          diagnostics.push(enrichDiagnostic(applied, sourceRecord, fieldTarget, mode, sourcePath));
        }
        continue;
      }

      if (ROOT_MODES.has(mode)) {
        if (fieldTarget !== "_") {
          diagnostics.push(
            diagnostic(
              "MOD_FIELD_TARGET_MISSING",
              `${mode} must target "_"`,
              sourceRecord,
              fieldTarget,
              mode,
              sourcePath,
              rawOperation,
            ),
          );
          continue;
        }
        const rootDiagnostic = applyRootModOperation(record, rawOperation);
        if (rootDiagnostic !== undefined) {
          diagnostics.push(
            enrichDiagnostic(rootDiagnostic, sourceRecord, fieldTarget, mode, sourcePath),
          );
        }
        continue;
      }

      if (SCALAR_TEXT_MODES.has(mode)) {
        const scalarDiagnostic = applyScalarTextModOperation(record, fieldTarget, rawOperation);
        if (scalarDiagnostic !== undefined) {
          diagnostics.push(
            enrichDiagnostic(scalarDiagnostic, sourceRecord, fieldTarget, mode, sourcePath),
          );
        }
        continue;
      }

      diagnostics.push(
        diagnostic(
          "UNKNOWN_MOD_MODE",
          `Unknown _mod mode "${mode}"`,
          sourceRecord,
          fieldTarget,
          mode,
          sourcePath,
          rawOperation,
        ),
      );
    }
  }
  return diagnostics;
}
