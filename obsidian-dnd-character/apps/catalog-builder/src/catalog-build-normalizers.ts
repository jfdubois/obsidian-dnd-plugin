import type { CatalogableEntity } from "./compact-index-tag-generator.js";
import type { RawRecord, ValidatedFileEnvelope } from "./raw-boundary.js";
import type { CopyModRawRecord } from "./mod-types.js";
import type { CopyResolverContext } from "./copy-resolver.js";
import type { FrozenReadonlySet } from "./species-source-inventory.js";
import type { ClassSourceScopeContext } from "./class-source-scope.js";
import type { SpeciesSourceScopeContext } from "./species-source-scope.js";
import type { BackgroundSourceScopeContext } from "./background-source-scope.js";
import type { FeatSourceScopeContext } from "./feat-source-scope.js";
import type { SpellSourceScopeContext } from "./spell-source-scope.js";
import type { ItemSourceScopeContext } from "./item-source-scope.js";
import type { SkillSourceScopeContext } from "./skill-source-scope.js";
import type { LanguageSourceScopeContext } from "./language-source-scope.js";
import type { OptionalFeatureSourceScopeContext } from "./optional-feature-source-scope.js";
import { normalizeSpecies } from "./species-normalizer.js";
import { normalizeBackgrounds } from "./background-normalizer.js";
import { normalizeClasses } from "./class-normalizer.js";
import { normalizeSubclasses } from "./subclass-normalizer.js";
import { normalizeClassFeatures } from "./class-feature-normalizer.js";
import { normalizeSubclassFeatures } from "./subclass-feature-normalizer.js";
import { normalizeFeats } from "./feat-normalizer.js";
import { normalizeSpells } from "./spell-normalizer.js";
import { normalizeItems } from "./item-normalizer.js";
import { normalizeOptionalFeatures } from "./optional-feature-normalizer.js";
import { normalizeSkills } from "./skill-normalizer.js";
import { normalizeLanguages } from "./language-normalizer.js";
import { loadClassIndex } from "./class-index-loader.js";
import { resolveCopyWithMods } from "./mod-copy-resolver.js";
import {
  collectKnownSources,
  collectCopyModSources,
  toCopyModRecord,
} from "./catalog-build-helpers.js";

export interface NormalizerResult {
  entities: CatalogableEntity[];
  diagnostics: readonly unknown[];
}

/* ── RawRecord normalizers (species, backgrounds) ──────────────── */

