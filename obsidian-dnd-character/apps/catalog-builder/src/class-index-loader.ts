import type { CopyResolverContext } from "./copy-resolver";
import type { CopyModRawRecord } from "./mod-types";
import { materializeCopyWithMods, type CopyModContext } from "./mod-copy-resolver";
import type { RawRecord } from "./raw-boundary";
import { classifyClassSourceScope, type ClassSourceScopeContext } from "./class-source-scope";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
export {
  type ClassIndexDiagnostic,
  type ClassIndexDiagnosticCode,
  type IndexedClassEntry,
  type ClassIndexLoaderInput,
  type ClassIndexLoaderResult,
} from "./class-index-types";
import type {
  ClassIndexDiagnostic,
  IndexedClassEntry,
  ClassIndexLoaderInput,
  ClassIndexLoaderResult,
} from "./class-index-types";
import {
  makeDiagnostic,
  isSubclassRecord,
  extractParentId,
  extractHitDie,
  extractPrimaryAbilities2014,
  extractPrimaryAbilities2024,
  extractSavingThrows2014,
  extractSavingThrows2024,
  extractAbilityArray,
  collectClassRecords,
  extractStartingArmorProficiencies,
  extractStartingWeaponProficiencies,
  extractStartingToolProficiencies,
  extractStartingSkillChoices,
  extractStartingEquipment,
  extractStartingGold,
  extractLevelOneFeatures,
} from "./class-index-helpers";

/* ── Single record indexer ─────────────────────────────────────── */

type SingleIndexResult =
  | { readonly ok: true; readonly entry: IndexedClassEntry; readonly diagnostics: readonly ClassIndexDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly ClassIndexDiagnostic[] };

