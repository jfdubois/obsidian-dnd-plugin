import { describe, expect, it } from "vitest";
import { createCatalogRevision, createChoiceDefinitionId, createChoiceOptionId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import type { BackgroundRule, ChoiceDefinition, ClassRule, RuleGrant, SpeciesRule } from "@obsidian-dnd/catalog-contract";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { deriveDraftConsequences, clearCreatorRandomGrant, resolveCreatorRandomGrant, setCreatorChoice, setCreatorOrigin } from "./creator-draft-commands";
import { resolveRandomCurrencyGrant } from "./creator-random-grant-resolution";
import { finalizeCharacterWithCatalog } from "./character-finalize";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

const sourceId = createSourceId("test");
const revision = createCatalogRevision("random-grant-test-revision");
const speciesId = createEntityId("species:2024:random:test");
const otherSpeciesId = createEntityId("species:2024:random:other");
const classId = createEntityId("class:2024:random:test");
const backgroundId = createEntityId("background:2024:random:test");
const fixedId = createRuleGrantId("grant:random:fixed");
const diceId = createRuleGrantId("grant:random:dice");
const otherDiceId = createRuleGrantId("grant:random:other-dice");
const dice: RuleGrant = { id: diceId, type: "currency", denomination: "gp", amount: { type: "dice", count: 5, dieSides: 4, multiplier: 10 } };
const fixed: RuleGrant = { id: fixedId, type: "currency", denomination: "sp", amount: { type: "fixed", value: 7 } };

function species(id = speciesId, grants: RuleGrant[] = [fixed, dice]): SpeciesRule {
  return { id, kind: "species", name: "Random test", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants, choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] };
}

function classRule(startingChoices: ChoiceDefinition[] = []): ClassRule {
  return { id: classId, kind: "class", name: "Random class", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices, startingGrants: [], levels: {}, subclassIds: [] };
}

function background(): BackgroundRule {
  return { id: backgroundId, kind: "background", name: "Random background", sourceId, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], skillProficiencies: [] };
}

function completeDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2024"; draft.identity.name = "Random"; draft.species.speciesId = speciesId;
  draft.background.backgroundId = backgroundId; draft.class.classId = classId;
  draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
  for (const step of ALL_DRAFT_STEPS) markStepResolved(draft, step);
  return draft;
}

function roll(values: number[]): { next(): number } { return { next: () => values.shift() ?? 0 }; }

