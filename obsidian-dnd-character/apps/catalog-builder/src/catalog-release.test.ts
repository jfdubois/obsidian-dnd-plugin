import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { publishCatalogRelease, publishCurrentCatalogRevision, validatePublishedRevision } from "./catalog-publisher";
import { createSmokeCatalogInput } from "./smoke-catalog";

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-release-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

function withPublicationTimes(manifestGeneratedAt: string, inventoryGeneratedAt: string) {
  const input = createSmokeCatalogInput(root, "release-a");
  return {
    ...input,
    manifest: { ...input.manifest, generatedAt: manifestGeneratedAt },
    inventoryReport: { ...input.inventoryReport, generatedAt: inventoryGeneratedAt },
  };
}

describe("catalog release pointer publication", () => {
  it("publishes a complete revision and exact current pointer", () => {
    const result = publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    expect(result.success).toBe(true);
    expect(JSON.parse(fs.readFileSync(result.pointerPath, "utf8"))).toEqual({ currentRevision: "release-a" });
    expect(validatePublishedRevision(root, "release-a")).toEqual([]);
  });

  it("rejects missing or malformed immutable revision without changing an old pointer", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const pointer = path.join(root, "catalog", "v1", "current.json");
    const before = fs.readFileSync(pointer, "utf8");
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "missing" }).success).toBe(false);
    expect(fs.readFileSync(pointer, "utf8")).toBe(before);
    fs.mkdirSync(path.join(root, "catalog", "v1", "revisions", "broken"), { recursive: true });
    fs.writeFileSync(path.join(root, "catalog", "v1", "revisions", "broken", "manifest.json"), "{}", "utf8");
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "broken" }).success).toBe(false);
    expect(fs.readFileSync(pointer, "utf8")).toBe(before);
  });

  it("atomically advances the pointer and retains earlier immutable revisions", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const result = publishCatalogRelease(createSmokeCatalogInput(root, "release-b"));
    expect(result.active).toBe(true);
    expect(fs.existsSync(path.join(root, "catalog", "v1", "revisions", "release-a"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(result.pointerPath, "utf8"))).toEqual({ currentRevision: "release-b" });
  });

  it("reactivates an existing complete immutable revision", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const result = publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    expect(result.success).toBe(true);
    expect(result.active).toBe(true);
  });

  it.each([
    ["manifest timestamp", "2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
    ["inventory timestamp", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"],
    ["both timestamps", "2026-01-02T00:00:00.000Z", "2026-01-03T00:00:00.000Z"],
  ])("reactivates an immutable revision when only the %s differs", (_name, manifestTime, inventoryTime) => {
    const original = createSmokeCatalogInput(root, "release-a");
    const first = publishCatalogRelease(original);
    const revision = first.revisionPath;
    const manifestBefore = fs.readFileSync(path.join(revision, "manifest.json"), "utf8");
    const inventoryBefore = fs.readFileSync(path.join(revision, "reports", "inventory.json"), "utf8");

    const second = publishCatalogRelease(withPublicationTimes(manifestTime, inventoryTime));
    expect(second.success).toBe(true);
    expect(fs.readFileSync(path.join(revision, "manifest.json"), "utf8")).toBe(manifestBefore);
    expect(fs.readFileSync(path.join(revision, "reports", "inventory.json"), "utf8")).toBe(inventoryBefore);
  });

  it("rejects a valid but different request for an existing immutable revision", () => {
    const original = createSmokeCatalogInput(root, "release-a");
    publishCatalogRelease(original);
    const manifestPath = path.join(root, "catalog", "v1", "revisions", "release-a", "manifest.json");
    const before = fs.readFileSync(manifestPath, "utf8");
    const changed = { ...original, manifest: { ...original.manifest, builderVersion: "different-builder" } };
    const result = publishCatalogRelease(changed);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Immutable revision conflict");
    expect(fs.readFileSync(manifestPath, "utf8")).toBe(before);
    expect(JSON.parse(fs.readFileSync(path.join(root, "catalog", "v1", "current.json"), "utf8"))).toEqual({ currentRevision: "release-a" });
  });

  it("rejects semantic inventory, entity, and malformed timestamp-bearing differences", () => {
    const original = createSmokeCatalogInput(root, "release-a");
    const first = publishCatalogRelease(original);
    const changedInventory = publishCatalogRelease({
      ...original,
      inventoryReport: { ...original.inventoryReport, totalEntities: 999 },
    });
    expect(changedInventory.errors[0]).toContain("reports/inventory.json");

    const [detailPath, detail] = Object.entries(original.entities)[0]!;
    const changedEntity = publishCatalogRelease({
      ...original, entities: { ...original.entities, [detailPath]: `${detail} ` },
    });
    expect(changedEntity.errors[0]).toContain(detailPath);

    const firstSummary = original.summaries[0]!;
    const changedIndex = publishCatalogRelease({
      ...original, summaries: [{ ...firstSummary, name: "Different index entry" }, ...original.summaries.slice(1)],
    });
    expect(changedIndex.errors[0]).toContain("indexes/");

    fs.writeFileSync(path.join(first.revisionPath, "reports", "inventory.json"), "{", "utf8");
    const malformed = publishCatalogRelease(original);
    expect(malformed.errors[0]).toContain("reports/inventory.json");

    fs.writeFileSync(path.join(first.revisionPath, "manifest.json"), "{", "utf8");
    const malformedManifest = publishCatalogRelease(original);
    expect(malformedManifest.success).toBe(false);
    expect(malformedManifest.errors.join(" ")).toContain("manifest.json");
  });

  it("does not advance the pointer when immutable publication fails", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const invalid = { ...createSmokeCatalogInput(root, "release-b"), validationReport: { ...createSmokeCatalogInput(root, "release-b").validationReport, valid: false } };
    const result = publishCatalogRelease(invalid);
    expect(result.success).toBe(false);
    expect(fs.existsSync(path.join(root, "catalog", "v1", "revisions", "release-b"))).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(root, "catalog", "v1", "current.json"), "utf8"))).toEqual({ currentRevision: "release-a" });
  });

  it("rejects missing sources, revision mismatches, and bad declared indexes", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const pointer = path.join(root, "catalog", "v1", "current.json");
    const before = fs.readFileSync(pointer, "utf8");
    const revision = path.join(root, "catalog", "v1", "revisions", "release-a");
    fs.rmSync(path.join(revision, "sources.json"));
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "release-a" }).errors.join(" ")).toContain("sources.json");
    fs.writeFileSync(path.join(revision, "sources.json"), JSON.stringify(createSmokeCatalogInput(root, "release-a").sources), "utf8");
    const manifestPath = path.join(revision, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ ...createSmokeCatalogInput(root, "release-a").manifest, catalogRevision: "release-b" }), "utf8");
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "release-a" }).errors.join(" ")).toContain("does not match");
    fs.writeFileSync(manifestPath, JSON.stringify(createSmokeCatalogInput(root, "release-a").manifest), "utf8");
    const indexPath = path.join(revision, "indexes", "species.json");
    fs.rmSync(indexPath);
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "release-a" }).errors.join(" ")).toContain("species.json");
    fs.writeFileSync(indexPath, "{}", "utf8");
    expect(publishCurrentCatalogRevision({ outputDir: root, revision: "release-a" }).errors.join(" ")).toContain("species.json");
    expect(fs.readFileSync(pointer, "utf8")).toBe(before);
  });

  it("retains a published revision and cleans the temporary pointer after a non-Error rename failure", () => {
    publishCatalogRelease(createSmokeCatalogInput(root, "release-a"));
    const pointer = path.join(root, "catalog", "v1", "current.json");
    const result = publishCatalogRelease({
      ...createSmokeCatalogInput(root, "release-b"),
      pointerRename: () => { throw "pointer rename denied"; },
    });
    expect(result.success).toBe(false);
    expect(result.active).toBe(false);
    expect(result.revisionPath).toContain("release-b");
    expect(result.errors[0]).toContain("pointer rename denied");
    expect(fs.existsSync(path.join(root, "catalog", "v1", "revisions", "release-b"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(pointer, "utf8"))).toEqual({ currentRevision: "release-a" });
    expect(fs.readdirSync(path.dirname(pointer)).some((entry) => entry.startsWith(".current-"))).toBe(false);
  });
});
