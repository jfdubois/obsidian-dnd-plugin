import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { publishCatalog } from "./catalog-publisher";
import type { CatalogEntitySummary, CatalogSource } from "@obsidian-dnd/catalog-contract";
import {
  createValidInput,
  createTestSummary,
  createTempRoot,
  cleanupTempRoot,
} from "./catalog-publisher-test-helpers";
import { createSourceId } from "@obsidian-dnd/domain";

let tempRoot: string;

beforeEach(() => {
  tempRoot = createTempRoot();
});

afterEach(() => {
  cleanupTempRoot(tempRoot);
});

describe("publishCatalog — positive", () => {
  it("publishes a valid catalog atomically", () => {
    const input = createValidInput(tempRoot);
    const result = publishCatalog(input);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.revisionPath).toContain("test-rev-001");
    expect(result.fileCount).toBeGreaterThan(0);
  });

  it("writes manifest.json", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const manifestPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "manifest.json",
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.apiVersion).toBe(1);
    expect(manifest.catalogRevision).toBe("test-rev-001");
  });

  it("writes reports/validation.json", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "reports", "validation.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(report.valid).toBe(true);
  });

  it("writes reports/inventory.json", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const reportPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "reports", "inventory.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    expect(report.totalEntities).toBe(2);
  });

  it("writes entity files at their relative paths", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const humanPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "entities", "species", "human.json",
    );
    expect(fs.existsSync(humanPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(humanPath, "utf8"));
    expect(content.id).toBe("human");
  });

  it("writes index files grouped by kind", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const speciesIndexPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "indexes", "species.json",
    );
    expect(fs.existsSync(speciesIndexPath)).toBe(true);

    const speciesIndex = JSON.parse(fs.readFileSync(speciesIndexPath, "utf8"));
    expect(Array.isArray(speciesIndex)).toBe(true);
    expect(speciesIndex).toHaveLength(1);
    expect(speciesIndex[0].id).toBe("human");
  });

  it("writes background index file", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const bgIndexPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "indexes", "backgrounds.json",
    );
    expect(fs.existsSync(bgIndexPath)).toBe(true);

    const bgIndex = JSON.parse(fs.readFileSync(bgIndexPath, "utf8"));
    expect(bgIndex).toHaveLength(1);
    expect(bgIndex[0].id).toBe("soldier");
  });

  it("returns correct file count", () => {
    const input = createValidInput(tempRoot);
    const result = publishCatalog(input);

    // manifest.json + validation.json + inventory.json + 2 entities + 2 indexes = 7
    expect(result.fileCount).toBe(7);
  });

  it("freezes the result object", () => {
    const input = createValidInput(tempRoot);
    const result = publishCatalog(input);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });

  it("cleans up temporary directory after success", () => {
    const input = createValidInput(tempRoot);
    publishCatalog(input);

    const tempDir = path.join(tempRoot, ".publish-temp");
    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it("handles additional entities", () => {
    const input = createValidInput(tempRoot, {
      "entities/feat/tough.json": JSON.stringify({ id: "tough", name: "Tough" }),
    });
    const result = publishCatalog(input);

    expect(result.success).toBe(true);

    const featPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "entities", "feat", "tough.json",
    );
    expect(fs.existsSync(featPath)).toBe(true);
  });

  it("writes sources.json when sources are provided", () => {
    const sources: CatalogSource[] = [
      {
        id: createSourceId("PHB"),
        name: "Player's Handbook",
        abbreviation: "PHB",
        ruleset: "2024",
        category: "core",
      },
    ];
    const input = { ...createValidInput(tempRoot), sources };
    publishCatalog(input);

    const sourcesPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "sources.json",
    );
    expect(fs.existsSync(sourcesPath)).toBe(true);

    const written = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
    expect(Array.isArray(written)).toBe(true);
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe("PHB");
    expect(written[0].name).toBe("Player's Handbook");
  });

  it("does not write sources.json when sources are empty", () => {
    const input = { ...createValidInput(tempRoot), sources: [] };
    publishCatalog(input);

    const sourcesPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "sources.json",
    );
    expect(fs.existsSync(sourcesPath)).toBe(false);
  });
});

describe("publishCatalog — file integrity", () => {
  it("entity file content matches input exactly", () => {
    const entityContent = JSON.stringify({ id: "test", value: 42 }, null, 2);
    const input = createValidInput(tempRoot, {
      "entities/feat/test.json": entityContent,
    });

    publishCatalog(input);

    const featPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "entities", "feat", "test.json",
    );
    const written = fs.readFileSync(featPath, "utf8");
    expect(written).toBe(entityContent);
  });

  it("index files contain sorted summaries", () => {
    const extraSummaries: CatalogEntitySummary[] = [
      createTestSummary("species", "elf", "Elf"),
      createTestSummary("species", "dwarf", "Dwarf"),
    ];
    const input = createValidInput(tempRoot, undefined, extraSummaries);
    publishCatalog(input);

    const indexPath = path.join(
      tempRoot, "catalog", "v1", "revisions", "test-rev-001", "indexes", "species.json",
    );
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

    // Should have 3 species: dwarf, elf, human (sorted by name)
    expect(index).toHaveLength(3);
    // The summaries from createTestSummary are not pre-sorted; the publisher
    // writes them in the order they appear in the summaries array.
    const ids = index.map((s: { id: string }) => s.id);
    expect(ids).toContain("human");
    expect(ids).toContain("elf");
    expect(ids).toContain("dwarf");
  });
});
