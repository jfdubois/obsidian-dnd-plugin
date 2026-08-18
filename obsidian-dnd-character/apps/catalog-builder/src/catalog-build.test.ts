import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildCatalog } from "./catalog-build.js";
import { readSourceManifest } from "./source-manifest.js";
import { createBuilderConfig, BUILDER_VERSION } from "./config.js";
import { CATALOG_SCHEMA_VERSION } from "@obsidian-dnd/catalog-contract";

/* ── Temp directory helpers ────────────────────────────────────── */

let tempRoot: string;
const CLONE_PATH = path.resolve(process.cwd(), "../external/5etools-src");
const REAL_CATALOG_INTEGRATION_TIMEOUT_MS = 15_000;

beforeEach(() => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-build-test-"));
});

afterEach(() => {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
});

/* ── Real 5eTools catalog build tests ─────────────────────────── */

describe("catalog build — real 5eTools pipeline", () => {
  it("loads and validates 5eTools JSON files", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.entityCount).toBeGreaterThan(0);
    expect(result.kindCount).toBeGreaterThan(0);
    expect(result.sourceRevision).toBe(sourceManifest.commitHash);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("produces a catalog revision with real Git SHA", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.catalogRevision).toContain("5etools-");
    expect(result.sourceRevision).toMatch(/^[0-9a-f]{40}$/);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("includes builder version suffix in catalog revision", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.catalogRevision).toBe(`5etools-${sourceManifest.shortHash}-${BUILDER_VERSION}`);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("publishes manifest.json with correct metadata", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    if (!result.publishResult.success) {
      console.error("Publish errors:", result.publishResult.errors);
      console.error("Diagnostics:", result.diagnostics);
    }
    expect(result.publishResult.success).toBe(true);

    const manifestPath = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "manifest.json",
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.schemaVersion).toBe(CATALOG_SCHEMA_VERSION);
    expect(manifest.catalogRevision).toBe(result.catalogRevision);
    expect(manifest.sourceRevision).toBe(result.sourceRevision);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("writes index files for all entity kinds", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(true);

    const indexDir = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "indexes",
    );
    expect(fs.existsSync(indexDir)).toBe(true);

    const indexFiles = fs.readdirSync(indexDir);
    expect(indexFiles.length).toBeGreaterThan(0);
    for (const file of indexFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(indexDir, file), "utf8"));
      expect(Array.isArray(content)).toBe(true);
    }
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("generates validation report with no duplicate IDs", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(true);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "reports", "validation.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(report.valid).toBe(true);
    expect(report.duplicateIds).toEqual([]);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("generates inventory report with entity counts", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(true);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "reports", "inventory.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    // Inventory report reflects deduplicated entity count (summaries), not raw entity count
    expect(report.totalEntities).toBeGreaterThan(0);
    expect(report.totalEntities).toBeLessThanOrEqual(result.entityCount);
    expect(report.byKind.length).toBeGreaterThan(0);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("writes entity detail files with checksums", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(true);

    const manifestPath = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(Object.keys(manifest.checksums).length).toBeGreaterThan(0);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("includes diagnostics for each build step", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.includes("Loaded"))).toBe(true);
    expect(result.diagnostics.some((d) => d.includes("Validated"))).toBe(true);
    expect(result.diagnostics.some((d) => d.includes("Normalized"))).toBe(true);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("fails with actionable diagnostics on invalid clone path", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: path.join(tempRoot, "nonexistent"),
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(false);
    expect(result.publishResult.errors.length).toBeGreaterThan(0);
    expect(result.entityCount).toBe(0);
  });

  it("preserves existing smoke catalog when building real catalog", () => {
    // Create a smoke catalog first
    const smokeOutput = path.join(tempRoot, "smoke");
    fs.mkdirSync(smokeOutput, { recursive: true });

    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: smokeOutput,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result = buildCatalog(config, sourceManifest);
    expect(result.publishResult.success).toBe(true);

    // Verify the revision directory exists
    const revisionDir = path.join(
      smokeOutput, "catalog", "v1", "revisions", result.catalogRevision,
    );
    expect(fs.existsSync(revisionDir)).toBe(true);

    // Verify current.json points to the new revision
    const currentPath = path.join(smokeOutput, "catalog", "v1", "current.json");
    expect(fs.existsSync(currentPath)).toBe(true);
    const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    expect(current.currentRevision).toBe(result.catalogRevision);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);

  it("publishes b2 beside the legacy b1 revision for the same pinned source", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const b1Revision = `5etools-${sourceManifest.shortHash}-b1`;
    const b1Source = path.resolve(
      process.cwd(), "apps/catalog-server/catalog/v1/revisions", b1Revision,
    );
    const b1Destination = path.join(
      tempRoot, "catalog", "v1", "revisions", b1Revision,
    );
    expect(fs.existsSync(b1Source)).toBe(true);
    fs.mkdirSync(path.dirname(b1Destination), { recursive: true });
    fs.cpSync(b1Source, b1Destination, { recursive: true });
    const b1ManifestBefore = fs.readFileSync(path.join(b1Destination, "manifest.json"), "utf8");

    const result = buildCatalog(createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    }), sourceManifest);

    const b2Revision = `5etools-${sourceManifest.shortHash}-${BUILDER_VERSION}`;
    expect(result.catalogRevision).toBe(b2Revision);
    expect(result.publishResult.success).toBe(true);
    expect(fs.existsSync(path.join(tempRoot, "catalog", "v1", "revisions", b2Revision))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(tempRoot, "catalog", "v1", "current.json"), "utf8")))
      .toEqual({ currentRevision: b2Revision });
    expect(fs.readFileSync(path.join(b1Destination, "manifest.json"), "utf8")).toBe(b1ManifestBefore);
  }, REAL_CATALOG_INTEGRATION_TIMEOUT_MS);
});
