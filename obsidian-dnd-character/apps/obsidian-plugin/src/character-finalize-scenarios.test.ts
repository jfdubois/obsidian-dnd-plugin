import { describe, expect, it } from "vitest";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import { createItemRule, createSkillRule, type BackgroundRule, type ChoiceDefinition, type ClassFeatureRule, type ClassRule, type RuleEffect, type RuleGrant, type SpeciesRule } from "@obsidian-dnd/catalog-contract";
import { deserializeCharacter, serializeCharacter } from "@obsidian-dnd/character-contract";
import { collectEffects, type CatalogLookup } from "@obsidian-dnd/rules-engine";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { finalizeCharacterWithCatalog } from "./character-finalize";
import { setCreatorChoice } from "./creator-draft-commands";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

const source = createSourceId("scenario");
const ids = { species: createEntityId("species:2014:scenario:origin"), background: createEntityId("background:2014:scenario:origin"), cls: createEntityId("class:2014:scenario:origin"), item: createEntityId("item:2014:scenario:pack"), feature: createEntityId("class-feature:2014:scenario:level-one"), skill: createEntityId("skill:2024:scenario:athletics") };
const itemGrant: RuleGrant = { id: createRuleGrantId("grant:scenario:item"), type: "item", itemId: ids.item, quantity: 1 };
const namedGrant: RuleGrant = { id: createRuleGrantId("grant:scenario:named"), type: "named-item", name: "  holy symbol  ", quantity: 1 };
const fixed: RuleGrant = { id: createRuleGrantId("grant:scenario:fixed"), type: "currency", denomination: "sp", amount: { type: "fixed", value: 12 } };
const dice: RuleGrant = { id: createRuleGrantId("grant:scenario:dice"), type: "currency", denomination: "gp", amount: { type: "dice", count: 2, dieSides: 4, multiplier: 10 } };
function effect(): RuleEffect { return { type: "add-ability", automationStatus: "full", presentation: { primary: "abilities", secondary: [] }, origin: { entityId: ids.species, sourceId: source, method: "structured" }, ability: "STR", value: 1 } as unknown as RuleEffect; }
function item() { return createItemRule(ids.item, "Scenario kit", source, "2014", "core", "adventuring-gear", [], false, [], [], [effect()], [], [], false, undefined, undefined, undefined, undefined, undefined, undefined, ["artisan-tool"], undefined, ["artisan-tool"]); }
function species(ruleset: "2014" | "2024"): SpeciesRule { return { id: ids.species, kind: "species", name: "Scenario species", sourceId: source, ruleset, access: "core", legacy: false, content: [], prerequisites: [], effects: [effect()], grants: [], choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] }; }
function background(ruleset: "2014" | "2024", choices: ChoiceDefinition[] = [], grants: RuleGrant[] = [namedGrant, fixed]): BackgroundRule { return { id: ids.background, kind: "background", name: "Scenario background", sourceId: source, ruleset, access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants, choices, dependencies: [], skillProficiencies: [] }; }
function cls(ruleset: "2014" | "2024", choices: ChoiceDefinition[]): ClassRule { return { id: ids.cls, kind: "class", name: "Scenario class", sourceId: source, ruleset, access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices: choices, startingGrants: [], levels: { 1: { level: 1, grants: [{ type: "feature", featureId: ids.feature }] } }, subclassIds: [] }; }
function feature(ruleset: "2014" | "2024"): ClassFeatureRule { return { id: ids.feature, kind: "class-feature", name: "Level one", sourceId: source, ruleset, access: "core", legacy: false, content: [], prerequisites: [], effects: [effect()], choices: [], dependencies: [], parentId: ids.cls, level: 1 }; }
function draft(ruleset: "2014" | "2024") { const value = createEmptyCharacterDraft(); value.ruleset.ruleset = ruleset; value.identity.name = "Scenario"; value.species.speciesId = ids.species; value.background.backgroundId = ids.background; value.class.classId = ids.cls; value.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }; for (const step of ALL_DRAFT_STEPS) markStepResolved(value, step); return value; }
function lookup(ruleset: "2014" | "2024"): CatalogLookup { return { getSpecies: () => species(ruleset), getBackground: () => background(ruleset), getClass: () => cls(ruleset, []), getClassFeature: () => feature(ruleset), getSubclass: () => undefined, getSubclassFeature: () => undefined, getFeat: () => undefined, getSpell: () => undefined, getItem: () => item(), getOptionalFeature: () => undefined, getSkill: () => undefined }; }

