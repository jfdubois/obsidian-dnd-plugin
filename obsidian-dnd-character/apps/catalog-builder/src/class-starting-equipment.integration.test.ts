import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CopyResolverContext } from "./copy-resolver";
import { extractStartingEquipment } from "./class-index-helpers";
import { loadClassIndex } from "./class-index-loader";
import { normalizeClasses } from "./class-normalizer";
import type { RawRecord, ValidatedCollection, ValidatedFileEnvelope } from "./raw-boundary";
import type { EquipmentQuery } from "@obsidian-dnd/catalog-contract";

const sourcePath = existsSync(resolve(process.cwd(), "external/5etools-src/data/class"))
  ? resolve(process.cwd(), "external/5etools-src/data/class")
  : resolve(process.cwd(), "../external/5etools-src/data/class");
const context = { knownPinnedSources: new Set(["PHB", "XPHB"]) };
const copyResolverContext: CopyResolverContext = { validatedFiles: {} };

function classRecord(file: string, name: string, source: string): RawRecord {
  const parsed: unknown = JSON.parse(readFileSync(resolve(sourcePath, file), "utf8"));
  const records = (parsed as { class: Array<{ name: string; source: string }> }).class;
  const raw = records.find((record) => record.name === name && record.source === source);
  if (raw === undefined) throw new Error(`Missing pinned ${source} ${name} class record`);
  const { name: recordName, source: recordSource, ...remaining } = raw;
  return { name: recordName, source: recordSource, remaining };
}

function index(record: RawRecord) {
  const collection: ValidatedCollection = { entityKind: "class", records: [record], recordCount: 1 };
  const files: Record<string, ValidatedFileEnvelope> = {
    "class/test.json": { filePath: "class/test.json", collections: [collection], totalRecords: 1 },
  };
  return loadClassIndex({ validatedFiles: files, copyResolverContext, sourceScopeContext: context, entityKind: "class" });
}

