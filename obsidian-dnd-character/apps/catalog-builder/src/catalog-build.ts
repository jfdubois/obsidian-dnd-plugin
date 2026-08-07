import * as path from "node:path";
import type { BuilderConfig } from "./config.js";
import { BUILDER_VERSION } from "./config.js";
import type { SourceManifest } from "./source-manifest.js";
import type { PublishCatalogReleaseResult } from "./catalog-publisher.js";
import type { RawRecord } from "./raw-boundary.js";
import type { CatalogableEntity } from "./compact-index-tag-generator.js";
import type { ClassSourceScopeContext } from "./class-source-scope.js";
import { loadRawJsonFiles } from "./raw-loader.js";
import { validateRawBoundary } from "./raw-boundary.js";
import { resolveReferences } from "./reference-resolver.js";
import { buildCompactIndex, buildDetailPath } from "./compact-index-builder.js";
import { generateManifest } from "./manifest-generator.js";
import { buildValidationReport } from "./validation-report.js";
import { buildInventoryReport } from "./inventory-report.js";
import { computeChecksums } from "./checksum.js";
import { publishCatalogRelease } from "./catalog-publisher.js";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import { resolveEntityKind, RAW_RECORD_KINDS, COPY_MOD_KINDS, collectKnownSources } from "./catalog-build-helpers.js";
import {
  normalizeRawRecordKind,
  normalizeCopyModKind,
  normalizeClassIndexKind,
} from "./catalog-build-normalizers.js";
import { loadSources } from "./catalog-build-sources.js";
import { validateRequiredEntityKinds } from "./catalog-build-publication-guard.js";

export interface CatalogBuildResult {
  readonly publishResult: PublishCatalogReleaseResult;
  readonly entityCount: number;
  readonly kindCount: number;
  readonly sourceRevision: string;
  readonly catalogRevision: string;
  readonly diagnostics: readonly string[];
}

/**
 * Assemble the full catalog build pipeline from raw 5eTools JSON.
 * Loads, validates, normalizes, indexes, and publishes a catalog revision.
 */