function indexSingleClass(
  record: RawRecord,
  sourcePath: string,
  entityKind: string,
  recordIndex: number,
  copyResolverContext: CopyResolverContext,
  sourceScopeContext: ClassSourceScopeContext,
): SingleIndexResult {
  const diagnostics: ClassIndexDiagnostic[] = [];
  const opts = { sourcePath, entityKind, recordIndex };

  // 1. Classify source scope
  const scopeResult = classifyClassSourceScope(
    { record, sourcePath, entityKind, recordIndex },
    sourceScopeContext,
  );

  if (!scopeResult.ok) {
    const code = scopeResult.diagnostic.code === "INVALID_SOURCE"
      ? "INVALID_SOURCE"
      : scopeResult.diagnostic.code === "UNKNOWN_SOURCE"
        ? "UNKNOWN_SOURCE"
        : "EXCLUDED_SOURCE";
    diagnostics.push(makeDiagnostic(
      code,
      scopeResult.diagnostic.message,
      record.name,
      opts,
      scopeResult.diagnostic.source,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 2. Resolve _copy/_mod inheritance if present
  let resolvedRecord: CopyModRawRecord;
  const copyValue = record.remaining._copy;
  if (copyValue !== undefined && copyValue !== null) {
    const copyModContext: CopyModContext = {
      sourcePath,
      sourceEntityKind: entityKind,
    };

    const copyRecord: CopyModRawRecord = {
      name: record.name,
      source: record.source,
      remaining: record.remaining,
    };

    const materialized = materializeCopyWithMods(
      copyRecord,
      copyResolverContext,
      copyModContext,
    );

    if (!materialized.ok) {
      for (const diag of materialized.diagnostics) {
        diagnostics.push(makeDiagnostic(
          "COPY_RESOLUTION_FAILED",
          diag.message,
          record.name,
          opts,
          diag.entitySource,
        ));
      }
      return { ok: false, diagnostics: Object.freeze(diagnostics) };
    }

    resolvedRecord = materialized.result.record;
  } else {
    resolvedRecord = {
      name: record.name,
      source: record.source,
      remaining: record.remaining,
    };
  }

  // 3. Generate canonical ID
  const idResult = createCanonicalEntityId({
    kind: "class",
    ruleset: scopeResult.ruleset,
    source: scopeResult.source,
    name: record.name,
  });

  if (!idResult.ok) {
    diagnostics.push(makeDiagnostic(
      "INVALID_CANONICAL_ID",
      idResult.diagnostic.message,
      record.name,
      opts,
    ));
    return { ok: false, diagnostics: Object.freeze(diagnostics) };
  }

  // 4. Check if subclass
  const isSubclass = isSubclassRecord(resolvedRecord);
  const parentId = isSubclass ? extractParentId(resolvedRecord) : undefined;

  // 5. Extract class-specific fields (ruleset-aware)
  const remaining = resolvedRecord.remaining;
  const hitDie = extractHitDie(remaining);

  if (hitDie === undefined) {
    diagnostics.push(makeDiagnostic(
      "MISSING_HIT_DIE",
      `Class "${record.name}" is missing a valid hitdie field.`,
      record.name,
      opts,
    ));
  } else if (hitDie < 1 || hitDie > 12) {
    diagnostics.push(makeDiagnostic(
      "INVALID_HIT_DIE",
      `Class "${record.name}" has an invalid hitdie value: ${hitDie}.`,
      record.name,
      opts,
    ));
  }

  // Extract primary abilities and saving throws based on ruleset
  let primaryAbilities: readonly string[];
  let savingThrowProficiencies: readonly string[];

  if (scopeResult.ruleset === "2024") {
    // 2024 (XPHB): primaryAbility array-of-objects, proficiencies with type: "saving_throw"
    primaryAbilities = extractPrimaryAbilities2024(remaining);
    savingThrowProficiencies = extractSavingThrows2024(remaining);
  } else {
    // 2014 (PHB): proficiency array for both saving throws and primary abilities
    primaryAbilities = extractPrimaryAbilities2014(remaining);
    savingThrowProficiencies = extractSavingThrows2014(remaining);
  }

  // Fallback: if ruleset-specific extractors return empty, try legacy field names
  if (primaryAbilities.length === 0) {
    primaryAbilities = extractAbilityArray(remaining, "primaryability");
  }
  if (savingThrowProficiencies.length === 0) {
    savingThrowProficiencies = extractAbilityArray(remaining, "savingthrows");
  }

  if (primaryAbilities.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_PRIMARY_ABILITIES",
      `Class "${record.name}" is missing primary ability scores.`,
      record.name,
      opts,
    ));
  }

  if (savingThrowProficiencies.length === 0) {
    diagnostics.push(makeDiagnostic(
      "MISSING_SAVING_THROW_PROFICIENCIES",
      `Class "${record.name}" is missing saving throw proficiencies.`,
      record.name,
      opts,
    ));
  }

  // 6. Extract starting proficiencies
  const startingArmorProficiencies = extractStartingArmorProficiencies(remaining);
  const startingWeaponProficiencies = extractStartingWeaponProficiencies(remaining);
  const startingToolProficiencies = extractStartingToolProficiencies(remaining);
  const startingSkillChoices = extractStartingSkillChoices(remaining);

  // 7. Extract starting equipment
  const { grants: startingEquipmentGrants, choices: startingEquipmentChoices, diagnostics: startingEquipmentDiagnostics } = extractStartingEquipment(remaining);
  for (const message of startingEquipmentDiagnostics) {
    diagnostics.push(makeDiagnostic(
      "UNSUPPORTED_STARTING_EQUIPMENT",
      `Class "${record.name}" has unsupported starting equipment: ${message}`,
      record.name,
      opts,
    ));
  }

  // 8. Extract starting gold
  const startingGold = extractStartingGold(remaining);

  // 9. Extract level-one features
  const levelOneFeatures = extractLevelOneFeatures(remaining);

  // 10. Build indexed entry
  const entry: IndexedClassEntry = Object.freeze({
    id: idResult.id,
    sourceId: idResult.sourceId,
    name: record.name,
    source: record.source,
    ruleset: scopeResult.ruleset,
    record: resolvedRecord,
    isSubclass,
    parentId,
    hitDie,
    primaryAbilities,
    savingThrowProficiencies,
    startingArmorProficiencies,
    startingWeaponProficiencies,
    startingToolProficiencies,
    startingSkillChoices,
    startingEquipmentGrants,
    startingEquipmentChoices,
    startingGold,
    levelOneFeatures,
    diagnostics: Object.freeze(diagnostics),
  });

  return { ok: true, entry, diagnostics: Object.freeze(diagnostics) };
}

/* ── Public loader ─────────────────────────────────────────────── */

export function loadClassIndex(input: ClassIndexLoaderInput): ClassIndexLoaderResult {
  const classes: IndexedClassEntry[] = [];
  const diagnostics: ClassIndexDiagnostic[] = [];
  let excludedRecords = 0;
  let resolutionFailures = 0;

  // 1. Collect all class records from validated files
  const classRecords = collectClassRecords(
    input.validatedFiles,
    input.entityKind,
  );

  // 2. Index each record
  for (const { record, sourcePath, entityKind, recordIndex } of classRecords) {
    const result = indexSingleClass(
      record,
      sourcePath,
      entityKind,
      recordIndex,
      input.copyResolverContext,
      input.sourceScopeContext,
    );

    if (result.ok) {
      classes.push(result.entry);
    }

    // Track exclusion and resolution failure counts
    for (const diag of result.diagnostics) {
      if (diag.code === "EXCLUDED_SOURCE" || diag.code === "INVALID_SOURCE" || diag.code === "UNKNOWN_SOURCE") {
        excludedRecords++;
      } else if (diag.code === "COPY_RESOLUTION_FAILED") {
        resolutionFailures++;
      }
    }

    diagnostics.push(...result.diagnostics);
  }

  // 3. Compute summary
  const baseClasses = classes.filter((c) => !c.isSubclass).length;
  const subclasses = classes.filter((c) => c.isSubclass).length;

  return Object.freeze({
    classes: Object.freeze(classes),
    diagnostics: Object.freeze(diagnostics),
    summary: Object.freeze({
      totalRecords: classRecords.length,
      indexedClasses: classes.length,
      baseClasses,
      subclasses,
      excludedRecords,
      resolutionFailures,
    }),
  });
}
