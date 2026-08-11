import { describe, it, expect } from "vitest";
import { normalizeSpecies, type SpeciesNormalizerInput } from "./species-normalizer";
import type { SpeciesSourceScopeContext } from "./species-source-scope";
import type { RawRecord } from "./raw-boundary";
import type { AddAbilityEffect, SetMovementEffect, SpeciesRule } from "@obsidian-dnd/catalog-contract";

const TEST_CONTEXT: SpeciesSourceScopeContext = {
  knownPinnedSources: Object.freeze(new Set(["PHB", "XPHB", "MPMM"])),
};

function makeRecord(overrides: Partial<RawRecord> = {}): RawRecord {
  return Object.freeze({
    name: "Human",
    source: "PHB",
    url: "https://5e.tools#Human",
    remaining: {
      size: "Medium",
      speed: 30,
      ability: [2, 1, 0, 0, 0, 0],
      darkvision: false,
    },
    ...overrides,
  });
}

function makeInput(records: RawRecord[]): SpeciesNormalizerInput {
  return { records, context: TEST_CONTEXT, sourcePath: "5etools/PHB.json", entityKind: "species" };
}

describe("normalizeSpecies", () => {
  it("normalizes a valid PHB Human with ability effects", () => {
    const result = normalizeSpecies(makeInput([makeRecord()]));
    expect(result.species).toHaveLength(1);
    const human = result.species[0]!;
    expect(human.name).toBe("Human");
    expect(human.size).toBe("Medium");
    expect(human.speed).toBe(30);
    expect(human.darkvision).toBe(false);
    expect(human.effects).toHaveLength(3); // STR +2, DEX +1, walk speed

    const strEffect = human.effects.find((e) => e.type === "add-ability" && e.ability === "STR") as AddAbilityEffect | undefined;
    expect(strEffect).toBeDefined();
    expect(strEffect!.value).toBe(2);

    const dexEffect = human.effects.find((e) => e.type === "add-ability" && e.ability === "DEX") as AddAbilityEffect | undefined;
    expect(dexEffect).toBeDefined();
    expect(dexEffect!.value).toBe(1);

    const moveEffect = human.effects.find((e) => e.type === "set-movement") as SetMovementEffect | undefined;
    expect(moveEffect).toBeDefined();
    expect(moveEffect!.mode).toBe("walk");
    expect(moveEffect!.value).toBe(30);
  });

  it("normalizes a dwarf with darkvision range", () => {
    const dwarf = makeRecord({
      name: "Dwarf",
      remaining: { size: "Medium", speed: 25, ability: [2, 0, 2, 0, 0, 0], darkvision: "60 ft" },
    });
    const result = normalizeSpecies(makeInput([dwarf]));
    expect(result.species).toHaveLength(1);
    expect(result.species[0]!.darkvision).toBe(true);

    const dvEffect = result.species[0]!.effects.find((e) => e.type === "add-sense");
    expect(dvEffect).toBeDefined();
    expect(dvEffect!.sense!.type).toBe("darkvision");
    expect(dvEffect!.sense!.range).toBe(60);
  });

  it("normalizes ability as object shape", () => {
    const record = makeRecord({
      name: "Elf",
      remaining: { size: "Medium", speed: 30, ability: { DEX: 2, CON: -1 }, darkvision: true },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    const effects = result.species[0]!.effects;
    expect(effects.find((e) => e.type === "add-ability" && e.ability === "DEX")).toBeDefined();
    expect(effects.find((e) => e.type === "add-ability" && e.ability === "CON")).toBeDefined();
  });

  it("preserves narrative content from entries", () => {
    const record = makeRecord({
      name: "Gnome",
      remaining: {
        size: "Small", speed: 25, ability: [0, 0, 0, 2, 0, 0], darkvision: "60 ft",
        entries: [
          { type: "paragraph", text: "Gnomes are a cheerful race." },
          { type: "heading", text: "Gnome Traits", level: 2 },
        ],
      },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    expect(result.species[0]!.content).toHaveLength(2);
    expect(result.species[0]!.content[0]).toEqual({ type: "paragraph", text: "Gnomes are a cheerful race." });
    expect(result.species[0]!.content[1]).toEqual({ type: "heading", level: 2, text: "Gnome Traits" });
  });

  it("excludes non-PHB/XPHB sources with EXCLUDED_SOURCE diagnostic", () => {
    const record = makeRecord({ name: "Aarakocra", source: "VGtM" });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
    expect(result.diagnostics[0]!.recordName).toBe("Aarakocra");
  });

  it("rejects unknown source with EXCLUDED_SOURCE diagnostic", () => {
    const record = makeRecord({ name: "UnknownRace", source: "NONEXISTENT" });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
  });

  it("warns on unmapped language proficiencies", () => {
    const record = makeRecord({
      name: "Half-Elf",
      remaining: {
        size: "Medium", speed: 30, ability: [0, 0, 0, 0, 0, 2], darkvision: false,
        languageProficiencies: ["Common", "Elvish"],
      },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    const diag = result.diagnostics.find((d) => d.code === "UNMAPPED_LANGUAGE");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("warning");
  });

  it("warns on missing size", () => {
    const record = makeRecord({
      remaining: { speed: 30, ability: [0, 0, 0, 0, 0, 0], darkvision: false },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    expect(result.species[0]!.size).toBe("Medium");
    const diag = result.diagnostics.find((d) => d.code === "MISSING_SIZE");
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe("error");
  });

  it("returns frozen result objects", () => {
    const result = normalizeSpecies(makeInput([makeRecord()]));
    expect(() => {
      (result.species as unknown as SpeciesRule[]).push({} as SpeciesRule);
    }).toThrow();
  });

  it("handles empty record list", () => {
    const result = normalizeSpecies(makeInput([]));
    expect(result.species).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("assigns correct source ID and ruleset for PHB", () => {
    const result = normalizeSpecies(makeInput([makeRecord()]));
    expect(result.species[0]!.sourceId).toBe("phb");
    expect(result.species[0]!.ruleset).toBe("2014");
  });

  it("normalizes XPHB source correctly", () => {
    const record = makeRecord({ name: "Human", source: "XPHB" });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    expect(result.species[0]!.sourceId).toBe("xphb");
    expect(result.species[0]!.ruleset).toBe("2024");
  });

  it("normalizes fixed 2014 language and skill structures as automatic effects", () => {
    const record = makeRecord({
      name: "Generic heritage",
      remaining: {
        size: "Medium", speed: { walk: 30 }, ability: [{ str: 2 }], darkvision: 60,
        languageProficiencies: [{ common: true }], skillProficiencies: [{ perception: true }],
        entries: [{ type: "paragraph", text: "Context remains visible." }],
      },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species[0]!.size).toBe("Medium");
    expect(result.species[0]!.effects.some((effect) => effect.type === "add-sense" && effect.sense.type === "darkvision" && effect.sense.range === 60)).toBe(true);
    expect(result.species[0]!.effects.some((effect) => effect.type === "add-language")).toBe(true);
    expect(result.species[0]!.effects.some((effect) => effect.type === "add-proficiency" && "kind" in effect.proficiency && effect.proficiency.kind === "skill")).toBe(true);
    expect(result.species[0]!.choices).toEqual([]);
    expect(result.species[0]!.content).toEqual([{ type: "paragraph", text: "Context remains visible." }]);
  });

  it("normalizes structured 2014 and 2024 choices with deterministic identities", () => {
    const base = {
      size: "Medium", speed: 30, darkvision: false,
      languageProficiencies: [{ choose: { count: 1 } }],
      skillProficiencies: [{ choose: { count: 2 } }],
      ability: [{ choose: { from: ["str", "dex"], amount: 1 } }],
    };
    const legacy = normalizeSpecies(makeInput([makeRecord({ name: "A", remaining: base })])).species[0]!;
    const modern = normalizeSpecies(makeInput([makeRecord({ name: "A", source: "XPHB", remaining: base })])).species[0]!;
    expect(legacy.choices.map((choice) => choice.type)).toEqual(["language", "skill-proficiency", "ability-allocation"]);
    expect(legacy.choices.map((choice) => choice.id)).toEqual(normalizeSpecies(makeInput([makeRecord({ name: "A", remaining: base })])).species[0]!.choices.map((choice) => choice.id));
    expect(modern.ruleset).toBe("2024");
    expect(modern.choices).toHaveLength(3);
  });

  it("diagnoses malformed structured language and skill forms without mutating raw input", () => {
    const remaining = { size: "Medium", speed: 30, ability: [], darkvision: false, languageProficiencies: ["Common"], skillProficiencies: [{ perception: "yes" }] };
    const record = makeRecord({ remaining });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining(["UNMAPPED_LANGUAGE", "UNMAPPED_PROFICIENCY"]));
    expect(remaining.languageProficiencies).toEqual(["Common"]);
  });

  it("handles speed object shape with walk key", () => {
    const record = makeRecord({
      remaining: { size: "Medium", speed: { walk: 25 }, ability: [0, 0, 0, 0, 0, 0], darkvision: false },
    });
    const result = normalizeSpecies(makeInput([record]));
    expect(result.species).toHaveLength(1);
    expect(result.species[0]!.speed).toBe(25);
  });

  it("processes multiple records with mixed outcomes", () => {
    const input = makeInput([
      makeRecord(),
      makeRecord({ name: "Aarakocra", source: "VGtM" }),
      makeRecord({ name: "Elf", source: "PHB" }),
    ]);
    const result = normalizeSpecies(input);
    expect(result.species).toHaveLength(2);
    expect(result.species.map((s) => s.name)).toContain("Human");
    expect(result.species.map((s) => s.name)).toContain("Elf");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.code).toBe("EXCLUDED_SOURCE");
  });
});
