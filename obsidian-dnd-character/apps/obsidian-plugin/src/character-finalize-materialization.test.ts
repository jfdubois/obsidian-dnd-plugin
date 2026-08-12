import { describe, expect, it } from "vitest";
import { createChoiceDefinitionId, createChoiceInstanceId, createChoiceOptionId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import { createItemRule, type BackgroundRule, type ChoiceDefinition, type ClassRule, type RuleGrant, type SpeciesRule } from "@obsidian-dnd/catalog-contract";
import { serializeCharacter, type CharacterChoice } from "@obsidian-dnd/character-contract";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { isDraftCompleteWithoutCatalogOriginChoices } from "./character-draft";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { finalizeCharacterWithCatalog } from "./character-finalize";
import { setCreatorChoice } from "./creator-draft-commands";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

const sourceId = createSourceId("finalize-test");
const speciesId = createEntityId("species:2024:finalize:origin");
const staleSpeciesId = createEntityId("species:2024:finalize:stale");
const backgroundId = createEntityId("background:2024:finalize:origin");
const classId = createEntityId("class:2024:finalize:origin");
const itemId = createEntityId("item:2024:finalize:pack");
const itemGrant: RuleGrant = { id: createRuleGrantId("grant:finalize:item"), type: "item", itemId, quantity: 2 };
const namedGrant: RuleGrant = { id: createRuleGrantId("grant:finalize:named"), type: "named-item", name: "  priestly vestments  ", quantity: 1 };
const fixedGrant: RuleGrant = { id: createRuleGrantId("grant:finalize:fixed"), type: "currency", denomination: "sp", amount: { type: "fixed", value: 7 } };
const diceGrant: RuleGrant = { id: createRuleGrantId("grant:finalize:dice"), type: "currency", denomination: "gp", amount: { type: "dice", count: 2, dieSides: 4, multiplier: 10 } };

function item() { return createItemRule(itemId, "Pack sword", sourceId, "2024", "core", "weapon", [], false, [], [], [], [], [], false, undefined, undefined, undefined, undefined, undefined, undefined, ["artisan-tool"], undefined, ["artisan-tool"]); }
function species(id = speciesId, grants: RuleGrant[] = [itemGrant, namedGrant, fixedGrant, diceGrant]): SpeciesRule { return { id, kind: "species", name: "Origin", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants, choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] }; }
function background(): BackgroundRule { return { id: backgroundId, kind: "background", name: "Background", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], skillProficiencies: [] }; }
function classRule(startingChoices: ChoiceDefinition[] = []): ClassRule { return { id: classId, kind: "class", name: "Class", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices, startingGrants: [], levels: {}, subclassIds: [] }; }
function draft() { const value = createEmptyCharacterDraft(); value.ruleset.ruleset = "2024"; value.identity.name = "Materialized"; value.species.speciesId = speciesId; value.background.backgroundId = backgroundId; value.class.classId = classId; value.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }; for (const step of ALL_DRAFT_STEPS) markStepResolved(value, step); return value; }

describe("catalog-aware creator finalization", () => {
  it("does not require legacy global buckets for review or materialization", () => {
    const value = draft();
    for (const step of ["proficiency-choices", "proficiencies", "language-choices", "languages", "equipment-choices", "equipment"] as const) value.stepStatuses.set(step, "unvisited");
    expect(isDraftCompleteWithoutCatalogOriginChoices(value)).toBe(true);
    expect(buildReviewSnapshot(value)).not.toBeNull();
    expect(finalizeCharacterWithCatalog(value, [species(speciesId, []), background(), classRule(), item()])).not.toBeNull();
  });

  it("materializes active item, named-item, fixed and resolved dice grants without mutating the draft or catalog", () => {
    const value = draft(); value.randomGrantResolutions[diceGrant.id] = 50;
    const entities = [species(), background(), classRule(), item()]; const beforeDraft = structuredClone(value); const beforeCatalog = structuredClone(entities);
    const result = finalizeCharacterWithCatalog(value, entities);
    expect(result?.inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "catalog-item", itemId, quantity: 2, equipped: false, attuned: false }),
      expect.objectContaining({ type: "named-item", name: "priestly vestments", quantity: 1, equipped: false }),
    ]));
    expect(result?.currency).toMatchObject({ sp: 7, gp: 50 });
    expect(result?.progression.classes[0]?.level).toBe(1);
    expect(value).toEqual(beforeDraft); expect(entities).toEqual(beforeCatalog);
    const json = serializeCharacter(result!);
    expect(json).not.toContain("randomGrantResolutions"); expect(json).not.toContain("dieSides"); expect(json).not.toContain("creator diagnostics");
  });

  it("materializes only the selected equipment-or-gold package and persists only active choices", () => {
    const equipment = createChoiceOptionId("option:finalize:equipment"); const gold = createChoiceOptionId("option:finalize:gold");
    const definitionId = createChoiceDefinitionId("choice:finalize:package");
    const choice: ChoiceDefinition = { id: definitionId, label: "Starting package", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [
      { id: equipment, label: "Equipment", grants: [itemGrant], choices: [] }, { id: gold, label: "Gold", grants: [diceGrant], choices: [] },
    ] };
    const value = draft(); const entities = [species(speciesId, []), background(), classRule([choice]), item()];
    const choiceId = `${classId}:choice:${definitionId}` as never;
    setCreatorChoice(value, entities, choiceId, { type: "option-ids", optionIds: [equipment] });
    const equipmentResult = finalizeCharacterWithCatalog(value, entities);
    expect(equipmentResult?.inventory.some((entry) => entry.type === "catalog-item" && entry.itemId === itemId)).toBe(true);
    expect(equipmentResult?.currency.gp).toBe(0);
    setCreatorChoice(value, entities, choiceId, { type: "option-ids", optionIds: [gold] }); value.randomGrantResolutions[diceGrant.id] = 60;
    const goldResult = finalizeCharacterWithCatalog(value, entities);
    expect(goldResult?.inventory.some((entry) => entry.type === "catalog-item" && entry.itemId === itemId)).toBe(false);
    expect(goldResult?.currency.gp).toBe(60); expect(Object.keys(goldResult!.selections)).toEqual([choiceId]);
  });

  it("rejects active blockers before construction while ignoring inactive historical values", () => {
    const value = draft(); const before = structuredClone(value);
    expect(finalizeCharacterWithCatalog(value, [species(), background(), classRule(), item()])).toBeNull();
    expect(value).toEqual(before);
    value.species.speciesId = staleSpeciesId; value.randomGrantResolutions[diceGrant.id] = 999;
    const staleChoiceId = createChoiceInstanceId("choice:finalize:historical");
    value.selections[staleChoiceId] = { instanceId: staleChoiceId, definitionId: createChoiceDefinitionId("choice:finalize:historical"), originGrantId: speciesId, selectedValue: { type: "entity-ids", entityIds: [speciesId] } } as CharacterChoice;
    const result = finalizeCharacterWithCatalog(value, [species(staleSpeciesId, []), background(), classRule(), item()]);
    expect(result).not.toBeNull(); expect(result!.inventory).toHaveLength(0); expect(result!.currency).toMatchObject({ gp: 0, sp: 0 }); expect(result!.selections[staleChoiceId]).toBeUndefined();
  });
});
