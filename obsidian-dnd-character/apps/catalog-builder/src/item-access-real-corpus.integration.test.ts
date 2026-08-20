import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildCatalog } from "./catalog-build";
import { createBuilderConfig } from "./config";
import { readSourceManifest } from "./source-manifest";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary } from "./raw-boundary";
import { resolveCopyWithMods } from "./mod-copy-resolver";
import { resolveEntityKind, toCopyModRecord } from "./catalog-build-helpers";
import { classifyRecordAccess } from "./record-access-classifier";
import { classifyRecordRuleset } from "./ruleset-classifier";
import { createCanonicalEntityId } from "@obsidian-dnd/domain";
import { evaluateEquipmentQueryIndex, type CatalogItemSummary, type ItemRule } from "@obsidian-dnd/catalog-contract";

const clonePath = resolve(process.cwd(), "../external/5etools-src");
let tempRoot = "";
let items: ItemRule[] = [];
let summaries: CatalogItemSummary[] = [];

type ResolvedItem = {
  readonly initial: ReturnType<typeof toCopyModRecord>;
  readonly record: ReturnType<typeof toCopyModRecord>;
  readonly sourcePath: string;
};

function loadResolvedItems(): ResolvedItem[] {
  const loaded = loadRawJsonFiles(clonePath);
  const boundary = validateRawBoundary(loaded.files);
  const records: Array<{ raw: ReturnType<typeof toCopyModRecord>; sourcePath: string }> = [];
  let sourcePath = "";
  for (const [filePath, file] of Object.entries(boundary.validatedFiles)) {
    for (const collection of file.collections) {
      if (resolveEntityKind(collection.entityKind) !== "item") continue;
      if (sourcePath === "") sourcePath = filePath;
      for (const raw of collection.records) records.push({ raw: toCopyModRecord(raw), sourcePath: filePath });
    }
  }
  const resolved: ResolvedItem[] = [];
  for (const entry of records) {
    const initial = entry.raw;
    if (initial.remaining._copy === undefined) {
      resolved.push({ initial, record: initial, sourcePath });
      continue;
    }
    const result = resolveCopyWithMods(initial, { validatedFiles: boundary.validatedFiles }, {
      sourcePath, sourceEntityKind: "item",
    });
    if (result.ok) resolved.push({ initial, record: result.record, sourcePath });
  }
  return resolved;
}

function canonicalId(record: ResolvedItem["record"], sourcePath: string): string | undefined {
  const ruleset = classifyRecordRuleset({ record, sourcePath, entityKind: "item" });
  if (!ruleset.ok) return undefined;
  const id = createCanonicalEntityId({ kind: "item", ruleset: ruleset.classification.ruleset,
    source: ruleset.classification.source, name: record.name });
  return id.ok ? id.id : undefined;
}

beforeAll(() => {
  tempRoot = mkdtempSync(join(tmpdir(), "item-access-corpus-"));
  const manifest = readSourceManifest(clonePath);
  const result = buildCatalog(createBuilderConfig({
    clonePath, outputPath: tempRoot, includedRulesets: ["2014", "2024"],
    contentPolicy: { enabledSourceIds: [], includeCore: true }, buildMode: "full",
  }), manifest);
  if (!result.publishResult.success) throw new Error(result.publishResult.errors.join("; "));
  const revisionRoot = join(tempRoot, "catalog", "v1", "revisions", result.catalogRevision);
  items = readdirSync(join(revisionRoot, "entities", "item"))
    .map((file) => JSON.parse(readFileSync(join(revisionRoot, "entities", "item", file), "utf8")) as ItemRule);
  summaries = JSON.parse(readFileSync(join(revisionRoot, "indexes", "items.json"), "utf8")) as CatalogItemSummary[];
}, 15_000);

afterAll(() => { if (tempRoot !== "") rmSync(tempRoot, { recursive: true, force: true }); });

