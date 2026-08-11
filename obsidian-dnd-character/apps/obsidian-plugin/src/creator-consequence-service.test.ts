import { describe, expect, it } from "vitest";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createItemRule, createLanguageRule, createSkillRule, type BackgroundRule, type ChoiceDefinition, type ClassRule, type RuleGrant, type SpeciesRule } from "@obsidian-dnd/catalog-contract";
import { deriveSelectionConsequences } from "./creator-consequence-service";
import { resolveRandomCurrencyGrant } from "./creator-random-grant-resolution";
import { createEmptyCharacterDraft } from "./character-draft";
import { deriveDraftConsequences, setCreatorChoice, setCreatorOrigin } from "./creator-draft-commands";

const speciesId = createEntityId("species:2024:test:origin");
const candidateId = createEntityId("species:2024:test:candidate");
const definitionId = createChoiceDefinitionId("choice:species:language");
const optionId = createChoiceOptionId("option:package");
const backgroundId = createEntityId("background:2024:test:origin");
const backgroundDefinitionId = createChoiceDefinitionId("choice:background:language");
const classId = createEntityId("class:2024:test:origin");
const diceGrant: RuleGrant = { id: createRuleGrantId("grant:species:dice"), type: "currency", denomination: "gp", amount: { type: "dice", count: 2, dieSides: 4, multiplier: 10 } };

function choice(): ChoiceDefinition {
  return { id: definitionId, label: "Choose origin", type: "entity", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "entity", kind: "species" }, prerequisites: [] };
}

function species(choices: ChoiceDefinition[] = [], grants: RuleGrant[] = [diceGrant]): SpeciesRule {
  return { id: speciesId, kind: "species", name: "Origin", sourceId: createSourceId("test"), ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants, choices, dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] };
}

function candidate(): SpeciesRule { return { ...species(), id: candidateId, name: "Candidate", grants: [] }; }

function background(choices: ChoiceDefinition[] = []): BackgroundRule {
  return { id: backgroundId, kind: "background", name: "Origin background", sourceId: createSourceId("test"), ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices, dependencies: [], skillProficiencies: [] };
}

function classRule(choices: ChoiceDefinition[] = []): ClassRule {
  return { id: classId, kind: "class", name: "Origin class", sourceId: createSourceId("test"), ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices, dependencies: [], hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices: [], startingGrants: [], levels: {}, subclassIds: [] };
}

function input(selections: Record<string, CharacterChoice> = {}, grants: Record<string, number> = {}) {
  return { speciesId, backgroundId: null, classId: null, selections, randomGrantResolutions: grants, entities: [species([choice()]), candidate()] };
}

describe("deriveSelectionConsequences", () => {
  it("derives automatic grants, candidates, origin provenance, and unresolved diagnostics without rolling", () => {
    const model = deriveSelectionConsequences(input());
    expect(model.origins[0]?.origin.id).toBe(speciesId);
    expect(model.origins[0]?.grants[0]?.grant.id).toBe(diceGrant.id);
    expect(model.origins[0]?.choices[0]?.candidates.map((entry) => entry.id)).toContain(candidateId);
    expect(model.diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining(["unresolved-choice", "unresolved-random-grant"]));
  });

  it("validates typed entity choices and reports invalid candidates", () => {
    const instanceId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    const valid: CharacterChoice = { instanceId, definitionId, originGrantId: speciesId, selectedValue: { type: "entity-ids", entityIds: [candidateId] } };
    expect(deriveSelectionConsequences(input({ [instanceId]: valid })).origins[0]?.choices[0]?.status).toBe("resolved");
    const invalid = { ...valid, selectedValue: { type: "entity-ids" as const, entityIds: [createEntityId("species:missing")] } };
    expect(deriveSelectionConsequences(input({ [instanceId]: invalid })).diagnostics.map((entry) => entry.code)).toContain("invalid-choice");
  });

  it("activates nested option grants only for the selected closed option", () => {
    const nested: ChoiceDefinition = { id: definitionId, label: "Package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: optionId, label: "A", grants: [{ id: createRuleGrantId("grant:option:item"), type: "named-item", name: "vestments", quantity: 1 }], choices: [] }] };
    const instanceId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    const selected: CharacterChoice = { instanceId, definitionId, originGrantId: speciesId, selectedValue: { type: "option-ids", optionIds: [optionId] } };
    const model = deriveSelectionConsequences({ ...input({ [instanceId]: selected }), entities: [species([nested]), candidate()] });
    expect(model.origins[0]?.grants.some((entry) => entry.grant.id === "grant:option:item")).toBe(true);
  });

  it("hides a former parent option's nested choice while retaining its historical resolution", () => {
    const nestedId = createChoiceDefinitionId("choice:package:nested");
    const optionA = createChoiceOptionId("option:package:a");
    const optionB = createChoiceOptionId("option:package:b");
    const packageChoice: ChoiceDefinition = { id: definitionId, label: "Package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [
      { id: optionA, label: "A", grants: [], choices: [{ id: nestedId, label: "Nested", type: "entity", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "entity", kind: "species" }, prerequisites: [] }] },
      { id: optionB, label: "B", grants: [], choices: [] },
    ] };
    const parentId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    const nestedInstanceId = `${speciesId}:choice:${nestedId}:option:${optionA}` as CharacterChoice["instanceId"];
    const selectedA: CharacterChoice = { instanceId: parentId, definitionId, originGrantId: speciesId, selectedValue: { type: "option-ids", optionIds: [optionA] } };
    const nestedResolution: CharacterChoice = { instanceId: nestedInstanceId, definitionId: nestedId, originGrantId: speciesId, selectedValue: { type: "entity-ids", entityIds: [candidateId] } };
    const withA = deriveSelectionConsequences({ ...input({ [parentId]: selectedA, [nestedInstanceId]: nestedResolution }), entities: [species([packageChoice]), candidate()] });
    expect(withA.activeChoiceIds.has(nestedInstanceId)).toBe(true);
    const selectedB = { ...selectedA, selectedValue: { type: "option-ids" as const, optionIds: [optionB] } };
    const withB = deriveSelectionConsequences({ ...input({ [parentId]: selectedB, [nestedInstanceId]: nestedResolution }), entities: [species([packageChoice]), candidate()] });
    expect(withB.activeChoiceIds.has(nestedInstanceId)).toBe(false);
    expect(withB.diagnostics.some((entry) => entry.code === "stale-choice" && entry.choiceInstanceId === nestedInstanceId)).toBe(true);
  });
});