describe("representative creator finalization scenarios", () => {
  it("2014 materializes the equipment branch, then the exact stored gold branch, with level-one projection", () => {
    const equipment = createChoiceOptionId("option:2014:equipment"); const gold = createChoiceOptionId("option:2014:gold"); const definitionId = createChoiceDefinitionId("choice:2014:starting-package");
    const packageChoice: ChoiceDefinition = { id: definitionId, label: "Starting package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: equipment, label: "Equipment", grants: [itemGrant], choices: [] }, { id: gold, label: "Gold", grants: [dice], choices: [] }] };
    const value = draft("2014"); const entities = [species("2014"), background("2014"), cls("2014", [packageChoice]), item(), feature("2014")]; const choiceId = `${ids.cls}:choice:${definitionId}` as never;
    setCreatorChoice(value, entities, choiceId, { type: "option-ids", optionIds: [equipment] });
    const equipmentResult = finalizeCharacterWithCatalog(value, entities)!;
    expect(equipmentResult.inventory).toEqual(expect.arrayContaining([expect.objectContaining({ type: "catalog-item", itemId: ids.item }), expect.objectContaining({ type: "named-item", name: "holy symbol", quantity: 1 })]));
    expect(equipmentResult.currency).toMatchObject({ sp: 12, gp: 0 });
    const equipped = { ...equipmentResult, inventory: equipmentResult.inventory.map((entry) => entry.type === "catalog-item" ? { ...entry, equipped: true } : entry) };
    expect(collectEffects(equipped, lookup("2014")).filter((entry) => entry.provenance.sourceKind === "item-equipped")).toHaveLength(1);
    setCreatorChoice(value, entities, choiceId, { type: "option-ids", optionIds: [gold] }); value.randomGrantResolutions[dice.id] = 60;
    const goldResult = finalizeCharacterWithCatalog(value, entities)!;
    expect(goldResult.inventory.some((entry) => entry.type === "catalog-item")).toBe(false); expect(goldResult.currency).toMatchObject({ sp: 12, gp: 60 });
    const effects = collectEffects(goldResult, lookup("2014")); expect(effects.some((entry) => entry.provenance.sourceKind === "class-feature" && entry.provenance.level === 1)).toBe(true);
  });

  it("2024 preserves ability allocation and proficiency selections while serializing only authoritative state", () => {
    const abilityId = createChoiceDefinitionId("choice:2024:ability"); const packageId = createChoiceDefinitionId("choice:2024:package"); const proficiencyId = createChoiceDefinitionId("choice:2024:skill"); const option = createChoiceOptionId("option:2024:kit");
    const ability: ChoiceDefinition = { id: abilityId, label: "Ability", type: "ability-allocation", eligibleAbilities: ["STR", "DEX"], distributions: [{ bonuses: [2, 1] }], prerequisites: [] };
    const packageChoice: ChoiceDefinition = { id: packageId, label: "Package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: option, label: "Kit", grants: [itemGrant], choices: [] }] };
    const proficiency: ChoiceDefinition = { id: proficiencyId, label: "Skill", type: "skill-proficiency", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "proficiency", kind: "skill" }, prerequisites: [] };
    const skill = createSkillRule(ids.skill, "Athletics", source, "2024", "core", [], "STR"); const value = draft("2024"); const entities = [species("2024"), background("2024", [ability, packageChoice]), cls("2024", [proficiency]), item(), skill, feature("2024")];
    setCreatorChoice(value, entities, `${ids.background}:choice:${abilityId}` as never, { type: "ability-allocation", allocations: [{ ability: "STR", bonus: 2 }, { ability: "DEX", bonus: 1 }] }); setCreatorChoice(value, entities, `${ids.background}:choice:${packageId}` as never, { type: "option-ids", optionIds: [option] }); setCreatorChoice(value, entities, `${ids.cls}:choice:${proficiencyId}` as never, { type: "entity-ids", entityIds: [ids.skill] });
    const result = finalizeCharacterWithCatalog(value, entities)!; const roundTrip = deserializeCharacter(serializeCharacter(result));
    expect(roundTrip.abilities.scores.STR).toBe(15); expect(Object.values(roundTrip.selections).some((choice) => choice.selectedValue.type === "ability-allocation")).toBe(true); expect(roundTrip.currency).toEqual({ cp: 0, sp: 12, ep: 0, gp: 0, pp: 0 });
    expect(roundTrip.inventory).toEqual(expect.arrayContaining([expect.objectContaining({ type: "catalog-item", itemId: ids.item, quantity: 1 }), expect.objectContaining({ type: "named-item", name: "holy symbol" })])); const json = serializeCharacter(roundTrip); expect(json).not.toContain("optionQuery"); expect(json).not.toContain("randomGrantResolutions"); expect(json).not.toContain("selectedOptionIds");
  });
});
