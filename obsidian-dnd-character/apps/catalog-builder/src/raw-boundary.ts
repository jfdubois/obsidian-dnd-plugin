import type { DiagnosticSeverity } from "./raw-loader";

/* ── Known raw fields registry ─────────────────────────────────── */

const KNOWN_RAW_FIELDS_SET: ReadonlySet<string> = new Set([
  /* ── Envelope fields ───────────────────────────────────────── */
  "name",
  "source",

  /* ── Structural / metadata fields ──────────────────────────── */
  "id",
  "group",
  "category",
  "page",
  "edition",
  "published",
  "author",
  "srd",
  "basicRules",
  "otherSources",
  "referenceSources",
  "reprintedAs",
  "hasFluff",
  "hasFluffImages",
  "_versions",

  /* ── Size / speed / physical ───────────────────────────────── */
  "size",
  "speed",
  "hd",
  "ac",

  /* ── Ability scores ────────────────────────────────────────── */
  "ability",

  /* ── Traits / tags ─────────────────────────────────────────── */
  "traitTags",

  /* ── Proficiencies ─────────────────────────────────────────── */
  "proficiency",
  "startingProficiencies",
  "skillProficiencies",
  "toolProficiencies",
  "languageProficiencies",
  "savingThrowProficiencies",
  "armorProficiencies",
  "weaponProficiencies",

  /* ── Equipment ─────────────────────────────────────────────── */
  "startingEquipment",
  "equipment",
  "additionalEquipment",

  /* ── Spellcasting ──────────────────────────────────────────── */
  "spellcasting",
  "additionalSpells",
  "rituals",
  "level",
  "school",
  "time",
  "range",
  "components",
  "duration",
  "concentration",
  "area",
  "target",
  "attack",
  "damage",
  "save",

  /* ── Combat / mechanics ────────────────────────────────────── */
  "cr",
  "alignment",
  "xp",
  "legendary",
  "legendaryresistance",
  "lair",
  "region",
  "mythic",
  "actions",
  "reactions",
  "bonusActions",
  "specialDelivers",
  "specialSenses",
  "senses",
  "immunities",
  "resistances",
  "vulnerabilities",
  "conditionImmunities",
  "challenge",
  "perception",
  "passivePerception",

  /* ── Prerequisites / requirements ──────────────────────────── */
  "prerequisite",

  /* ── Race / character creation ─────────────────────────────── */
  "age",
  "ability",
  "darkvision",
  "ancestry",
  "lineage",

  /* ── Features / grants ─────────────────────────────────────── */
  "features",
  "grants",
  "subclassFeatures",
  "subclassFeature",

  /* ── Feat-specific ─────────────────────────────────────────── */
  "expertise",
  "additionalProficiencies",

  /* ── Item-specific ─────────────────────────────────────────── */
  "type",
  "rarity",
  "cost",
  "weight",
  "bulk",
  "attunement",
  "requiresAttunement",
  "variant",
  "variants",
  "properties",
  "damage",
  "uses",
  "charges",

  /* ── Background-specific ───────────────────────────────────── */
  "feature",
  "features",

  /* ── Class-specific ────────────────────────────────────────── */
  "hitDice",
  "proficiencies",

  /* ── Deity-specific ────────────────────────────────────────── */
  "domains",
  "pantheon",
  "sphere",

  /* ── Variant rules / optional features ─────────────────────── */
  "variant",
  "variants",

  /* ── Audio / media ─────────────────────────────────────────── */
  "soundClip",

  /* ── Contents / book structure ─────────────────────────────── */
  "contents",
  "cover",

  /* ── Miscellaneous recognized fields ───────────────────────── */
  "url",
  "tags",
  "notes",
]);

export const KNOWN_RAW_FIELDS: ReadonlySet<string> = KNOWN_RAW_FIELDS_SET;

const NARRATIVE_FIELDS: ReadonlySet<string> = new Set([
  "entries",
  "description",
  "text",
]);

const ENVELOPE_FIELDS: ReadonlySet<string> = new Set(["name", "source"]);

/* ── Types ─────────────────────────────────────────────────────── */

export type FieldClassificationKind = "envelope" | "known-raw" | "unclaimed" | "narrative";

export interface FieldClassification {
  [fieldName: string]: FieldClassificationKind;
}

export interface UnclaimedFieldDiagnostic {
  code: "UNCLAIMED_FIELD";
  severity: "warning";
  message: string;
  path: string;
  field: string;
  entityKind: string;
  recordName: string;
  recordIndex: number;
}

export interface RawRecord {
  name: string;
  source: string;
  remaining: Record<string, unknown>;
}

export interface ValidatedCollection {
  entityKind: string;
  records: RawRecord[];
  recordCount: number;
}

