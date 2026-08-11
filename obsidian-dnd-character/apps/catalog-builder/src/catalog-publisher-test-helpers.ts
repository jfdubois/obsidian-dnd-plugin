import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import { createCatalogRevision, createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { generateManifest } from "./manifest-generator";
import { buildValidationReport } from "./validation-report";
import { buildInventoryReport } from "./inventory-report";
import type { CatalogPublisherInput } from "./catalog-publisher";

/* ── Shared test helpers for catalog-publisher tests ───────────── */

export function createTestSummary(kind: string, id: string, name: string): CatalogEntitySummary {
  return {
    id: createEntityId(id),
    kind: kind as CatalogEntitySummary["kind"],
    name,
    sourceId: createSourceId("PHB"),
    ruleset: "2024",
    access: "core",
    legacy: false,
    tags: [],
    detailPath: `entities/${kind}/${id}.json`,
  };
}

export function createValidInput(
  outputDir: string,
  extraEntities?: Record<string, string>,
  extraSummaries?: CatalogEntitySummary[],
): CatalogPublisherInput {
  const manifest = generateManifest({
    schemaVersion: 2,
    catalogRevision: createCatalogRevision("test-rev-001"),
    sourceRevision: "abc1234",
    builderVersion: "0.1.0",
    rulesets: ["2024"] as const,
    entityKinds: ["species", "background"] as const,
    checksums: {},
  });

  const summaries: CatalogEntitySummary[] = [
    createTestSummary("species", "human", "Human"),
    createTestSummary("background", "soldier", "Soldier"),
    ...(extraSummaries ?? []),
  ];

  const entities: Record<string, string> = {
    "entities/species/human.json": JSON.stringify({ id: "human", name: "Human" }),
    "entities/background/soldier.json": JSON.stringify({ id: "soldier", name: "Soldier" }),
    ...(extraEntities ?? {}),
  };

  const validationReport = buildValidationReport({
    entities: [],
    summaries,
    referenceLinks: [],
  });

  const inventoryReport = buildInventoryReport({ summaries });

  return { outputDir, manifest, summaries, entities, validationReport, inventoryReport };
}

export function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "catalog-publisher-test-"));
}

export function cleanupTempRoot(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
