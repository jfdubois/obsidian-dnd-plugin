import { describe, it, expect } from "vitest";
import { normalizeBackgrounds, type BackgroundNormalizerInput } from "./background-normalizer";
import type { BackgroundSourceScopeContext } from "./background-source-scope";
import type { RawRecord } from "./raw-boundary";
import type { BackgroundRule } from "@obsidian-dnd/catalog-contract";

const TEST_CONTEXT: BackgroundSourceScopeContext = {
  knownPinnedSources: Object.freeze(new Set(["PHB", "XPHB", "VGtM"])),
};

function makeRecord(overrides: Partial<RawRecord> = {}): RawRecord {
  return Object.freeze({
    name: "Acolyte",
    source: "PHB",
    url: "https://5e.tools#Acolyte",
    remaining: {
      skillProficiencies: [{ insight: true }, { religion: true }],
      entries: [
        { type: "paragraph", text: "You have lived among the most learned and powerful individuals of the faith." },
      ],
    },
    ...overrides,
  });
}

function makeInput(records: RawRecord[]): BackgroundNormalizerInput {
  return { records, context: TEST_CONTEXT, sourcePath: "5etools/PHB.json", entityKind: "background" };
}

describe("normalizeBackgrounds", () => {
  it("normalizes a valid PHB Acolyte with skill proficiencies", () => {
    const result = normalizeBackgrounds(makeInput([makeRecord()]));
    expect(result.backgrounds).toHaveLength(1);
    const acolyte = result.backgrounds[0]!;
    expect(acolyte.name).toBe("Acolyte");
    expect(acolyte.sourceId).toBe("phb");
    expect(acolyte.ruleset).toBe("2014");
    expect(acolyte.skillProficiencies).toHaveLength(2);
    expect(acolyte.content).toHaveLength(1);
    expect(acolyte.content[0]).toEqual({ type: "paragraph", text: "You have lived among the most learned and powerful individuals of the faith." });
  });

  it("extracts skill proficiencies from object shape", () => {
    const record = makeRecord({
      name: "Soldier",
      remaining: {
        skillProficiencies: [{ athletics: true }, { intimidation: true }],
        entries: [{ type: "paragraph", text: "You fought in the wars that shape the world." }],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.skillProficiencies).toHaveLength(2);
  });

  it("preserves narrative content from entries", () => {
    const record = makeRecord({
      name: "Sage",
      remaining: {
        skillProficiencies: [{ arcana: true }, { history: true }],
        entries: [
          { type: "paragraph", text: "You spent your childhood searching for arcane secrets." },
          { type: "heading", text: "Skill Proficiencies", level: 3 },
          { type: "paragraph", text: "Arcana and History." },
        ],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.content).toHaveLength(3);
    expect(result.backgrounds[0]!.content[0]).toEqual({ type: "paragraph", text: "You spent your childhood searching for arcane secrets." });
    expect(result.backgrounds[0]!.content[1]).toEqual({ type: "heading", level: 3, text: "Skill Proficiencies" });
    expect(result.backgrounds[0]!.content[2]).toEqual({ type: "paragraph", text: "Arcana and History." });
  });

  it("excludes non-PHB/XPHB sources with EXCLUDED_SOURCE diagnostic", () => {
    const record = makeRecord({ name: "Folk Hero", source: "VGtM" });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    expect(result.diagnostics[0]!.recordName).toBe("Folk Hero");
  });

  it("rejects unknown source with EXCLUDED_SOURCE diagnostic", () => {
    const record = makeRecord({ name: "UnknownBackground", source: "NONEXISTENT" });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
  });

  it("warns on unmapped tool proficiencies", () => {
    const record = makeRecord({
      name: "Guild Artisan",
      remaining: {
        skillProficiencies: [{ insight: true }, { persuasion: true }],
        toolProficiencies: ["Artisan's tools"],
        entries: [{ type: "paragraph", text: "You are a master craftsman." }],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    const diag = result.diagnostics.find((d) => d.code === "UNMAPPED_TOOL_PROFICIENCY");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  it("warns on unmapped language proficiencies", () => {
    const record = makeRecord({
      name: "Charlatan",
      remaining: {
        skillProficiencies: [{ deception: true }, { "sleight of hand": true }],
        languageProficiencies: ["One language"],
        entries: [{ type: "paragraph", text: "You are a skilled con artist." }],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    const diag = result.diagnostics.find((d) => d.code === "UNMAPPED_LANGUAGE");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  it("warns on unmapped skill proficiencies", () => {
    const record = makeRecord({
      name: "Criminal",
      remaining: {
        skillProficiencies: ["stealth"], // string instead of object shape
        entries: [{ type: "paragraph", text: "You are a criminal." }],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    const diag = result.diagnostics.find((d) => d.code === "UNMAPPED_SKILL_PROFICIENCY");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  it("returns frozen result objects", () => {
    const result = normalizeBackgrounds(makeInput([makeRecord()]));
    expect(() => {
      (result.backgrounds as unknown as BackgroundRule[]).push({} as BackgroundRule);
    }).toThrow();
  });

  it("handles empty record list", () => {
    const result = normalizeBackgrounds(makeInput([]));
    expect(result.backgrounds).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("assigns correct source ID and ruleset for PHB", () => {
    const result = normalizeBackgrounds(makeInput([makeRecord()]));
    expect(result.backgrounds[0]!.sourceId).toBe("phb");
    expect(result.backgrounds[0]!.ruleset).toBe("2014");
  });

  it("normalizes XPHB source correctly", () => {
    const record = makeRecord({ name: "Acolyte", source: "XPHB" });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.sourceId).toBe("xphb");
    expect(result.backgrounds[0]!.ruleset).toBe("2024");
  });

  it("extracts page number", () => {
    const record = makeRecord({
      remaining: {
        skillProficiencies: [{ insight: true }, { religion: true }],
        entries: [{ type: "paragraph", text: "Acolyte content." }],
        page: 123,
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.page).toBe(123);
  });

  it("processes multiple records with mixed outcomes", () => {
    const input = makeInput([
      makeRecord(),
      makeRecord({ name: "Folk Hero", source: "VGtM" }),
      makeRecord({ name: "Sage", source: "PHB" }),
    ]);
    const result = normalizeBackgrounds(input);
    expect(result.backgrounds).toHaveLength(2);
    expect(result.backgrounds.map((b) => b.name)).toContain("Acolyte");
    expect(result.backgrounds.map((b) => b.name)).toContain("Sage");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
  });

  it("extracts feature ID from feature field", () => {
    const record = makeRecord({
      name: "Acolyte",
      remaining: {
        skillProficiencies: [{ insight: true }, { religion: true }],
        entries: [{ type: "paragraph", text: "Acolyte content." }],
        feature: "Shelter of the Faithful",
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.featureId).toBeDefined();
    expect(result.backgrounds[0]!.featureId).toContain("optional-feature");
    expect(result.backgrounds[0]!.featureId).toContain("shelter-of-the-faithful");
  });

  it("warns on unmapped starting equipment", () => {
    const record = makeRecord({
      name: "Acolyte",
      remaining: {
        skillProficiencies: [{ insight: true }, { religion: true }],
        entries: [{ type: "paragraph", text: "Acolyte content." }],
        startingEquipment: ["A holy symbol"],
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    const diag = result.diagnostics.find((d) => d.code === "UNMAPPED_MECHANIC");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  it("extracts summary field", () => {
    const record = makeRecord({
      remaining: {
        skillProficiencies: [{ insight: true }, { religion: true }],
        entries: [{ type: "paragraph", text: "Acolyte content." }],
        summary: "Learned and powerful individuals of the faith.",
      },
    });
    const result = normalizeBackgrounds(makeInput([record]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.backgrounds[0]!.summary).toBe("Learned and powerful individuals of the faith.");
  });
});