export function buildCatalog(
  config: BuilderConfig,
  sourceManifest: SourceManifest,
): CatalogBuildResult {
  const diagnostics: string[] = [];

  /* Step 1: Load raw JSON files */
  const loadResult = loadRawJsonFiles(config.clonePath);
  if (loadResult.summary.successfullyParsed === 0) {
    const errors = loadResult.diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => d.message);
    return createFailureResult(errors, sourceManifest.commitHash);
  }
  diagnostics.push(`Loaded ${loadResult.summary.successfullyParsed} JSON files (${loadResult.summary.parseFailures} parse failures)`);

  /* Step 2: Validate raw boundary */
  const boundaryResult = validateRawBoundary(loadResult.files);
  if (boundaryResult.summary.validFiles === 0) {
    const errors = boundaryResult.diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => d.message);
    return createFailureResult(errors, sourceManifest.commitHash);
  }
  diagnostics.push(`Validated ${boundaryResult.summary.validFiles} files with ${boundaryResult.summary.totalRecords} records`);

  /* Step 3: Group records by entity kind */
  const recordsByKind = new Map<string, { records: RawRecord[]; sourcePath: string }>();
  for (const [filePath, envelope] of Object.entries(boundaryResult.validatedFiles)) {
    for (const collection of envelope.collections) {
      if (collection.recordCount === 0) continue;
      const kind = resolveEntityKind(collection.entityKind);
      const existing = recordsByKind.get(kind);
      if (existing) {
        existing.records.push(...collection.records);
      } else {
        recordsByKind.set(kind, { records: [...collection.records], sourcePath: filePath });
      }
    }
  }

  /* Step 4: Build source scope context for class indexing */
  const allClassRecords: RawRecord[] = [];
  if (recordsByKind.has("class")) {
    allClassRecords.push(...recordsByKind.get("class")!.records);
  }
  const classSourceScopeContext: ClassSourceScopeContext = {
    knownPinnedSources: collectKnownSources(allClassRecords),
  };

  /* Step 5: Normalize each entity kind */
  const allEntities: CatalogableEntity[] = [];
  const normalizedKinds = new Set<string>();

  // 5a: RawRecord path (species, backgrounds)
  for (const [entityKind, group] of recordsByKind) {
    if (!RAW_RECORD_KINDS.has(entityKind)) continue;
    const result = normalizeRawRecordKind(entityKind, group.records, group.sourcePath);
    allEntities.push(...result.entities);
    normalizedKinds.add(entityKind);
    if (result.diagnostics.length > 0) {
      diagnostics.push(`${entityKind}: ${result.diagnostics.length} normalization diagnostics`);
    }
  }

  // 5b: CopyModRawRecord path (feats, spells, items, skills, languages, features)
  for (const [entityKind, group] of recordsByKind) {
    if (!COPY_MOD_KINDS.has(entityKind)) continue;
    const result = normalizeCopyModKind(entityKind, group.records, boundaryResult.validatedFiles, group.sourcePath);
    allEntities.push(...result.entities);
    normalizedKinds.add(entityKind);
    if (result.diagnostics.length > 0) {
      diagnostics.push(`${entityKind}: ${result.diagnostics.length} normalization diagnostics`);
    }
  }

  // 5c: IndexedClassEntry path (classes, subclasses)
  if (recordsByKind.has("class")) {
    const classResult = normalizeClassIndexKind(boundaryResult.validatedFiles, classSourceScopeContext);
    allEntities.push(...classResult.entities);
    normalizedKinds.add("class");
    normalizedKinds.add("subclass");
    if (classResult.diagnostics.length > 0) {
      diagnostics.push(`class/subclass: ${classResult.diagnostics.length} normalization diagnostics`);
    }
  }

  diagnostics.push(`Normalized ${allEntities.length} entities across ${normalizedKinds.size} kinds`);

  /* Step 6: Build compact index (summaries) */
  const indexResult = buildCompactIndex(allEntities);
  const summaries = indexResult.index.flatMap((idx) => idx.summaries);
  diagnostics.push(`Built index: ${indexResult.totalEntities} entities, ${indexResult.totalKinds} kinds`);

  /* Step 7: Resolve references */
  const refResult = resolveReferences({ entities: allEntities });
  if (refResult.diagnostics.length > 0) {
    diagnostics.push(`Reference resolution: ${refResult.diagnostics.length} warnings`);
  }

  /* Step 8: Build entity detail files and compute checksums */
  const detailFiles: Record<string, string> = {};
  for (const entity of allEntities) {
    const detailPath = buildDetailPath(entity.kind, entity.id);
    detailFiles[detailPath] = JSON.stringify(entity, null, 2);
  }
  const checksums = computeChecksums(detailFiles);

  /* Step 9: Generate manifest */
  const catalogRevision = createCatalogRevision(`5etools-${sourceManifest.shortHash}-${BUILDER_VERSION}`);
  const manifest = generateManifest({
    schemaVersion: 1,
    catalogRevision,
    sourceRevision: sourceManifest.commitHash,
    builderVersion: "0.1.0",
    rulesets: config.includedRulesets,
    entityKinds: indexResult.index.map((idx) => idx.kind),
    checksums,
  });

  /* Step 10: Build validation and inventory reports */
  const validationReport = buildValidationReport({
    entities: allEntities,
    summaries,
    referenceLinks: refResult.links,
  });
  const inventoryReport = buildInventoryReport({ summaries });

  /* Step 10b: Load sources from books.json */
  const booksPath = path.join(config.clonePath, "data", "books.json");
  const sources = loadSources(booksPath, diagnostics);

  /* Step 10c: Validate required entity kinds before publication */
  const missingKindErrors = validateRequiredEntityKinds(allEntities);
  if (missingKindErrors.length > 0) {
    return createFailureResult([...missingKindErrors], sourceManifest.commitHash);
  }

  /* Step 11: Publish catalog */
  const publishResult = publishCatalogRelease({
    outputDir: config.outputPath,
    manifest,
    summaries,
    entities: detailFiles,
    sources,
    validationReport,
    inventoryReport: { ...inventoryReport, generatedAt: new Date().toISOString() },
  });

  if (!publishResult.success) {
    diagnostics.push(`Publication failed: ${publishResult.errors.join("; ")}`);
  } else {
    diagnostics.push(`Published revision ${catalogRevision} with ${publishResult.fileCount} files`);
  }

  return {
    publishResult,
    entityCount: allEntities.length,
    kindCount: indexResult.totalKinds,
    sourceRevision: sourceManifest.commitHash,
    catalogRevision,
    diagnostics: Object.freeze(diagnostics),
  };
}

function createFailureResult(
  errors: string[],
  sourceRevision: string,
): CatalogBuildResult {
  return {
    publishResult: {
      success: false,
      revisionPath: "",
      pointerPath: "",
      active: false,
      errors: Object.freeze(errors),
      fileCount: 0,
    },
    entityCount: 0,
    kindCount: 0,
    sourceRevision,
    catalogRevision: "",
    diagnostics: Object.freeze(errors),
  };
}
