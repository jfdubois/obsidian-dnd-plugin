import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { publishCatalog } from "./catalog-publisher";
import { generateManifest } from "./manifest-generator";
import { buildValidationReport } from "./validation-report";
import { buildInventoryReport } from "./inventory-report";
import { computeChecksums } from "./checksum";
import { buildDetailPath } from "./compact-index-builder";
import { createGoldenEntities, createGoldenSummary } from "./golden-catalog-data";
import { generateTags } from "./compact-index-tag-generator";
import { createCatalogRevision } from "@obsidian-dnd/domain";

/* ── Temp directory helpers ────────────────────────────────────── */

let tempRoot: string;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "golden-catalog-test-"));
});

afterEach(() => {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
});

/* ── Pipeline assembly helpers ─────────────────────────────────── */

function assembleGoldenInput(
  entities: ReturnType<typeof createGoldenEntities>,
  outputDir: string,
): Parameters<typeof publishCatalog>[0] {
  const summaries = entities.map((entity) =>
    createGoldenSummary(
      entity,
      generateTags(entity),
      buildDetailPath(entity.kind, entity.id),
    ),
  );

  const entitiesMap: Record<string, string> = {};
  for (const entity of entities) {
    const detailPath = buildDetailPath(entity.kind, entity.id);
    entitiesMap[detailPath] = JSON.stringify(entity, null, 2);
  }

  const checksums = computeChecksums(entitiesMap);

  const manifest = generateManifest({
    schemaVersion: 2,
    catalogRevision: createCatalogRevision("golden-test-001"),
    sourceRevision: "golden-pinned-src",
    builderVersion: "0.1.0",
    rulesets: ["2014", "2024"] as const,
    entityKinds: [
      "species", "background", "class", "subclass",
      "class-feature", "subclass-feature", "feat", "spell",
      "item", "optional-feature", "skill", "language",
    ] as const,
    checksums,
  });

  const validationReport = buildValidationReport({
    entities: [],
    summaries,
    referenceLinks: [],
  });

  const inventoryReport = buildInventoryReport({ summaries });

  return { outputDir, manifest, summaries, entities: entitiesMap, validationReport, inventoryReport };
}

/* ── Golden catalog build tests ───────────────────────────────── */