describe("structured class starting equipment", () => {
  type ChoiceLike = { readonly type: string; readonly optionQuery?: unknown; readonly choices?: readonly ChoiceLike[]; readonly options?: readonly { readonly choices?: readonly ChoiceLike[] }[] };
  it("preserves pinned PHB Paladin packages, automatic grants, equipment-type picks, and gold alternative through normalization", () => {
    const indexed = index(classRecord("class-paladin.json", "Paladin", "PHB"));
    expect(indexed.diagnostics).toEqual([]);
    const entry = indexed.classes[0]!;
    expect(entry.startingEquipmentChoices).toHaveLength(1);
    const normalization = normalizeClasses({ entries: indexed.classes });
    expect(normalization.diagnostics).toEqual([]);
    const normalized = normalization.classes[0]!;
    const mode = normalized.startingChoices[0]!;
    expect(mode.label).toBe("Choose starting equipment or gold");
    expect(mode.type).toBe("closed-option");
    if (mode.type !== "closed-option") throw new Error("Expected package choice");
    const equipment = mode.options[0]!;
    const gold = mode.options[1]!;
    expect(equipment.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "item", itemId: "item:2014:phb:chain-mail", quantity: 1 }),
    ]));
    expect(equipment.choices).toHaveLength(4);
    expect(equipment.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "equipment", optionQuery: { type: "equipment", equipmentGroups: ["holy-spellcasting-focus"] } }),
    ]));
    const martialQueries = equipment.choices.flatMap((choice) => choice.type === "closed-option"
      ? choice.options.flatMap((option) => option.choices.filter((nested) => nested.type === "equipment")) : []);
    expect(martialQueries).toEqual(expect.arrayContaining([
      expect.objectContaining({ optionQuery: expect.objectContaining({ equipmentGroups: ["martial-weapon"], sourceId: "phb", eligibility: ["basic"] }) }),
      expect.objectContaining({ optionQuery: expect.objectContaining({ equipmentGroups: ["simple-melee-weapon"], sourceId: "phb", eligibility: ["basic"] }) }),
    ]));
    expect(gold.grants).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "currency", denomination: "gp", amount: { type: "dice", count: 5, dieSides: 4, multiplier: 10 } }),
    ]));
  });

  it("supports representative pinned 2014 and 2024 defaultData item-and-currency packages without narrative parsing", () => {
    for (const [file, name, source] of [["class-fighter.json", "Fighter", "PHB"], ["class-fighter.json", "Fighter", "XPHB"]] as const) {
      const equipment = extractStartingEquipment(classRecord(file, name, source).remaining);
      expect(equipment.diagnostics).toEqual([]);
      expect(equipment.grants.length + equipment.choices.length).toBeGreaterThan(0);
    }
  });

  it("preserves the pinned XPHB Monk plural equipmentTypes group as one normalized equipment query", () => {
    const indexed = index(classRecord("class-monk.json", "Monk", "XPHB"));
    const equipmentChoice = indexed.classes[0]?.startingEquipmentChoices[0];
    expect(indexed.classes[0]?.savingThrowProficiencies).toEqual(["STR", "DEX"]);
    expect(indexed.diagnostics.some((diagnostic) => diagnostic.code === "MISSING_SAVING_THROW_PROFICIENCIES")).toBe(false);
    expect(indexed.diagnostics.some((diagnostic) => diagnostic.code === "UNSUPPORTED_STARTING_EQUIPMENT")).toBe(false);
    expect(equipmentChoice?.options[0]?.equipmentChoices).toEqual([
      { equipmentGroups: ["musical-instrument", "artisan-tool"], quantity: 1 },
    ]);
    const normalization = normalizeClasses({ entries: indexed.classes });
    expect(normalization.diagnostics).toEqual([]);
    const normalized = normalization.classes[0]!;
    const packageChoice = normalized.startingChoices[0]!;
    if (packageChoice.type !== "closed-option") throw new Error("Expected package choice");
    expect(packageChoice.options[0]?.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "equipment", optionQuery: { type: "equipment", equipmentGroups: ["musical-instrument", "artisan-tool"] } }),
    ]));
  });

  it("normalizes real selector-local constraints for Monk, Barbarian, and Bard", () => {
    const cases = [
      ["class-monk.json", "Monk", "PHB", ["simple-weapon"], ["phb"], ["basic"]],
      ["class-barbarian.json", "Barbarian", "PHB", ["martial-melee-weapon"], ["phb"], ["basic"]],
      ["class-bard.json", "Bard", "PHB", ["musical-instrument"], undefined, ["mundane"]],
    ] as const;
    for (const [file, name, source, groups, sourceIds, eligibility] of cases) {
      const indexed = index(classRecord(file, name, source));
      const normalized = normalizeClasses({ entries: indexed.classes }).classes[0]!;
      const queries: EquipmentQuery[] = [];
      const visit = (choices: readonly ChoiceLike[]): void => choices.forEach((choice) => {
        if (choice.type === "equipment" && typeof choice.optionQuery === "object" && choice.optionQuery !== null && (choice.optionQuery as { type?: unknown }).type === "equipment") queries.push(choice.optionQuery as EquipmentQuery);
        if (choice.choices) visit(choice.choices);
        if (choice.options) choice.options.forEach((option) => visit(option.choices ?? []));
      });
      visit(normalized.startingChoices);
      expect(queries).toEqual(expect.arrayContaining([
        expect.objectContaining({ equipmentGroups: groups, ...(sourceIds === undefined ? {} : { sourceId: sourceIds[0] }), eligibility }),
      ]));
    }
  });

  it("diagnoses malformed structured 2024 proficiency data", () => {
    const indexed = index({ name: "Broken 2024", source: "XPHB", remaining: {
      hd: { number: 1, faces: 8 }, primaryAbility: [{ dex: true }], proficiency: [42],
    } });
    expect(indexed.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_SAVING_THROW_PROFICIENCIES", message: expect.stringContaining("saving throw") }),
    ]));
  });

  it("diagnoses a recognized but unsupported starting-equipment filter constraint", () => {
    const indexed = index({ name: "Unsupported filter", source: "PHB", remaining: {
      hd: { number: 1, faces: 8 }, proficiency: ["str", "con"],
      startingEquipment: {
        default: ["any {@filter martial weapon|items|source=phb|category=basic|type=martial weapon|property=light}"],
        defaultData: [{ a: [{ equipmentType: "weaponMartial" }], b: [{ value: 500 }] }],
      },
    } });
    expect(indexed.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSUPPORTED_STARTING_EQUIPMENT", message: expect.stringContaining("property") }),
    ]));
  });

  it.each([
    { label: "empty array", equipmentTypes: [] },
    { label: "unknown type", equipmentTypes: ["unknownType"] },
    { label: "non-string member", equipmentTypes: [42] },
  ])("reports malformed plural equipmentTypes ($label) rather than publishing an empty class grant set", ({ equipmentTypes }) => {
    const indexed = index({ name: "Broken", source: "PHB", remaining: {
      hd: { number: 1, faces: 8 }, proficiency: ["str", "con"],
      startingEquipment: { defaultData: [{ a: [{ equipmentTypes }], b: [{ value: 500 }] }] },
    } });
    expect(indexed.classes[0]?.startingEquipmentChoices).toEqual([]);
    expect(indexed.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNSUPPORTED_STARTING_EQUIPMENT", message: expect.stringContaining("equipmentTypes") }),
    ]));
    const normalization = normalizeClasses({ entries: indexed.classes });
    expect(normalization.classes).toEqual([]);
    expect(normalization.diagnostics).toEqual([
      expect.objectContaining({
        code: "UNSUPPORTED_STARTING_EQUIPMENT",
        severity: "error",
        message: expect.stringContaining("equipmentTypes"),
      }),
    ]);
  });
});