function normalizeSpeciesDirect(
  records: readonly RawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
  sourcePath?: string,
): NormalizerResult {
  const result = normalizeSpecies({
    records,
    context: context as SpeciesSourceScopeContext,
    sourcePath,
    entityKind: "species",
  });
  return { entities: result.species as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeBackgroundDirect(
  records: readonly RawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
  sourcePath?: string,
): NormalizerResult {
  const result = normalizeBackgrounds({
    records,
    context: context as BackgroundSourceScopeContext,
    sourcePath,
    entityKind: "background",
  });
  return { entities: result.backgrounds as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

export function normalizeRawRecordKind(
  entityKind: string,
  records: readonly RawRecord[],
  sourcePath?: string,
): NormalizerResult {
  const context = { knownPinnedSources: collectKnownSources(records) };

  switch (entityKind) {
    case "species":
      return normalizeSpeciesDirect(records, context, sourcePath);
    case "background":
      return normalizeBackgroundDirect(records, context, sourcePath);
    default:
      return { entities: [], diagnostics: [] };
  }
}

/* ── CopyModRawRecord normalizers (feats, spells, items, etc.) ─── */

function normalizeFeatDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeFeats({ records, context: context as FeatSourceScopeContext });
  return { entities: result.feats as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeSpellDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeSpells({ records, context: context as SpellSourceScopeContext });
  return { entities: result.spells as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeItemDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeItems({ records, context: context as ItemSourceScopeContext });
  return { entities: result.items as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeSkillDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeSkills({ records, context: context as SkillSourceScopeContext });
  return { entities: result.skills as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeLanguageDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeLanguages({ records, context: context as LanguageSourceScopeContext });
  return { entities: result.languages as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeClassFeatureDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeClassFeatures({ records, context: context as ClassSourceScopeContext });
  return { entities: result.features as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeSubclassFeatureDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeSubclassFeatures({ records, context: context as ClassSourceScopeContext });
  return { entities: result.features as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

function normalizeOptionalFeatureDirect(
  records: readonly CopyModRawRecord[],
  context: { knownPinnedSources: FrozenReadonlySet<string> },
): NormalizerResult {
  const result = normalizeOptionalFeatures({ records, context: context as OptionalFeatureSourceScopeContext });
  return { entities: result.optionalFeatures as unknown as CatalogableEntity[], diagnostics: result.diagnostics };
}

/** Resolve copy+mod inheritance for a batch of RawRecord records. */
function resolveCopiesForKind(
  records: readonly RawRecord[],
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  entityKind: string,
  sourcePath: string,
): { resolved: CopyModRawRecord[]; diagnostics: readonly unknown[] } {
  const copyResolverContext: CopyResolverContext = { validatedFiles };
  const copyModContext = { sourcePath, sourceEntityKind: entityKind };
  const resolved: CopyModRawRecord[] = [];
  const diagnostics: unknown[] = [];

  for (const record of records) {
    const copyModRecord = toCopyModRecord(record);
    const resolution = resolveCopyWithMods(copyModRecord, copyResolverContext, copyModContext);
    if (resolution.ok) {
      resolved.push(resolution.record);
    }
    if (resolution.diagnostics.length > 0) {
      diagnostics.push(...resolution.diagnostics);
    }
  }

  return { resolved, diagnostics: Object.freeze(diagnostics) };
}

export function normalizeCopyModKind(
  entityKind: string,
  records: readonly RawRecord[],
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  sourcePath?: string,
): NormalizerResult {
  const resolved = resolveCopiesForKind(records, validatedFiles, entityKind, sourcePath ?? "");
  const context = { knownPinnedSources: collectCopyModSources(resolved.resolved) };

  switch (entityKind) {
    case "feat":
      return normalizeFeatDirect(resolved.resolved, context);
    case "spell":
      return normalizeSpellDirect(resolved.resolved, context);
    case "item":
      return normalizeItemDirect(resolved.resolved, context);
    case "skill":
      return normalizeSkillDirect(resolved.resolved, context);
    case "language":
      return normalizeLanguageDirect(resolved.resolved, context);
    case "class-feature":
      return normalizeClassFeatureDirect(resolved.resolved, context);
    case "subclass-feature":
      return normalizeSubclassFeatureDirect(resolved.resolved, context);
    case "optional-feature":
      return normalizeOptionalFeatureDirect(resolved.resolved, context);
    default:
      return { entities: [], diagnostics: resolved.diagnostics };
  }
}

/* ── IndexedClassEntry normalizers (classes, subclasses) ───────── */

export function normalizeClassIndexKind(
  validatedFiles: Record<string, ValidatedFileEnvelope>,
  sourceScopeContext: ClassSourceScopeContext,
): {
  entities: CatalogableEntity[];
  diagnostics: readonly unknown[];
  classCount: number;
  subclassCount: number;
} {
  const copyResolverContext: CopyResolverContext = { validatedFiles };

  const indexResult = loadClassIndex({
    validatedFiles,
    copyResolverContext,
    sourceScopeContext,
    entityKind: "class",
  });

  const allDiagnostics: unknown[] = [...indexResult.diagnostics];

  const baseClasses = indexResult.classes.filter((entry) => !entry.isSubclass);
  const subclassEntries = indexResult.classes.filter((entry) => entry.isSubclass);

  const classResult = normalizeClasses({ entries: baseClasses });
  const classEntities = classResult.classes as unknown as CatalogableEntity[];
  allDiagnostics.push(...classResult.diagnostics);

  const subclassResult = normalizeSubclasses({
    entries: subclassEntries,
    context: sourceScopeContext,
  });
  const subclassEntities = subclassResult.subclasses as unknown as CatalogableEntity[];
  allDiagnostics.push(...subclassResult.diagnostics);

  return {
    entities: [...classEntities, ...subclassEntities],
    diagnostics: Object.freeze(allDiagnostics),
    classCount: baseClasses.length,
    subclassCount: subclassEntries.length,
  };
}
