import type { CatalogPublisherInput } from "./catalog-publisher.js";
import { buildDetailPath } from "./compact-index-builder.js";
import { generateTags } from "./compact-index-tag-generator.js";
import { computeChecksums } from "./checksum.js";
import { buildInventoryReport } from "./inventory-report.js";
import { buildValidationReport } from "./validation-report.js";
import { createGoldenEntities, createGoldenSummary } from "./golden-catalog-data.js";
import { CATALOG_SCHEMA_VERSION, createCatalogManifest, createCatalogSource } from "@obsidian-dnd/catalog-contract";
import { createCatalogRevision, createSourceId } from "@obsidian-dnd/domain";

export const SMOKE_SOURCE_REVISION = "manual-smoke-source-001";

/** Builds deterministic, normalized local integration data; it is not a 5eTools production build. */
export function createSmokeCatalogInput(outputDir: string, revision: string): CatalogPublisherInput {
  const catalogRevision = createCatalogRevision(revision);
  const entities = createGoldenEntities();
  const summaries = entities.map((entity) => createGoldenSummary(
    entity,
    generateTags(entity),
    buildDetailPath(entity.kind, entity.id),
  ));
  const detailFiles: Record<string, string> = {};
  for (const entity of entities) detailFiles[buildDetailPath(entity.kind, entity.id)] = JSON.stringify(entity, null, 2);
  const manifest = createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision,
    sourceRevision: SMOKE_SOURCE_REVISION,
    builderVersion: "manual-smoke",
    generatedAt: "2026-01-01T00:00:00.000Z",
    rulesets: ["2014", "2024"],
    entityKinds: ["species", "background", "class", "subclass", "class-feature", "subclass-feature", "feat", "spell", "item", "optional-feature", "skill", "language"],
    checksums: computeChecksums(detailFiles),
  });
  return {
    outputDir,
    manifest,
    summaries,
    entities: detailFiles,
    sources: [createCatalogSource({
      id: createSourceId("PHB"), name: "Manual Smoke Handbook", abbreviation: "PHB", ruleset: "2024", category: "core",
    })],
    validationReport: buildValidationReport({ entities: [], summaries, referenceLinks: [] }),
    inventoryReport: { ...buildInventoryReport({ summaries }), generatedAt: "2026-01-01T00:00:00.000Z" },
  };
}
