import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isCatalogEntitySummary, isEntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { KIND_INDEX_FILENAME } from "@obsidian-dnd/catalog-contract";
import { createSmokeCatalogInput } from "./smoke-catalog";
import { publishCatalogRelease } from "./catalog-publisher";

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-catalog-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe("deterministic normalized smoke catalog", () => {
  it("has every supported kind, a source, and deterministic metadata", () => {
    const first = createSmokeCatalogInput(root, "manual-smoke-001");
    const second = createSmokeCatalogInput(root, "manual-smoke-001");
    expect(first.manifest).toEqual(second.manifest);
    expect(first.inventoryReport).toEqual(second.inventoryReport);
    expect(first.sources).toHaveLength(1);
    expect(first.manifest.entityKinds).toHaveLength(12);
    expect(new Set(first.summaries.map((summary) => summary.id)).size).toBe(first.summaries.length);
  });

  it("writes runtime-valid indexes and details that resolve from every summary", () => {
    const input = createSmokeCatalogInput(root, "manual-smoke-001");
    const result = publishCatalogRelease(input);
    expect(result.success).toBe(true);
    for (const kind of input.manifest.entityKinds) {
      const index = JSON.parse(fs.readFileSync(path.join(result.revisionPath, "indexes", KIND_INDEX_FILENAME[kind]), "utf8")) as unknown[];
      expect(index.length).toBeGreaterThan(0);
      for (const summary of index) {
        expect(isCatalogEntitySummary(summary)).toBe(true);
        const typed = summary as { detailPath: string; sourceId: string };
        expect(input.sources?.some((source) => source.id === typed.sourceId)).toBe(true);
        expect(isEntityDetailResponse(JSON.parse(fs.readFileSync(path.join(result.revisionPath, typed.detailPath), "utf8"))), `${kind}:${typed.detailPath}`).toBe(true);
      }
    }
  });
});
