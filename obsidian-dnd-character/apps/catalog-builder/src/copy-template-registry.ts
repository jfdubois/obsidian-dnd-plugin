import {
  cloneObject,
  cloneUnknown,
  deepFreeze,
  isPlainObject,
} from "./copy-materialization-merge";
import {
  templateDiagnostic,
  type CopyTemplateReference,
} from "./copy-template-diagnostics";
import type {
  AppliedCopyTemplateMetadata,
  CopyModRawRecord,
  MaterializationDiagnostic,
} from "./mod-types";
import type { ValidatedFileEnvelope } from "./raw-boundary";

export interface CopyTemplateRecord {
  readonly name: string;
  readonly source: string;
  readonly apply: {
    readonly _mod?: unknown;
    readonly _root?: Record<string, unknown>;
  };
  readonly metadata: AppliedCopyTemplateMetadata;
}

export interface CopyTemplateRegistry {
  readonly byKind: ReadonlyMap<string, readonly LocatedTemplateRecord[]>;
}

interface LocatedTemplateRecord {
  readonly record: CopyModRawRecord;
  readonly entityKind: string;
  readonly sourcePath: string;
}

const ENTITY_TO_TEMPLATE_COLLECTION = new Map([
  ["monster", "monsterTemplate"],
  ["legendaryGroup", "legendaryGroupTemplate"],
]);

