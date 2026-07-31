import { describe, it, expect } from "vitest";
import { buildInventoryReport, type InventoryReportInput } from "./inventory-report";
import { createCatalogEntitySummary } from "@obsidian-dnd/catalog-contract";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { CatalogEntitySummary } from "@obsidian-dnd/catalog-contract";

/* ── Test helpers ──────────────────────────────────────────────── */

function makeSummary(
  id: string,
  kind: string,
  name: string,
  sourceId: string,
  ruleset: string,
  access: string,
): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: createEntityId(id),
    kind: kind as CatalogEntitySummary["kind"],
    name,
    sourceId: createSourceId(sourceId),
    ruleset: ruleset as CatalogEntitySummary["ruleset"],
    access: access as CatalogEntitySummary["access"],
    legacy: false,
    tags: [],
    detailPath: `entities/${kind}/${id}.json`,
  });
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("buildInventoryReport", () => {
  it("produces a valid report for empty input", () => {
    const input: InventoryReportInput = { summaries: [] };
    const report = buildInventoryReport(input);

    expect(report.totalEntities).toBe(0);
    expect(report.byKind).toEqual([]);
    expect(report.byRuleset).toEqual([]);
    expect(report.byAccess).toEqual([]);
    expect(report.sourcesUsed).toEqual([]);
    expect(report.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("counts total entities correctly", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("background:soldier|PHB", "background", "Soldier", "PHB", "2024", "core"),
    ];

    const input: InventoryReportInput = { summaries };
    const report = buildInventoryReport(input);

    expect(report.totalEntities).toBe(3);
  });

  it("counts entities by kind", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("background:soldier|PHB", "background", "Soldier", "PHB", "2024", "core"),
      makeSummary("class:fighter|PHB", "class", "Fighter", "PHB", "2024", "core"),
    ];

    const input: InventoryReportInput = { summaries };
    const report = buildInventoryReport(input);

    expect(report.byKind.length).toBe(3);
    const species = report.byKind.find((k) => k.kind === "species");
    const background = report.byKind.find((k) => k.kind === "background");
    const cls = report.byKind.find((k) => k.kind === "class");
    expect(species).toBeDefined();
    expect(species!.count).toBe(2);
    expect(background).toBeDefined();
    expect(background!.count).toBe(1);
    expect(cls).toBeDefined();
    expect(cls!.count).toBe(1);
  });

  it("counts entities by ruleset", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("species:dwarf|PHB14", "species", "Dwarf", "PHB14", "2014", "core"),
    ];

    const input: InventoryReportInput = { summaries };
    const report = buildInventoryReport(input);

    expect(report.byRuleset.length).toBe(2);
    const ruleset2024 = report.byRuleset.find((r) => r.ruleset === "2024");
    const ruleset2014 = report.byRuleset.find((r) => r.ruleset === "2014");
    expect(ruleset2024).toBeDefined();
    expect(ruleset2024!.count).toBe(2);
    expect(ruleset2014).toBeDefined();
    expect(ruleset2014!.count).toBe(1);
  });

  it("counts entities by access level", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("feat:keen|Xan", "feat", "Keen", "Xan", "2024", "source"),
    ];

    const input: InventoryReportInput = { summaries };
    const report = buildInventoryReport(input);

    expect(report.byAccess.length).toBe(2);
    const core = report.byAccess.find((a) => a.access === "core");
    const source = report.byAccess.find((a) => a.access === "source");
    expect(core).toBeDefined();
    expect(core!.count).toBe(2);
    expect(source).toBeDefined();
    expect(source!.count).toBe(1);
  });

  it("collects unique source IDs", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("feat:keen|Xan", "feat", "Keen", "Xan", "2024", "source"),
      makeSummary("spell:fireball|PHB", "spell", "Fireball", "PHB", "2024", "core"),
    ];

    const input: InventoryReportInput = { summaries };
    const report = buildInventoryReport(input);

    expect(report.sourcesUsed.length).toBe(2);
    expect(report.sourcesUsed).toContain("PHB");
    expect(report.sourcesUsed).toContain("Xan");
  });

  it("sets generatedAt as ISO timestamp", () => {
    const input: InventoryReportInput = { summaries: [] };
    const report = buildInventoryReport(input);

    expect(report.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    const parsed = new Date(report.generatedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  it("freezes the output", () => {
    const input: InventoryReportInput = { summaries: [] };
    const report = buildInventoryReport(input);

    expect(Object.isFrozen(report)).toBe(true);
  });

  it("is deterministic except for generatedAt", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
    ];
    const input: InventoryReportInput = { summaries };
    const report1 = buildInventoryReport(input);
    const report2 = buildInventoryReport(input);

    expect(report1.totalEntities).toBe(report2.totalEntities);
    expect(report1.byKind).toEqual(report2.byKind);
    expect(report1.byRuleset).toEqual(report2.byRuleset);
    expect(report1.byAccess).toEqual(report2.byAccess);
    expect(report1.sourcesUsed).toEqual(report2.sourcesUsed);
  });
});
