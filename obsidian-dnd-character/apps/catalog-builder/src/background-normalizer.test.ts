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

  it("normalizes PHB automatic canonical items, named items, currency, effects, and a language choice", () => {
    const record = makeRecord({ remaining: {
      skillProficiencies: [{ insight: true, religion: true }], languageProficiencies: [{ anyStandard: 2 }],
      startingEquipment: [{ _: ["common clothes|phb", { special: "sticks of incense", quantity: 5 }, { special: "vestments" }, { item: "pouch|phb", containsValue: 1500 }] }],
      entries: [{ type: "paragraph", text: "Retained context." }],
    } });
    const background = normalizeBackgrounds(makeInput([record])).backgrounds[0]!;
    expect(background.effects.filter((effect) => effect.type === "add-proficiency")).toHaveLength(2);
    expect(background.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "named-item", name: "sticks of incense", quantity: 5 }),
      expect.objectContaining({ type: "named-item", name: "vestments", quantity: 1 }),
      expect.objectContaining({ type: "currency", denomination: "cp", amount: { type: "fixed", value: 1500 } }),
    ]));
    expect(normalizeBackgrounds(makeInput([record])).deferredEquipment).toEqual(expect.arrayContaining([
      expect.objectContaining({ mode: "canonical-reference-required", quantity: 1 }),
    ]));
    expect(background.choices).toEqual([expect.objectContaining({ type: "language", minimum: 2, maximum: 2 })]);
    expect(background.content).toEqual([{ type: "paragraph", text: "Retained context." }]);
    expect(normalizeBackgrounds(makeInput([record])).diagnostics.some((diagnostic) => diagnostic.code === "UNMAPPED_MECHANIC")).toBe(false);
  });

  it("normalizes XPHB weighted abilities, feat/tool consequences, and closed A/B equipment packages deterministically", () => {
    const record = makeRecord({ source: "XPHB", remaining: {
      ability: [{ choose: { weighted: { from: ["int", "wis", "cha"], weights: [2, 1] } } }, { choose: { weighted: { from: ["int", "wis", "cha"], weights: [1, 1, 1] } } }],
      feats: [{ "magic initiate; cleric|xphb": true }], skillProficiencies: [{ insight: true, religion: true }], toolProficiencies: [{ "calligrapher's supplies": true }],
      startingEquipment: [{ A: [{ item: "book|xphb" }, { value: 800 }], B: [{ value: 5000 }] }], entries: [{ type: "paragraph", text: "Context." }],
    } });
    const first = normalizeBackgrounds(makeInput([record])).backgrounds[0]!;
    const second = normalizeBackgrounds(makeInput([record])).backgrounds[0]!;
    expect(first.effects.some((effect) => effect.type === "add-proficiency" && "kind" in effect.proficiency && effect.proficiency.kind === "tool")).toBe(true);
    expect(first.grants).toEqual([expect.objectContaining({ type: "entity" })]);
    const ability = first.choices.find((choice) => choice.type === "ability-allocation");
    expect(ability).toMatchObject({ eligibleAbilities: ["INT", "WIS", "CHA"], distributions: [{ bonuses: [2, 1] }, { bonuses: [1, 1, 1] }] });
    const packages = first.choices.find((choice) => choice.type === "closed-option");
    expect(packages).toMatchObject({ options: [expect.objectContaining({ grants: expect.arrayContaining([expect.objectContaining({ type: "currency" })]) }), expect.anything()] });
    expect(first.choices.map((choice) => choice.id)).toEqual(second.choices.map((choice) => choice.id));
    expect(packages?.type === "closed-option" && packages.options.map((option) => option.id)).toEqual(second.choices.find((choice) => choice.type === "closed-option")?.type === "closed-option" ? second.choices.find((choice) => choice.type === "closed-option")!.options.map((option) => option.id) : []);
  });

  it("diagnoses malformed structured background fields instead of publishing corrupted consequences", () => {
    const result = normalizeBackgrounds(makeInput([makeRecord({ remaining: { skillProficiencies: ["insight"], toolProficiencies: ["tools"], languageProficiencies: ["Common"], startingEquipment: [{ _: [{ special: "" }, { item: 4 }] }] } })]));
    expect(result.backgrounds).toHaveLength(1);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining(["UNMAPPED_SKILL_PROFICIENCY", "UNMAPPED_TOOL_PROFICIENCY", "UNMAPPED_LANGUAGE"]));
  });

  it("normalizes equipmentType as an origin-owned nested equipment query with stable IDs", () => {
    const record = makeRecord({ remaining: {
      skillProficiencies: [{ insight: true }],
      startingEquipment: [{ A: [{ item: "book|phb" }, { equipmentType: "toolArtisan" }], B: [{ value: 5000 }] }],
      entries: [{ type: "paragraph", text: "Context remains." }],
    } });
    const first = normalizeBackgrounds(makeInput([record])).backgrounds[0]!;
    const second = normalizeBackgrounds(makeInput([record])).backgrounds[0]!;
    const packageChoice = first.choices.find((choice) => choice.type === "closed-option");
    expect(packageChoice?.type).toBe("closed-option");
    if (packageChoice?.type !== "closed-option") return;
    const nested = packageChoice.options[0]!.choices[0]!;
    expect(nested).toMatchObject({ type: "equipment", minimum: 1, maximum: 1, optionQuery: { equipmentGroups: ["artisan-tool"] } });
    expect(nested.id).toBe((second.choices.find((choice) => choice.type === "closed-option") as typeof packageChoice).options[0]!.choices[0]!.id);
    expect(JSON.stringify(first)).not.toContain("toolArtisan");
  });
});
