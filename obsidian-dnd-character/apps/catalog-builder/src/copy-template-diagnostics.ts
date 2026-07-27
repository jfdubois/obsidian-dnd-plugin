import { isPlainObject } from "./copy-materialization-merge";
import type {
  CopyModRawRecord,
  MaterializationDiagnostic,
} from "./mod-types";

export interface CopyTemplateReference {
  readonly name: string;
  readonly source: string;
}

export function templateDiagnostic(
  code: MaterializationDiagnostic["code"],
  message: string,
  sourceRecord: CopyModRawRecord,
  sourcePath: string,
  sourceEntityKind: string,
  options: {
    readonly templateReferenceIndex?: number;
    readonly templateName?: string;
    readonly templateSource?: string;
    readonly rawTemplateReference?: unknown;
    readonly validationReason?: string;
    readonly templateCandidates?: MaterializationDiagnostic["templateCandidates"];
  },
): MaterializationDiagnostic {
  return Object.freeze({
    code,
    severity: "error",
    message,
    sourcePath,
    sourceEntityKind,
    entityName: sourceRecord.name,
    entitySource: sourceRecord.source,
    fieldTarget: "_copy._templates",
    mode: undefined,
    rawParam: options.rawTemplateReference,
    templateReferenceIndex: options.templateReferenceIndex,
    templateName: options.templateName,
    templateSource: options.templateSource,
    rawTemplateReference: options.rawTemplateReference,
    validationReason: options.validationReason,
    templateCandidates: options.templateCandidates,
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateTemplateReferences(
  rawTemplates: unknown,
  sourceRecord: CopyModRawRecord,
  sourcePath: string,
  sourceEntityKind: string,
): { readonly ok: true; readonly references: readonly CopyTemplateReference[] } | {
  readonly ok: false;
  readonly diagnostic: MaterializationDiagnostic;
} {
  if (!Array.isArray(rawTemplates) || rawTemplates.length === 0) {
    return {
      ok: false,
      diagnostic: templateDiagnostic(
        "TEMPLATE_REFERENCE_INVALID",
        "_copy._templates must be a non-empty array",
        sourceRecord,
        sourcePath,
        sourceEntityKind,
        { rawTemplateReference: rawTemplates, validationReason: "NOT_NON_EMPTY_ARRAY" },
      ),
    };
  }

  const references: CopyTemplateReference[] = [];
  for (let i = 0; i < rawTemplates.length; i += 1) {
    const rawReference = rawTemplates[i];
    const base = {
      templateReferenceIndex: i,
      rawTemplateReference: rawReference,
    };
    if (!isPlainObject(rawReference)) {
      return {
        ok: false,
        diagnostic: templateDiagnostic(
          "TEMPLATE_REFERENCE_INVALID",
          `_copy._templates[${i}] must be a strict plain object`,
          sourceRecord,
          sourcePath,
          sourceEntityKind,
          { ...base, validationReason: "NOT_PLAIN_OBJECT" },
        ),
      };
    }

    const unknownKey = Object.keys(rawReference).find((key) => key !== "name" && key !== "source");
    if (unknownKey !== undefined) {
      return {
        ok: false,
        diagnostic: templateDiagnostic(
          "TEMPLATE_REFERENCE_INVALID",
          `_copy._templates[${i}] contains unsupported field "${unknownKey}"`,
          sourceRecord,
          sourcePath,
          sourceEntityKind,
          { ...base, validationReason: `UNKNOWN_FIELD:${unknownKey}` },
        ),
      };
    }

    if (!isNonEmptyString(rawReference.name) || !isNonEmptyString(rawReference.source)) {
      return {
        ok: false,
        diagnostic: templateDiagnostic(
          "TEMPLATE_REFERENCE_INVALID",
          `_copy._templates[${i}] must include non-empty string name and source`,
          sourceRecord,
          sourcePath,
          sourceEntityKind,
          {
            ...base,
            templateName: typeof rawReference.name === "string" ? rawReference.name : undefined,
            templateSource: typeof rawReference.source === "string" ? rawReference.source : undefined,
            validationReason: "INVALID_NAME_OR_SOURCE",
          },
        ),
      };
    }

    references.push({ name: rawReference.name, source: rawReference.source });
  }

  return { ok: true, references };
}