describe("creator random grant resolution", () => {
  it("rolls exact NdM and NdM × K values only through the injected source", () => {
    const plain: RuleGrant = { ...dice, id: createRuleGrantId("grant:random:plain"), amount: { type: "dice", count: 5, dieSides: 4, multiplier: 1 } };
    expect(resolveRandomCurrencyGrant(plain.id, [plain], roll([0, .25, .5, .75, 0]))).toBe(11);
    expect(resolveRandomCurrencyGrant(diceId, [dice], roll([0, .25, .5, .75, 0]))).toBe(110);
    expect(() => resolveRandomCurrencyGrant(diceId, [dice], roll([1]))).toThrow("[0, 1)");
  });

  it("derives fixed currency directly and validates dice resolutions against range and multiplier without mutation or RNG", () => {
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    draft.randomGrantResolutions[diceId] = 73;
    const before = structuredClone(draft);
    const first = deriveDraftConsequences(draft, [species()]);
    const second = deriveDraftConsequences(draft, [species()]);
    expect(first).toEqual(second);
    expect(first.origins[0]?.grants.find((entry) => entry.grant.id === fixedId)?.resolvedAmount).toBe(7);
    expect(first.origins[0]?.grants.find((entry) => entry.grant.id === diceId)?.randomResolution?.status).toBe("invalid");
    expect(first.diagnostics.map((entry) => entry.code)).toContain("invalid-random-grant");
    expect(draft).toEqual(before);
    draft.randomGrantResolutions[diceId] = 210;
    expect(deriveDraftConsequences(draft, [species()]).diagnostics.map((entry) => entry.code)).toContain("invalid-random-grant");
    draft.randomGrantResolutions[diceId] = 110;
    expect(deriveDraftConsequences(draft, [species()]).origins[0]?.grants.find((entry) => entry.grant.id === diceId)?.resolvedAmount).toBe(110);
  });

  it("rejects unknown, inactive, fixed, and already-resolved grants without rerolling, and clear is explicit", () => {
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    let calls = 0; const random = { next: () => { calls += 1; return 0; } };
    expect(() => resolveCreatorRandomGrant(draft, [species()], fixedId, random)).toThrow("not found");
    expect(() => resolveCreatorRandomGrant(draft, [species()], otherDiceId, random)).toThrow("not found");
    expect(resolveCreatorRandomGrant(draft, [species()], diceId, random)).toBe(50);
    expect(draft.randomGrantResolutions).toEqual({ [diceId]: 50 });
    expect(calls).toBe(5);
    expect(() => resolveCreatorRandomGrant(draft, [species()], diceId, random)).toThrow("already resolved");
    expect(calls).toBe(5);
    clearCreatorRandomGrant(draft, [species()], diceId);
    expect(draft.randomGrantResolutions[diceId]).toBeUndefined();
    setCreatorOrigin(draft, "species", null);
    expect(() => clearCreatorRandomGrant(draft, [species()], diceId)).toThrow("not active");
  });

  it("preserves active results across unrelated changes and origin deactivation, but never applies them to a different grant", () => {
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    resolveCreatorRandomGrant(draft, [species(), species(otherSpeciesId, [{ ...dice, id: otherDiceId }])], diceId, roll([0, 0, 0, 0, 0]));
    draft.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
    const snapshot = structuredClone(draft);
    expect(deriveDraftConsequences(draft, [species(), species(otherSpeciesId, [{ ...dice, id: otherDiceId }])]).activeGrantIds.has(diceId)).toBe(true);
    setCreatorOrigin(draft, "species", otherSpeciesId);
    const changed = deriveDraftConsequences(draft, [species(), species(otherSpeciesId, [{ ...dice, id: otherDiceId }])]);
    expect(changed.activeGrantIds.has(diceId)).toBe(false);
    expect(changed.origins[0]?.grants[0]?.resolvedAmount).toBeUndefined();
    expect(changed.diagnostics.map((entry) => entry.code)).toContain("unresolved-random-grant");
    setCreatorOrigin(draft, "species", speciesId);
    expect(deriveDraftConsequences(draft, [species(), species(otherSpeciesId, [{ ...dice, id: otherDiceId }])]).origins[0]?.grants.find((entry) => entry.grant.id === diceId)?.resolvedAmount).toBe(50);
    expect(draft.abilities).toEqual(snapshot.abilities);
    expect(draft.selections).toEqual(snapshot.selections);
    expect(draft.equipment).toEqual(snapshot.equipment);
  });

  it("tracks independently active dice grants and restores a nested gold package result when its option returns", () => {
    const second: RuleGrant = { ...dice, id: otherDiceId, denomination: "cp" };
    const draft = createEmptyCharacterDraft(); draft.species.speciesId = speciesId;
    resolveCreatorRandomGrant(draft, [species(speciesId, [dice, second])], diceId, roll([0, 0, 0, 0, 0]));
    const afterOne = deriveDraftConsequences(draft, [species(speciesId, [dice, second])]);
    expect(afterOne.origins[0]?.grants.find((entry) => entry.grant.id === diceId)?.randomResolution?.status).toBe("resolved");
    expect(afterOne.origins[0]?.grants.find((entry) => entry.grant.id === otherDiceId)?.randomResolution?.status).toBe("unresolved");
    const equipment = createChoiceOptionId("option:random:equipment"); const gold = createChoiceOptionId("option:random:gold"); const definitionId = createChoiceDefinitionId("choice:random:starting-package");
    const packages: ChoiceDefinition = { id: definitionId, label: "Starting equipment", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: equipment, label: "Equipment", grants: [], choices: [] }, { id: gold, label: "Gold", grants: [dice], choices: [] }] };
    draft.species.speciesId = null; draft.class.classId = classId;
    const entities = [classRule([packages])]; const choiceId = `${classId}:choice:${definitionId}` as never;
    setCreatorChoice(draft, entities, choiceId, { type: "option-ids", optionIds: [gold] });
    expect(deriveDraftConsequences(draft, entities).activeGrantIds.has(diceId)).toBe(true);
    expect(deriveDraftConsequences(draft, entities).origins[0]?.grants[0]?.resolvedAmount).toBe(50);
    setCreatorChoice(draft, entities, choiceId, { type: "option-ids", optionIds: [equipment] });
    expect(deriveDraftConsequences(draft, entities).activeGrantIds.has(diceId)).toBe(false);
    setCreatorChoice(draft, entities, choiceId, { type: "option-ids", optionIds: [gold] });
    expect(deriveDraftConsequences(draft, entities).origins[0]?.grants[0]?.resolvedAmount).toBe(50);
  });

  it("blocks finalization only for active missing or invalid dice results, never inactive historical state", () => {
    const draft = completeDraft(); const entities = [species(), background(), classRule()];
    expect(finalizeCharacterWithCatalog(draft, entities, revision)).toBeNull();
    draft.randomGrantResolutions[diceId] = 73;
    expect(finalizeCharacterWithCatalog(draft, entities, revision)).toBeNull();
    draft.species.speciesId = otherSpeciesId;
    const inactive = deriveDraftConsequences(draft, [species(otherSpeciesId, []), background(), classRule()]);
    expect(inactive.diagnostics.map((entry) => entry.code)).not.toContain("invalid-random-grant");
    expect(finalizeCharacterWithCatalog(draft, [species(otherSpeciesId, []), background(), classRule()], revision)).not.toBeNull();
  });
});