describe("golden catalog build — full pipeline", () => {
  it("publishes all 12 entity kinds atomically", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    const result = publishCatalog(input);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.fileCount).toBeGreaterThan(20);
    expect(result.revisionPath).toContain("golden-test-001");
  });

  it("writes manifest.json with correct metadata", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const manifestPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "manifest.json",
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.catalogRevision).toBe("golden-test-001");
    expect(manifest.sourceRevision).toBe("golden-pinned-src");
    expect(manifest.rulesets).toContain("2014");
    expect(manifest.rulesets).toContain("2024");
    expect(manifest.entityKinds.length).toBe(12);
  });

  it("writes index files for all 12 entity kinds", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const indexDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "indexes",
    );

    const expectedIndexes = [
      "species.json",
      "backgrounds.json",
      "classes.json",
      "subclasses.json",
      "class-features.json",
      "subclass-features.json",
      "feats.json",
      "spells.json",
      "items.json",
      "optional-features.json",
      "skills.json",
      "languages.json",
    ];

    for (const indexFile of expectedIndexes) {
      const indexPath = path.join(indexDir, indexFile);
      expect(fs.existsSync(indexPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("validates zero duplicate IDs across all entities", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "reports", "validation.json",
    );
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    expect(report.valid).toBe(true);
    expect(report.duplicateIds).toEqual([]);
    expect(report.unresolvedReferences).toEqual([]);
  });

  it("validates both 2014 and 2024 rulesets are represented", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "reports", "validation.json",
    );
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    const rulesets = report.rulesetCoverage.map((r: { ruleset: string }) => r.ruleset);
    expect(rulesets).toContain("2014");
    expect(rulesets).toContain("2024");
  });

  it("validates core access classification", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "reports", "validation.json",
    );
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    const accessLevels = report.accessClassification.map((a: { access: string }) => a.access);
    expect(accessLevels).toContain("core");
  });

  it("generates inventory report with correct entity counts", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "reports", "inventory.json",
    );
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    expect(report.totalEntities).toBe(entities.length);
    expect(report.byKind.length).toBeGreaterThan(0);
    expect(report.byRuleset.length).toBe(2);
    expect(report.byAccess.length).toBeGreaterThan(0);
  });

  it("writes entity detail files at correct paths", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const baseDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001",
    );

    // Check species
    const speciesPath = path.join(baseDir, "entities", "species", "human-2024-phb.json");
    expect(fs.existsSync(speciesPath)).toBe(true);

    // Check background
    const bgPath = path.join(baseDir, "entities", "background", "soldier-2024-phb.json");
    expect(fs.existsSync(bgPath)).toBe(true);

    // Check class
    const classPath = path.join(baseDir, "entities", "class", "fighter-2024-phb.json");
    expect(fs.existsSync(classPath)).toBe(true);

    // Check feat
    const featPath = path.join(baseDir, "entities", "feat", "tough-2024-phb.json");
    expect(fs.existsSync(featPath)).toBe(true);

    // Check spell
    const spellPath = path.join(baseDir, "entities", "spell", "firebolt-2024-phb.json");
    expect(fs.existsSync(spellPath)).toBe(true);

    // Check skill
    const skillPath = path.join(baseDir, "entities", "skill", "athletics-2024-phb.json");
    expect(fs.existsSync(skillPath)).toBe(true);

    // Check language
    const langPath = path.join(baseDir, "entities", "language", "common-2024-phb.json");
    expect(fs.existsSync(langPath)).toBe(true);
  });

  it("produces reproducible checksums for identical inputs", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);

    // First publish
    const result1 = publishCatalog(input);
    expect(result1.success).toBe(true);

    // Read checksums from first manifest
    const manifestPath1 = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "manifest.json",
    );
    const manifest1 = JSON.parse(fs.readFileSync(manifestPath1, "utf8"));

    // Second publish to new temp directory
    const tempRoot2 = fs.mkdtempSync(path.join(os.tmpdir(), "golden-catalog-test-2-"));
    const input2 = assembleGoldenInput(entities, tempRoot2);
    const result2 = publishCatalog(input2);
    expect(result2.success).toBe(true);

    const manifestPath2 = path.join(
      tempRoot2, "catalog", "v1", "revisions", "golden-test-001", "manifest.json",
    );
    const manifest2 = JSON.parse(fs.readFileSync(manifestPath2, "utf8"));

    // Checksums should be identical (excluding generatedAt)
    expect(manifest1.checksums).toEqual(manifest2.checksums);

    // Cleanup second temp directory
    try {
      fs.rmSync(tempRoot2, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("every index entry has required summary fields", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const indexDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "indexes",
    );
    const indexFiles = fs.readdirSync(indexDir);

    for (const indexFile of indexFiles) {
      const indexPath = path.join(indexDir, indexFile);
      const entries = JSON.parse(fs.readFileSync(indexPath, "utf8"));

      for (const entry of entries) {
        expect(entry.id).toBeDefined();
        expect(entry.kind).toBeDefined();
        expect(entry.name).toBeDefined();
        expect(entry.sourceId).toBeDefined();
        expect(entry.ruleset).toBeDefined();
        expect(entry.access).toBeDefined();
        expect(entry.legacy).toBeDefined();
        expect(Array.isArray(entry.tags)).toBe(true);
        expect(entry.detailPath).toBeDefined();
      }
    }
  });

  it("effects have automation metadata on species and feats", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const baseDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001",
    );

    // Check species effects
    const speciesPath = path.join(baseDir, "entities", "species", "human-2024-phb.json");
    const species = JSON.parse(fs.readFileSync(speciesPath, "utf8"));
    expect(species.effects.length).toBeGreaterThan(0);
    for (const effect of species.effects) {
      expect(effect.automationStatus).toBeDefined();
      expect(effect.presentation).toBeDefined();
      expect(effect.origin).toBeDefined();
    }

    // Check feat effects
    const featPath = path.join(baseDir, "entities", "feat", "tough-2024-phb.json");
    const feat = JSON.parse(fs.readFileSync(featPath, "utf8"));
    expect(feat.effects.length).toBeGreaterThan(0);
    for (const effect of feat.effects) {
      expect(effect.automationStatus).toBeDefined();
      expect(effect.presentation).toBeDefined();
      expect(effect.origin).toBeDefined();
    }
  });

  it("catalog contains entities from both rulesets", () => {
    const entities = createGoldenEntities();
    const input = assembleGoldenInput(entities, tempRoot);
    publishCatalog(input);

    const indexDir = path.join(
      tempRoot, "catalog", "v1", "revisions", "golden-test-001", "indexes",
    );

    // Read species index and verify both rulesets
    const speciesIndex = JSON.parse(
      fs.readFileSync(path.join(indexDir, "species.json"), "utf8"),
    );
    const rulesets = new Set(speciesIndex.map((e: { ruleset: string }) => e.ruleset));
    expect(rulesets.has("2014")).toBe(true);
    expect(rulesets.has("2024")).toBe(true);
  });
});