describe("real item corpus record-level access", () => {
  it("checks every resolved item against the accepted production classifier", () => {
    expect(items).toHaveLength(1650);
    const resolvedItems = loadResolvedItems();
    const expected = new Map<string, "core" | "source">();
    for (const entry of resolvedItems) {
      const ruleset = classifyRecordRuleset({ record: entry.record, sourcePath: entry.sourcePath, entityKind: "item" });
      if (!ruleset.ok || !["PHB", "DMG", "XPHB", "XDMG"].includes(ruleset.classification.source)) continue;
      const id = canonicalId(entry.record, entry.sourcePath);
      if (id !== undefined) expected.set(id, classifyRecordAccess(ruleset.classification).access);
    }
    const mismatches: string[] = [];
    for (const item of items) {
      const expectedAccess = expected.get(item.id);
      if (expectedAccess === undefined) mismatches.push(`${item.id} missing resolved source record (actual=${item.access})`);
      else if (expectedAccess !== item.access) mismatches.push(`${item.id} expected=${expectedAccess} actual=${item.access}`);
    }
    expect(expected.size).toBe(1650);
    expect(mismatches, mismatches.join("\n")).toEqual([]);
    const aggregate = Object.fromEntries(["dmg", "phb", "xdmg", "xphb"].map((source) => {
      const group = items.filter((item) => item.sourceId === source);
      return [source, { total: group.length, core: group.filter((item) => item.access === "core").length,
        source: group.filter((item) => item.access === "source").length }];
    }));
    expect(aggregate).toEqual({
      dmg: { total: 541, core: 337, source: 204 }, phb: { total: 265, core: 257, source: 8 },
      xdmg: { total: 621, core: 377, source: 244 }, xphb: { total: 223, core: 217, source: 6 },
    });
  }, 15_000);

  it("proves copy/mod resolution precedes access classification", () => {
    const resolvedItems = loadResolvedItems();
    const entry = resolvedItems.find((candidate) => candidate.initial.remaining._copy !== undefined);
    expect(entry, "no real copy/mod item was found in the pinned corpus").toBeDefined();
    const markerFields = ["srd", "basicRules", "srd52", "basicRules2024"];
    const beforeMarkers = Object.fromEntries(markerFields.filter((field) => entry!.initial.remaining[field] !== undefined)
      .map((field) => [field, entry!.initial.remaining[field]]));
    const afterMarkers = Object.fromEntries(markerFields.filter((field) => entry!.record.remaining[field] !== undefined)
      .map((field) => [field, entry!.record.remaining[field]]));
    expect(entry!.record.remaining._copy).toBeUndefined();
    expect(afterMarkers).toEqual(beforeMarkers);
    // The pinned corpus has no PHB/DMG/XPHB/XDMG item whose core marker is
    // inherited only through _copy; the nearest real evidence is this
    // authoritative resolution case, which proves the same path is exercised.
  }, 15_000);

  it("retains string core markers through the classifier", () => {
    const entry = loadResolvedItems().find((candidate) => candidate.record.name === "Apparatus of Kwalish" && candidate.record.source === "DMG");
    expect(entry).toBeDefined();
    const ruleset = classifyRecordRuleset({ record: entry!.record, sourcePath: entry!.sourcePath, entityKind: "item" });
    expect(ruleset.ok).toBe(true);
    if (!ruleset.ok) return;
    expect(entry!.record.remaining.srd).toBe("Apparatus of the Crab");
    expect(classifyRecordAccess(ruleset.classification).access).toBe("core");
    expect(items.find((item) => item.id === canonicalId(entry!.record, entry!.sourcePath))?.access).toBe("core");
  }, 15_000);

  it("preserves corrected access in the compact index and source-policy evaluator", () => {
    const antimatter = items.find((item) => item.id === "item:2014:dmg:antimatter-rifle")!;
    const venom = items.find((item) => item.id === "item:2014:dmg:dagger-of-venom")!;
    const antimatter2024 = items.find((item) => item.id === "item:2024:xdmg:antimatter-rifle")!;
    const armorOfResistance = items.find((item) => item.id === "item:2024:xdmg:armor-of-resistance")!;
    const antimatterSummary = summaries.find((item) => item.id === antimatter.id)!;
    const venomSummary = summaries.find((item) => item.id === venom.id)!;
    expect([antimatter.access, antimatterSummary.access]).toEqual(["source", "source"]);
    expect([venom.access, venomSummary.access]).toEqual(["core", "core"]);
    expect(antimatter2024.access).toBe("source");
    expect(armorOfResistance.access).toBe("core");
    const martial = { type: "equipment" as const, equipmentGroups: ["martial-weapon" as const] };
    const simpleMelee = { type: "equipment" as const, equipmentGroups: ["simple-melee-weapon" as const] };
    expect(evaluateEquipmentQueryIndex(summaries, martial, { ruleset: "2014", enabledSourceIds: ["phb" as never] }).map((item) => item.id)).not.toContain(antimatter.id);
    expect(evaluateEquipmentQueryIndex(summaries, martial, { ruleset: "2014", enabledSourceIds: ["dmg" as never] }).map((item) => item.id)).toContain(antimatter.id);
    expect(evaluateEquipmentQueryIndex(summaries, simpleMelee, { ruleset: "2014", enabledSourceIds: ["phb" as never] }).map((item) => item.id)).toContain(venom.id);
  });
});
