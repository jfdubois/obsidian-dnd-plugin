import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { publishCatalogRelease, publishCurrentCatalogRevision, validatePublishedRevision } from "./catalog-publisher";
import { createSmokeCatalogInput } from "./smoke-catalog";

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-release-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

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