describe("resolveRandomCurrencyGrant", () => {
  it("rolls NdM × K only through the explicit injected random source", () => {
    const rolls = [0, 0.75]; let calls = 0;
    const result = resolveRandomCurrencyGrant(diceGrant.id, [diceGrant], { next: () => { calls += 1; return rolls.shift()!; } });
    expect(result).toBe(50);
    expect(calls).toBe(2);
  });
});

describe("creator draft authority", () => {
  it("stores a validated choice once, preserves it as inactive across an origin change, and leaves base abilities alone", () => {
    const draft = createEmptyCharacterDraft();
    draft.species.speciesId = speciesId;
    draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    const entities = [species([choice()]), candidate()];
    const instanceId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    setCreatorChoice(draft, entities, instanceId, { type: "entity-ids", entityIds: [candidateId] });
    expect(draft.selections[instanceId]?.selectedValue).toEqual({ type: "entity-ids", entityIds: [candidateId] });
    setCreatorOrigin(draft, "species", candidateId);
    const model = deriveDraftConsequences(draft, entities);
    expect(model.activeChoiceIds.has(instanceId)).toBe(false);
    expect(model.diagnostics.some((entry) => entry.code === "stale-choice")).toBe(true);
    expect(draft.abilities.scores?.STR).toBe(15);
  });

  it("rejects invalid generic mutations without overwriting the canonical resolution", () => {
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    const entities = [species([choice()]), candidate()];
    const instanceId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    expect(() => setCreatorChoice(draft, entities, instanceId, { type: "entity-ids", entityIds: [createEntityId("species:invalid")] })).toThrow("ineligible");
    expect(draft.selections[instanceId]).toBeUndefined();
  });

  it("keeps same-family choices independent by their origin-owned instance IDs", () => {
    const draft = createEmptyCharacterDraft();
    const backgroundChoice = { ...choice(), id: backgroundDefinitionId, label: "Background language" };
    const entities = [species([choice()]), background([backgroundChoice]), candidate()];
    setCreatorOrigin(draft, "species", speciesId);
    setCreatorOrigin(draft, "background", backgroundId);
    const model = deriveDraftConsequences(draft, entities);
    const [speciesChoice, backgroundChoiceConsequence] = model.origins.flatMap((origin) => origin.choices);
    expect(speciesChoice?.instanceId).not.toBe(backgroundChoiceConsequence?.instanceId);
    setCreatorChoice(draft, entities, speciesChoice!.instanceId, { type: "entity-ids", entityIds: [candidateId] });
    expect(draft.selections[backgroundChoiceConsequence!.instanceId]).toBeUndefined();
    setCreatorChoice(draft, entities, backgroundChoiceConsequence!.instanceId, { type: "entity-ids", entityIds: [candidateId] });
    expect(draft.selections[speciesChoice!.instanceId]?.originGrantId).toBe(speciesId);
    expect(draft.selections[backgroundChoiceConsequence!.instanceId]?.originGrantId).toBe(backgroundId);
  });

  it("reads the authoritative selection when deriving active state", () => {
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    const entities = [species([choice()]), candidate()];
    const instanceId = `${speciesId}:choice:${definitionId}` as CharacterChoice["instanceId"];
    setCreatorChoice(draft, entities, instanceId, { type: "entity-ids", entityIds: [candidateId] });
    const active = deriveDraftConsequences(draft, entities).origins[0]?.choices[0];
    expect(active?.selectedValue).toEqual({ type: "entity-ids", entityIds: [candidateId] });
    expect(active?.status).toBe("resolved");
  });

  it("uses one active read model for language, ability, package, nested equipment, and proficiency commands without inventory, base-score, or RNG mutation", () => {
    const languageId = createEntityId("language:2024:test:common");
    const skillId = createEntityId("skill:2024:test:athletics");
    const itemId = createEntityId("item:2024:test:artisan-tools");
    const language = createLanguageRule(languageId, "Common", createSourceId("test"), "2024", "core", [], "language");
    const skill = createSkillRule(skillId, "Athletics", createSourceId("test"), "2024", "core", [], "STR");
    const item = createItemRule(itemId, "Artisan tools", createSourceId("test"), "2024", "core", "adventuring-gear", [], false, [], [], [], [], [], false, undefined, undefined, undefined, undefined, undefined, undefined, ["artisan-tool"], undefined, ["artisan-tool"]);
    const languageChoice: ChoiceDefinition = { id: definitionId, label: "Species language", type: "language", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "entity", kind: "language" }, prerequisites: [] };
    const abilityChoice: ChoiceDefinition = { id: createChoiceDefinitionId("choice:background:ability"), label: "Background ability", type: "ability-allocation", eligibleAbilities: ["STR", "DEX"], distributions: [{ bonuses: [2, 1] }], prerequisites: [] };
    const nestedEquipment: ChoiceDefinition = { id: createChoiceDefinitionId("choice:package:equipment"), label: "Package tool", type: "equipment", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "equipment", equipmentGroups: ["artisan-tool"] }, prerequisites: [] };
    const packageChoice: ChoiceDefinition = { id: createChoiceDefinitionId("choice:background:package"), label: "Background package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: optionId, label: "Tools", grants: [], choices: [nestedEquipment] }] };
    const proficiencyChoice: ChoiceDefinition = { id: createChoiceDefinitionId("choice:class:skill"), label: "Class skill", type: "skill-proficiency", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "proficiency", kind: "skill" }, prerequisites: [] };
    const draft = createEmptyCharacterDraft();
    draft.species.speciesId = speciesId; draft.background.backgroundId = backgroundId; draft.class.classId = classId;
    draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    const beforeAbilities = structuredClone(draft.abilities);
    const entities = [species([languageChoice], []), background([abilityChoice, packageChoice]), classRule([proficiencyChoice]), language, skill, item];
    let active = deriveDraftConsequences(draft, entities).origins.flatMap((origin) => origin.choices);
    const byLabel = (label: string) => active.find((choice) => choice.definition.label === label)!;
    setCreatorChoice(draft, entities, byLabel("Species language").instanceId, { type: "entity-ids", entityIds: [languageId] });
    setCreatorChoice(draft, entities, byLabel("Background ability").instanceId, { type: "ability-allocation", allocations: [{ ability: "STR", bonus: 2 }, { ability: "DEX", bonus: 1 }] });
    setCreatorChoice(draft, entities, byLabel("Background package").instanceId, { type: "option-ids", optionIds: [optionId] });
    setCreatorChoice(draft, entities, byLabel("Class skill").instanceId, { type: "entity-ids", entityIds: [skillId] });
    active = deriveDraftConsequences(draft, entities).origins.flatMap((origin) => origin.choices);
    setCreatorChoice(draft, entities, active.find((choice) => choice.definition.label === "Package tool")!.instanceId, { type: "entity-ids", entityIds: [itemId] });
    expect(deriveDraftConsequences(draft, entities).origins.flatMap((origin) => origin.choices).every((choice) => choice.status === "resolved")).toBe(true);
    expect(draft.abilities).toEqual(beforeAbilities);
    expect(draft.equipment).toEqual({ items: [] });
    expect(Object.values(draft.selections).every((choice) => !("candidates" in choice))).toBe(true);
  });
});
