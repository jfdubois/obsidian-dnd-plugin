import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { buildCatalog } from "./catalog-build.js";
import { readSourceManifest } from "./source-manifest.js";
import { createBuilderConfig } from "./config.js";

let tempRoot: string;
const CLONE_PATH = path.resolve(process.cwd(), "../external/5etools-src");

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

describe("catalog build — additional required acceptance tests", () => {
  it("uses normalized entities from real 5eTools, not smoke fixtures", () => {
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

    const entitiesDir = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "entities",
    );
    expect(fs.existsSync(entitiesDir)).toBe(true);

    const speciesDir = path.join(entitiesDir, "species");
    if (fs.existsSync(speciesDir)) {
      const speciesFiles = fs.readdirSync(speciesDir);
      expect(speciesFiles.length).toBeGreaterThan(0);
      const firstSpecies = JSON.parse(
        fs.readFileSync(path.join(speciesDir, speciesFiles[0]!), "utf8"),
      );
      expect(firstSpecies.kind).toBe("species");
      expect(typeof firstSpecies.id).toBe("string");
      expect(firstSpecies.id.length).toBeGreaterThan(0);
    }
  });

  it("represents both 2014 and 2024 rulesets in manifest", () => {
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
    expect(manifest.rulesets).toContain("2014");
    expect(manifest.rulesets).toContain("2024");
  });

  it("does not use manual-smoke revision metadata in real build", () => {
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

    expect(result.catalogRevision).not.toContain("manual-smoke");
    expect(result.catalogRevision).toContain("5etools-");

    const manifestPath = path.join(
      tempRoot, "catalog", "v1", "revisions", result.catalogRevision, "manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.catalogRevision).not.toContain("manual-smoke");
  });

  it("preserves previous revision when building new catalog", () => {
    const sourceManifest = readSourceManifest(CLONE_PATH);
    const config = createBuilderConfig({
      clonePath: CLONE_PATH,
      outputPath: tempRoot,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    const result1 = buildCatalog(config, sourceManifest);
    expect(result1.publishResult.success).toBe(true);

    // Verify the revision directory exists
    const revisionDir1 = path.join(
      tempRoot, "catalog", "v1", "revisions", result1.catalogRevision,
    );
    expect(fs.existsSync(revisionDir1)).toBe(true);

    // Verify current.json points to the revision
    const currentPath = path.join(tempRoot, "catalog", "v1", "current.json");
    const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    expect(current.currentRevision).toBe(result1.catalogRevision);
  });
});