export interface ValidatedFileEnvelope {
  filePath: string;
  collections: ValidatedCollection[];
  totalRecords: number;
}

export interface RawBoundaryDiagnostic {
  code:
    | "INVALID_FILE_ENVELOPE"
    | "INVALID_RECORD_ENVELOPE"
    | "UNCLAIMED_FIELD"
    | "EMPTY_RECORDS_ARRAY"
    | "NON_OBJECT_RECORD"
    | "VALID_FILE";
  severity: DiagnosticSeverity;
  message: string;
  path: string;
  entityKind?: string;
  recordIndex?: number;
  recordName?: string;
}

export interface FieldInventory {
  envelope: string[];
  knownRaw: string[];
  unclaimed: string[];
  narrative: string[];
}

export interface RawBoundaryResult {
  validatedFiles: Record<string, ValidatedFileEnvelope>;
  diagnostics: RawBoundaryDiagnostic[];
  unclaimedDiagnostics: UnclaimedFieldDiagnostic[];
  fieldInventory: FieldInventory;
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    totalRecords: number;
    unclaimedFieldsCount: number;
    totalCollections: number;
  };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function classifyField(fieldName: string): FieldClassificationKind {
  if (ENVELOPE_FIELDS.has(fieldName)) {
    return "envelope";
  }
  if (NARRATIVE_FIELDS.has(fieldName)) {
    return "narrative";
  }
  if (KNOWN_RAW_FIELDS_SET.has(fieldName)) {
    return "known-raw";
  }
  return "unclaimed";
}

function classifyRecordFields(
  record: Record<string, unknown>,
): FieldClassification {
  const classification: FieldClassification = {};
  for (const fieldName of Object.keys(record)) {
    classification[fieldName] = classifyField(fieldName);
  }
  return classification;
}

/* ── File envelope validation ──────────────────────────────────── */

interface FileEnvelopeParseResult {
  valid: boolean;
  collections?: Array<{ key: string; records: unknown[] }>;
  error?: string;
}

function parseFileEnvelope(data: unknown): FileEnvelopeParseResult {
  if (!isPlainObject(data)) {
    return {
      valid: false,
      error: `Expected an object at the top level, got ${typeof data}`,
    };
  }

  const keys = Object.keys(data);

  // Collect ALL top-level array-valued keys as independent collections.
  // _meta.internalCopies is relationship metadata, NOT a discard filter.
  const collections: Array<{ key: string; records: unknown[] }> = [];
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) {
      collections.push({ key, records: value });
    }
  }

  if (collections.length === 0) {
    return {
      valid: false,
      error: `No array-valued key found. Expected at least one key with an array value (the entity kind). Found keys: ${keys.map((k) => `"${k}"`).join(", ")}`,
    };
  }

  return { valid: true, collections };
}

/* ── Record envelope validation ────────────────────────────────── */

interface RecordEnvelopeParseResult {
  valid: boolean;
  record?: RawRecord;
  errors?: string[];
}

function parseRecordEnvelope(
  raw: unknown,
  index: number,
): RecordEnvelopeParseResult {
  if (!isPlainObject(raw)) {
    return {
      valid: false,
      errors: [`Record at index ${index} is not an object (got ${typeof raw})`],
    };
  }

  const record = raw as Record<string, unknown>;
  const errors: string[] = [];

  if (!isNonEmptyString(record.name)) {
    errors.push(
      `Record at index ${index}: missing or invalid "name" field (expected non-empty string, got ${JSON.stringify(record.name)})`,
    );
  }

  if (!isNonEmptyString(record.source)) {
    errors.push(
      `Record at index ${index}: missing or invalid "source" field (expected non-empty string, got ${JSON.stringify(record.source)})`,
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build remaining fields (everything except envelope fields)
  const remaining: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!ENVELOPE_FIELDS.has(key)) {
      remaining[key] = value;
    }
  }

  return {
    valid: true,
    record: {
      name: record.name as string,
      source: record.source as string,
      remaining,
    },
  };
}

/* ── Main validation ───────────────────────────────────────────── */

