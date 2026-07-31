import { describe, it, expect } from "vitest";
import { buildValidationReport, type ValidationReportInput } from "./validation-report";
import { createEntityId, createSourceId } from "@obsidian-dnd/domain";
import type { CatalogEntitySummary, RuleEffect } from "@obsidian-dnd/catalog-contract";
import {
  createCatalogEntitySummary,
  createRuleEffectMetadata,
  createAddAbilityEffect,
  createFeatRule,
} from "@obsidian-dnd/catalog-contract";
import type { ReferenceLink } from "./reference-resolver";
import type { RenderNode, RulePrerequisite, ChoiceDefinition } from "@obsidian-dnd/catalog-contract";
import type { EntityId } from "@obsidian-dnd/domain";

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

function makeLink(
  sourceId: string,
  sourceKind: string,
  sourceName: string,
  field: string,
  targetId: string,
  resolved: boolean,
): ReferenceLink {
  return Object.freeze({
    sourceId: createEntityId(sourceId),
    sourceKind: sourceKind as ReferenceLink["sourceKind"],
    sourceName,
    field,
    targetId: createEntityId(targetId),
    resolved,
  });
}

function makeEffectMetadata() {
  return createRuleEffectMetadata(
    "full",
    { primary: "abilities", secondary: [] },
    { entityId: createEntityId("feat:keen|PHB"), sourceId: createSourceId("PHB"), method: "structured" },
  );
}

function makeAddAbilityEffect(): RuleEffect {
  return createAddAbilityEffect(makeEffectMetadata(), "STR", 2);
}

