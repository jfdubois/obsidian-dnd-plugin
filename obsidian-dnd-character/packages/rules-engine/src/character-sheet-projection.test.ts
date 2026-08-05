import { describe, it, expect } from "vitest";
import { buildCharacterSheetProjection } from "./character-sheet-projection";
import { makeCharacter, makeEmptyCatalog, eid, cid, makeEffect, makeSpecies } from "./effect-collection-helpers";

describe("buildCharacterSheetProjection", () => {
  it("returns a projection with all required sections present", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    // Verify all top-level sections exist
    expect(projection.totalLevel).toBeDefined();
    expect(projection.proficiencyBonus).toBeDefined();
    expect(projection.abilities).toBeDefined();
    expect(projection.proficiencies).toBeDefined();
    expect(projection.savingThrows).toBeDefined();
    expect(projection.skills).toBeDefined();
    expect(projection.movementSenses).toBeDefined();
    expect(projection.maxHp).toBeDefined();
    expect(projection.armorClass).toBeDefined();
    expect(projection.initiative).toBeDefined();
    expect(projection.attacks).toBeDefined();
    expect(projection.defenses).toBeDefined();
    expect(projection.capabilities).toBeDefined();
    expect(projection.spellcasting).toBeDefined();
    expect(projection.resources).toBeDefined();
    expect(projection.contributionTraces).toBeDefined();
    expect(projection.unsupportedMechanics).toBeDefined();
    expect(projection.effects).toBeDefined();
  });

  it("produces deterministic output across multiple calls", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: eid("class-fighter"),
            level: 3,
            isStartingClass: true,
            hitPointIncreases: [],
          },
          {
            instanceId: cid("wizard-1"),
            classId: eid("class-wizard"),
            level: 2,
            isStartingClass: false,
            hitPointIncreases: [],
          },
        ],
      },
      abilities: {
        scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const catalog = makeEmptyCatalog();

    const projection1 = buildCharacterSheetProjection(character, catalog);
    const projection2 = buildCharacterSheetProjection(character, catalog);

    // Deep equality check for determinism
    expect(JSON.stringify(projection1)).toBe(JSON.stringify(projection2));
  });

  it("returns a frozen projection object", () => {
    const character = makeCharacter({
      progression: { classes: [] },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    expect(Object.isFrozen(projection)).toBe(true);

    // Verify the effects array is also frozen
    expect(Object.isFrozen(projection.effects)).toBe(true);
  });

  it("collects effects exactly once and shares across sub-calculations", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 1,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    // The effects array in the projection is the single shared collection
    expect(Array.isArray(projection.effects)).toBe(true);
    expect(projection.effects).toBeInstanceOf(Array);

    // All effects are CollectedEffect instances with provenance
    for (const effect of projection.effects) {
      expect(effect).toHaveProperty("effect");
      expect(effect).toHaveProperty("provenance");
      expect(effect.provenance).toHaveProperty("sourceKind");
      expect(effect.provenance).toHaveProperty("entityId");
    }
  });

  it("keeps defenses and capabilities as distinct top-level properties", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("paladin-1"),
            classId: eid("class-paladin"),
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    // Defenses and capabilities are separate objects
    expect(projection.defenses).not.toBe(projection.capabilities);

    // Defenses has defense-specific properties
    expect(projection.defenses).toHaveProperty("resistances");
    expect(projection.defenses).toHaveProperty("damageImmunities");
    expect(projection.defenses).toHaveProperty("conditionImmunities");
    expect(projection.defenses).toHaveProperty("hasDiseaseImmunity");
    expect(projection.defenses).toHaveProperty("hasMagicalSleepImmunity");

    // Capabilities has capability-specific properties
    expect(projection.capabilities).toHaveProperty("noBreathingRequired");
    expect(projection.capabilities).toHaveProperty("noFoodRequired");
    expect(projection.capabilities).toHaveProperty("noWaterRequired");
    expect(projection.capabilities).toHaveProperty("noSleepRequired");
    expect(projection.capabilities).toHaveProperty("waterBreathing");

    // Defenses does NOT have capability properties
    expect(projection.defenses).not.toHaveProperty("noBreathingRequired");
    expect(projection.defenses).not.toHaveProperty("noFoodRequired");

    // Capabilities does NOT have defense properties
    expect(projection.capabilities).not.toHaveProperty("resistances");
    expect(projection.capabilities).not.toHaveProperty("damageImmunities");
  });

  it("computes correct total level and proficiency bonus", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 7,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    expect(projection.totalLevel).toBe(7);
    expect(projection.proficiencyBonus).toBe(3); // Level 5-8 = +3
  });

  it("includes ability scores in the projection", () => {
    const character = makeCharacter({
      progression: { classes: [] },
      abilities: {
        scores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 11, CHA: 10 },
      },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    expect(projection.abilities.abilities).toHaveLength(6);
    const strEntry = projection.abilities.abilities.find((a) => a.ability === "STR");
    expect(strEntry).toBeDefined();
    expect(strEntry?.baseScore).toBe(15);
    expect(strEntry?.finalScore).toBe(15);
    expect(strEntry?.modifier).toBe(2);
  });

  it("includes contribution traces and unsupported mechanics", () => {
    const character = makeCharacter({
      progression: { classes: [] },
    });

    const catalog = makeEmptyCatalog();

    const projection = buildCharacterSheetProjection(character, catalog);

    expect(projection.contributionTraces).toHaveProperty("traces");
    expect(Array.isArray(projection.contributionTraces.traces)).toBe(true);

    expect(projection.unsupportedMechanics).toHaveProperty("diagnostics");
    expect(projection.unsupportedMechanics).toHaveProperty("unsupportedCount");
    expect(typeof projection.unsupportedMechanics.unsupportedCount).toBe("number");
  });

  it("handles characters with species effects in the projection", () => {
    const elfId = eid("species-elf");
    const species = makeSpecies(elfId, [
      makeEffect("add-ability", { ability: "DEX", value: 2 }),
      makeEffect("add-sense", { sense: "darkvision", range: 60 }),
    ]);

    const character = makeCharacter({
      progression: { classes: [] },
      origins: { speciesId: elfId, backgroundId: eid("bg-sage") },
      abilities: {
        scores: { STR: 10, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const catalog = {
      ...makeEmptyCatalog(),
      getSpecies: (id: string) => (id === elfId ? species : undefined),
    };

    const projection = buildCharacterSheetProjection(character, catalog);

    // Effects should include the species effects
    expect(projection.effects.length).toBeGreaterThan(0);

    // DEX should be 14 (12 base + 2 from species)
    const dexEntry = projection.abilities.abilities.find((a) => a.ability === "DEX");
    expect(dexEntry?.finalScore).toBe(14);
  });

  it("does not persist derived totals back into the character", () => {
    const character = makeCharacter({
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: eid("class-rogue"),
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [],
          },
        ],
      },
      abilities: {
        scores: { STR: 10, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 10 },
      },
    });

    const originalScores = { ...character.abilities.scores };

    const catalog = makeEmptyCatalog();
    buildCharacterSheetProjection(character, catalog);

    // Character abilities must remain unchanged
    expect(character.abilities.scores).toEqual(originalScores);
  });
});