function normalizedKey(name: string, source: string): string {
  return `${name.trim().toLowerCase()}|${source.trim().toLowerCase()}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter((part) => part.length > 0);
  if (parts.length === 0) return;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const existing = cursor[part];
    if (!isPlainObject(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = cloneUnknown(value);
}

function applyTemplateCopySetProps(remaining: Record<string, unknown>, rawMod: unknown): void {
  if (!isPlainObject(rawMod)) return;
  const rootOperations = rawMod._;
  const operations = Array.isArray(rootOperations) ? rootOperations : [rootOperations];
  for (const operation of operations) {
    if (!isPlainObject(operation)) continue;
    if (operation.mode === "setProp" && typeof operation.prop === "string") {
      setPath(remaining, operation.prop, operation.value);
    }
  }
}

function materializeTemplateCopy(
  located: LocatedTemplateRecord,
  registry: CopyTemplateRegistry,
  seen: ReadonlySet<string>,
): LocatedTemplateRecord {
  if (located.record.remaining.apply !== undefined) return located;
  const copyValue = located.record.remaining._copy;
  if (!isPlainObject(copyValue) || !isNonEmptyString(copyValue.name) || !isNonEmptyString(copyValue.source)) {
    return located;
  }
  const copyName = copyValue.name;
  const copySource = copyValue.source;
  const key = `${located.entityKind}|${normalizedKey(located.record.name, located.record.source)}`;
  if (seen.has(key)) return located;

  const matches = (registry.byKind.get(located.entityKind) ?? [])
    .filter(({ record }) => normalizedKey(record.name, record.source) === normalizedKey(copyName, copySource));
  if (matches.length !== 1) return located;

  const nextSeen = new Set(seen);
  nextSeen.add(key);
  const base = materializeTemplateCopy(matches[0]!, registry, nextSeen);
  const remaining = cloneObject(base.record.remaining);
  for (const [field, value] of Object.entries(located.record.remaining)) {
    if (!field.startsWith("_")) {
      remaining[field] = cloneUnknown(value);
    }
  }
  applyTemplateCopySetProps(remaining, copyValue._mod);

  return {
    record: {
      name: located.record.name,
      source: located.record.source,
      remaining,
    },
    entityKind: located.entityKind,
    sourcePath: located.sourcePath,
  };
}

export function buildCopyTemplateRegistry(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
): CopyTemplateRegistry {
  const byKind = new Map<string, LocatedTemplateRecord[]>();
  for (const [sourcePath, envelope] of Object.entries(validatedFiles)) {
    for (const collection of envelope.collections) {
      if (collection.entityKind !== "monsterTemplate" && collection.entityKind !== "legendaryGroupTemplate") {
        continue;
      }
      const existing = byKind.get(collection.entityKind) ?? [];
      existing.push(...collection.records.map((record) => ({
        record,
        entityKind: collection.entityKind,
        sourcePath,
      })));
      byKind.set(collection.entityKind, existing);
    }
  }
  return Object.freeze({
    byKind: deepFreeze(byKind),
  });
}

function validateTemplateRecord(
  located: LocatedTemplateRecord,
  referenceIndex: number,
  reference: CopyTemplateReference,
  sourceRecord: CopyModRawRecord,
  sourceEntityKind: string,
): { readonly ok: true; readonly template: CopyTemplateRecord } | {
  readonly ok: false;
  readonly diagnostic: MaterializationDiagnostic;
} {
  const rawRecord: Record<string, unknown> = {
    name: located.record.name,
    source: located.record.source,
    ...located.record.remaining,
  };
  const fail = (reason: string, raw: unknown, message: string) => ({
    ok: false as const,
    diagnostic: templateDiagnostic(
      "TEMPLATE_RECORD_INVALID",
      message,
      sourceRecord,
      located.sourcePath,
      sourceEntityKind,
      {
        templateReferenceIndex: referenceIndex,
        templateName: reference.name,
        templateSource: reference.source,
        rawTemplateReference: raw,
        validationReason: reason,
      },
    ),
  });

  if (!isPlainObject(rawRecord)) {
    return fail("NOT_PLAIN_OBJECT", rawRecord, "Template record must be a strict plain object");
  }
  if (!isNonEmptyString(rawRecord.name) || !isNonEmptyString(rawRecord.source)) {
    return fail("INVALID_NAME_OR_SOURCE", rawRecord, "Template record must include non-empty name and source");
  }
  const applyRaw = rawRecord.apply;
  if (!isPlainObject(applyRaw)) {
    return fail("INVALID_APPLY", applyRaw, "Template record apply must be a strict plain object");
  }
  const unknownApplyField = Object.keys(applyRaw).find((key) => key !== "_mod" && key !== "_root");
  if (unknownApplyField !== undefined) {
    return fail(`UNKNOWN_APPLY_FIELD:${unknownApplyField}`, applyRaw, "Template record apply contains an unsupported field");
  }
  if (applyRaw._mod !== undefined && !isPlainObject(applyRaw._mod)) {
    return fail("INVALID_MOD", applyRaw._mod, "Template apply._mod must be a strict plain object");
  }
  if (applyRaw._root !== undefined && !isPlainObject(applyRaw._root)) {
    return fail("INVALID_ROOT", applyRaw._root, "Template apply._root must be a strict plain object");
  }

  const apply: CopyTemplateRecord["apply"] = {};
  if (applyRaw._mod !== undefined) {
    (apply as Record<string, unknown>)._mod = cloneUnknown(applyRaw._mod);
  }
  if (applyRaw._root !== undefined) {
    (apply as Record<string, unknown>)._root = cloneObject(applyRaw._root);
  }

  return {
    ok: true,
    template: deepFreeze({
      name: rawRecord.name,
      source: rawRecord.source,
      apply,
      metadata: {
        name: rawRecord.name,
        source: rawRecord.source,
        entityKind: located.entityKind,
        sourcePath: located.sourcePath,
      },
    }),
  };
}

export function resolveCopyTemplate(
  registry: CopyTemplateRegistry,
  sourceEntityKind: string,
  reference: CopyTemplateReference,
  referenceIndex: number,
  sourceRecord: CopyModRawRecord,
  sourcePath: string,
): { readonly ok: true; readonly template: CopyTemplateRecord } | {
  readonly ok: false;
  readonly diagnostic: MaterializationDiagnostic;
} {
  const templateKind = ENTITY_TO_TEMPLATE_COLLECTION.get(sourceEntityKind);
  if (templateKind === undefined) {
    return {
      ok: false,
      diagnostic: templateDiagnostic(
        "TEMPLATE_ENTITY_KIND_UNSUPPORTED",
        `_templates is not supported for entity kind "${sourceEntityKind}"`,
        sourceRecord,
        sourcePath,
        sourceEntityKind,
        {
          templateReferenceIndex: referenceIndex,
          templateName: reference.name,
          templateSource: reference.source,
          rawTemplateReference: reference,
          validationReason: "UNSUPPORTED_ENTITY_KIND",
        },
      ),
    };
  }

  const matches = (registry.byKind.get(templateKind) ?? [])
    .filter(({ record }) => normalizedKey(record.name, record.source) === normalizedKey(reference.name, reference.source));
  if (matches.length === 0) {
    return {
      ok: false,
      diagnostic: templateDiagnostic(
        "TEMPLATE_NOT_FOUND",
        `Template "${reference.name}" (${reference.source}) was not found`,
        sourceRecord,
        sourcePath,
        sourceEntityKind,
        {
          templateReferenceIndex: referenceIndex,
          templateName: reference.name,
          templateSource: reference.source,
          rawTemplateReference: reference,
          validationReason: "NO_MATCH",
        },
      ),
    };
  }
  if (matches.length > 1) {
    const candidates = matches.map(({ record, entityKind, sourcePath: candidatePath }) =>
      deepFreeze({ name: record.name, source: record.source, entityKind, sourcePath: candidatePath }));
    return {
      ok: false,
      diagnostic: templateDiagnostic(
        "TEMPLATE_AMBIGUOUS",
        `Template "${reference.name}" (${reference.source}) matched multiple records`,
        sourceRecord,
        sourcePath,
        sourceEntityKind,
        {
          templateReferenceIndex: referenceIndex,
          templateName: reference.name,
          templateSource: reference.source,
          rawTemplateReference: reference,
          validationReason: "MULTIPLE_MATCHES",
          templateCandidates: Object.freeze(candidates),
        },
      ),
    };
  }
  const materialized = materializeTemplateCopy(matches[0]!, registry, new Set());
  return validateTemplateRecord(materialized, referenceIndex, reference, sourceRecord, sourceEntityKind);
}