function makeFeat(
  id: string,
  name: string,
  effects: RuleEffect[],
  content: RenderNode[],
) {
  return createFeatRule(
    createEntityId(id),
    name,
    createSourceId("PHB"),
    "2024",
    "core",
    content,
    [] as RulePrerequisite[],
    effects,
    [] as ChoiceDefinition[],
    [] as EntityId[],
    false,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("buildValidationReport", () => {
  it("produces a valid report for empty input", () => {
    const input: ValidationReportInput = {
      entities: [],
      summaries: [],
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.valid).toBe(true);
    expect(report.duplicateIds).toEqual([]);
    expect(report.unresolvedReferences).toEqual([]);
    expect(report.rulesetCoverage).toEqual([]);
    expect(report.accessClassification).toEqual([]);
    expect(report.effectsWithoutAutomation).toBe(0);
    expect(report.effectsWithoutProvenance).toBe(0);
    expect(report.unmappedNarrativeCount).toBe(0);
    expect(report.diagnostics).toEqual([]);
  });

  it("detects duplicate entity IDs", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:human|PHB", "species", "Human Duplicate", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
    ];

    const input: ValidationReportInput = {
      entities: [],
      summaries,
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.valid).toBe(false);
    expect(report.duplicateIds).toContain("species:human|PHB");
    expect(report.duplicateIds.length).toBe(1);
  });

  it("does not flag unique IDs as duplicates", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("background:soldier|PHB", "background", "Soldier", "PHB", "2024", "core"),
    ];

    const input: ValidationReportInput = {
      entities: [],
      summaries,
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.valid).toBe(true);
    expect(report.duplicateIds).toEqual([]);
  });

  it("detects unresolved references", () => {
    const links: ReferenceLink[] = [
      makeLink("species:elf|PHB", "species", "Elf", "languageIds", "language:common|PHB", true),
      makeLink("species:elf|PHB", "species", "Elf", "languageIds", "language:elvish|Xan", false),
    ];

    const input: ValidationReportInput = {
      entities: [],
      summaries: [],
      referenceLinks: links,
    };
    const report = buildValidationReport(input);

    expect(report.valid).toBe(false);
    expect(report.unresolvedReferences.length).toBe(1);
    expect(report.unresolvedReferences[0]!.fromId).toBe("species:elf|PHB");
    expect(report.unresolvedReferences[0]!.toId).toBe("language:elvish|Xan");
    expect(report.unresolvedReferences[0]!.referenceKind).toBe("languageIds");
  });

  it("computes ruleset coverage", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("species:dwarf|PHB14", "species", "Dwarf", "PHB14", "2014", "core"),
    ];

    const input: ValidationReportInput = {
      entities: [],
      summaries,
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.rulesetCoverage.length).toBe(2);
    const ruleset2024 = report.rulesetCoverage.find((r) => r.ruleset === "2024");
    const ruleset2014 = report.rulesetCoverage.find((r) => r.ruleset === "2014");
    expect(ruleset2024).toBeDefined();
    expect(ruleset2024!.entityCount).toBe(2);
    expect(ruleset2014).toBeDefined();
    expect(ruleset2014!.entityCount).toBe(1);
  });

  it("computes access classification", () => {
    const summaries: CatalogEntitySummary[] = [
      makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      makeSummary("species:elf|PHB", "species", "Elf", "PHB", "2024", "core"),
      makeSummary("feat:keen|Xan", "feat", "Keen", "Xan", "2024", "source"),
    ];

    const input: ValidationReportInput = {
      entities: [],
      summaries,
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.accessClassification.length).toBe(2);
    const core = report.accessClassification.find((a) => a.access === "core");
    const source = report.accessClassification.find((a) => a.access === "source");
    expect(core).toBeDefined();
    expect(core!.entityCount).toBe(2);
    expect(source).toBeDefined();
    expect(source!.entityCount).toBe(1);
  });

  it("freezes the output", () => {
    const input: ValidationReportInput = {
      entities: [],
      summaries: [],
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(Object.isFrozen(report)).toBe(true);
  });

  it("is deterministic for same input", () => {
    const input: ValidationReportInput = {
      entities: [],
      summaries: [
        makeSummary("species:human|PHB", "species", "Human", "PHB", "2024", "core"),
      ],
      referenceLinks: [],
    };
    const report1 = buildValidationReport(input);
    const report2 = buildValidationReport(input);

    expect(report1.valid).toBe(report2.valid);
    expect(report1.duplicateIds).toEqual(report2.duplicateIds);
    expect(report1.rulesetCoverage).toEqual(report2.rulesetCoverage);
    expect(report1.accessClassification).toEqual(report2.accessClassification);
  });

  it("counts effects with complete automation and provenance", () => {
    const effect = makeAddAbilityEffect();
    const entity = makeFeat("feat:keen|PHB", "Keen", [effect], []);

    const input: ValidationReportInput = {
      entities: [entity],
      summaries: [],
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.effectsWithoutAutomation).toBe(0);
    expect(report.effectsWithoutProvenance).toBe(0);
  });

  it("counts unmapped narrative entities", () => {
    const entity = makeFeat(
      "feat:narrative|PHB",
      "Narrative Feat",
      [],
      [{ type: "paragraph", text: "This feat has narrative content but no effects." }],
    );

    const input: ValidationReportInput = {
      entities: [entity],
      summaries: [],
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.unmappedNarrativeCount).toBe(1);
    expect(report.diagnostics.length).toBe(1);
    expect(report.diagnostics[0]!.code).toBe("UNMAPPED_NARRATIVE");
    expect(report.diagnostics[0]!.severity).toBe("warning");
  });

  it("does not count mapped entities as unmapped narrative", () => {
    const effect = makeAddAbilityEffect();
    const entity = makeFeat(
      "feat:keen|PHB",
      "Keen",
      [effect],
      [{ type: "paragraph", text: "Narrative text." }],
    );

    const input: ValidationReportInput = {
      entities: [entity],
      summaries: [],
      referenceLinks: [],
    };
    const report = buildValidationReport(input);

    expect(report.unmappedNarrativeCount).toBe(0);
    expect(report.diagnostics.length).toBe(0);
  });
});