export function validateRawBoundary(
  files: Record<string, unknown>,
): RawBoundaryResult {
  const validatedFiles: Record<string, ValidatedFileEnvelope> = {};
  const diagnostics: RawBoundaryDiagnostic[] = [];
  const unclaimedDiagnostics: UnclaimedFieldDiagnostic[] = [];

  // Global field inventory collectors
  const allEnvelopeFields = new Set<string>();
  const allKnownRawFields = new Set<string>();
  const allUnclaimedFields = new Set<string>();
  const allNarrativeFields = new Set<string>();

  let validFiles = 0;
  let invalidFiles = 0;
  let totalRecords = 0;
  let totalCollections = 0;

  for (const [filePath, data] of Object.entries(files)) {
    // 1. Validate file envelope
    const envelopeResult = parseFileEnvelope(data);

    if (!envelopeResult.valid) {
      invalidFiles++;
      diagnostics.push({
        code: "INVALID_FILE_ENVELOPE",
        severity: "error",
        message: `Invalid file envelope in "${filePath}": ${envelopeResult.error}`,
        path: filePath,
      });
      continue;
    }

    const collections = envelopeResult.collections!;

    // 2. Process each collection independently
    const fileCollections: ValidatedCollection[] = [];
    let fileHasErrors = false;

    for (const { key: entityKind, records } of collections) {
      // Validate records array is not empty
      if (records.length === 0) {
        diagnostics.push({
          code: "EMPTY_RECORDS_ARRAY",
          severity: "warning",
          message: `File "${filePath}" has an empty records array for entity kind "${entityKind}".`,
          path: filePath,
        });
        fileCollections.push({
          entityKind: entityKind as string,
          records: [],
          recordCount: 0,
        });
        totalCollections++;
        continue;
      }

      // Validate each record in this collection
      const validRecords: RawRecord[] = [];

      for (let i = 0; i < records.length; i++) {
        const raw = records[i];

        if (!isPlainObject(raw)) {
          fileHasErrors = true;
          diagnostics.push({
            code: "NON_OBJECT_RECORD",
            severity: "error",
            message: `File "${filePath}": record at index ${i} in "${entityKind}" collection is not an object (got ${typeof raw}).`,
            path: filePath,
            entityKind: entityKind as string,
            recordIndex: i,
          });
          continue;
        }

        const recordResult = parseRecordEnvelope(raw, i);
        const rawRecord = raw as Record<string, unknown>;

        if (!recordResult.valid) {
          fileHasErrors = true;
          for (const error of recordResult.errors ?? []) {
            diagnostics.push({
              code: "INVALID_RECORD_ENVELOPE",
              severity: "error",
              message: `File "${filePath}": ${error}`,
              path: filePath,
              entityKind: entityKind as string,
              recordIndex: i,
              recordName: isNonEmptyString(rawRecord.name) ? rawRecord.name as string : undefined,
            });
          }
          continue;
        }

        validRecords.push(recordResult.record as RawRecord);

        // Classify fields for this record
        const classification = classifyRecordFields(raw as Record<string, unknown>);
        for (const [fieldName, kind] of Object.entries(classification)) {
          switch (kind) {
            case "envelope":
              allEnvelopeFields.add(fieldName);
              break;
            case "known-raw":
              allKnownRawFields.add(fieldName);
              break;
            case "narrative":
              allNarrativeFields.add(fieldName);
              break;
            case "unclaimed":
              allUnclaimedFields.add(fieldName);
              unclaimedDiagnostics.push({
                code: "UNCLAIMED_FIELD",
                severity: "warning",
                message: `Field "${fieldName}" in record "${recordResult.record!.name}" (index ${i}) of "${entityKind}" collection in file "${filePath}" is not claimed by any importer.`,
                path: filePath,
                field: fieldName,
                entityKind: entityKind as string,
                recordName: recordResult.record!.name,
                recordIndex: i,
              });
              break;
          }
        }
      }

      fileCollections.push({
        entityKind: entityKind as string,
        records: validRecords,
        recordCount: validRecords.length,
      });
      totalCollections++;
      totalRecords += validRecords.length;
    }

    // Determine if file is valid: at least one collection must have records,
    // or all collections are empty (with warnings).
    const hasAnyRecords = fileCollections.some((c) => c.recordCount > 0);
    if (fileHasErrors && !hasAnyRecords) {
      invalidFiles++;
    } else {
      validFiles++;
      validatedFiles[filePath] = {
        filePath,
        collections: fileCollections,
        totalRecords: fileCollections.reduce((sum, c) => sum + c.recordCount, 0),
      };

      diagnostics.push({
        code: "VALID_FILE",
        severity: "info",
        message: `File "${filePath}": validated ${fileCollections.length} collection(s) with ${validatedFiles[filePath].totalRecords} total records.`,
        path: filePath,
      });
    }
  }

  return {
    validatedFiles,
    diagnostics,
    unclaimedDiagnostics,
    fieldInventory: {
      envelope: [...allEnvelopeFields].sort(),
      knownRaw: [...allKnownRawFields].sort(),
      unclaimed: [...allUnclaimedFields].sort(),
      narrative: [...allNarrativeFields].sort(),
    },
    summary: {
      totalFiles: Object.keys(files).length,
      validFiles,
      invalidFiles,
      totalRecords,
      unclaimedFieldsCount: unclaimedDiagnostics.length,
      totalCollections,
    },
  };
}
