import { describe, it, expect } from "vitest";
import { buildCharacterSheetProjection } from "./character-sheet-projection";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeSpecies,
  makeClass,
  makeEffect,
  eid,
  cid,
} from "./effect-collection-helpers";
import type { CatalogLookup } from "./effect-provenance";
import {
  createAttackDefinition,
  createSimpleDamageDefinition,
  createDiceExpression,
  createMeleeRange,
} from "@obsidian-dnd/catalog-contract";

/* ── Golden Character: 2014 SRD Human Fighter 5 ─────────────────── */

describe("Golden Character 2014 - Human Fighter 5", () => {
  it("projects all calculated totals correctly", () => {
    const humanId = eid("species-human-2014");
    const fighterId = eid("class-fighter-2014");

    const human = makeSpecies(humanId, [
      makeEffect("add-ability", { ability: "STR", value: 1 }),
      makeEffect("add-ability", { ability: "DEX", value: 1 }),
      makeEffect("add-ability", { ability: "CON", value: 1 }),
      makeEffect("add-ability", { ability: "INT", value: 1 }),
      makeEffect("add-ability", { ability: "WIS", value: 1 }),
      makeEffect("add-ability", { ability: "CHA", value: 1 }),
    ]);

    const fighter = makeClass(
      fighterId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "medium" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "heavy" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "shield" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "STR" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "CON" } }),
        makeEffect("set-ac-formula", { formula: { type: "base", base: 16 } }),
        makeEffect("grant-attack", {
          attack: createAttackDefinition(
            "Longsword",
            createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "slashing"),
            createMeleeRange(5),
            [],
          ),
        }),
      ],
      { hitDie: 10, primaryAbilities: ["STR"], savingThrowProficiencies: ["STR", "CON"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2014", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: humanId, backgroundId: eid("bg-soldier") },
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: fighterId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 10, isMaximized: true },
              { level: 3, rollOrMax: 10, isMaximized: true },
              { level: 4, rollOrMax: 10, isMaximized: true },
              { level: 5, rollOrMax: 10, isMaximized: true },
            ],
          },
        ],
      },
      abilities: {
        scores: { STR: 16, DEX: 14, CON: 16, INT: 10, WIS: 12, CHA: 8 },
      },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === humanId ? human : undefined),
      getClass: (id) => (id === fighterId ? fighter : undefined),
    };

    const p = buildCharacterSheetProjection(character, catalog);

    // Total level and proficiency bonus
    expect(p.totalLevel).toBe(5);
    expect(p.proficiencyBonus).toBe(3);

    // Ability scores (base + species +1 each)
    expect(p.abilities.abilities.find((a) => a.ability === "STR")?.finalScore).toBe(17);
    expect(p.abilities.abilities.find((a) => a.ability === "STR")?.modifier).toBe(3);
    expect(p.abilities.abilities.find((a) => a.ability === "DEX")?.finalScore).toBe(15);
    expect(p.abilities.abilities.find((a) => a.ability === "DEX")?.modifier).toBe(2);
    expect(p.abilities.abilities.find((a) => a.ability === "CON")?.finalScore).toBe(17);
    expect(p.abilities.abilities.find((a) => a.ability === "CON")?.modifier).toBe(3);

    // Saving throws
    const strSave = p.savingThrows.savingThrows.find((s) => s.ability === "STR");
    expect(strSave?.isProficient).toBe(true);
    expect(strSave?.total).toBe(6); // +3 mod + 3 prof

    const dexSave = p.savingThrows.savingThrows.find((s) => s.ability === "DEX");
    expect(dexSave?.isProficient).toBe(false);
    expect(dexSave?.total).toBe(2); // +2 mod only

    // Armor proficiencies
    expect(p.proficiencies.armors.map((a) => a.category)).toContain("heavy");
    expect(p.proficiencies.armors.map((a) => a.category)).toContain("shield");
    expect(p.proficiencies.armors).toHaveLength(4);

    // Movement
    const walk = p.movementSenses.movement.find((m) => m.kind === "walk");
    expect(walk?.speed).toBe(30);

    // Max HP: level 1 (10+3) + levels 2-5 (10+3 each) = 65
    expect(p.maxHp.totalHp).toBe(65);
    expect(p.maxHp.conModifier).toBe(3);

    // Armor class (base formula = 16)
    expect(p.armorClass.total).toBe(16);
    expect(p.armorClass.formula.type).toBe("base");
    expect(p.armorClass.dexContribution).toBe(0);

    // Initiative
    expect(p.initiative.dexModifier).toBe(2);
    expect(p.initiative.isProficient).toBe(false);
    expect(p.initiative.total).toBe(2);

    // Attacks
    expect(p.attacks.attacks).toHaveLength(1);
    expect(p.attacks.attacks[0]?.name).toBe("Longsword");
    expect(p.attacks.attacks[0]?.attackBonus).toBe(6); // +3 STR + 3 prof
  });

  it("produces identical frozen snapshots across calls", () => {
    const humanId = eid("species-human-g");
    const fighterId = eid("class-fighter-g");

    const human = makeSpecies(humanId, [
      makeEffect("add-ability", { ability: "STR", value: 2 }),
    ]);

    const fighter = makeClass(
      fighterId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "heavy" } }),
        makeEffect("set-ac-formula", { formula: { type: "base", base: 18 } }),
      ],
      { hitDie: 10, primaryAbilities: ["STR"], savingThrowProficiencies: ["STR"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2014", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: humanId, backgroundId: eid("bg-soldier") },
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: fighterId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 10, isMaximized: true },
              { level: 3, rollOrMax: 10, isMaximized: true },
              { level: 4, rollOrMax: 10, isMaximized: true },
              { level: 5, rollOrMax: 10, isMaximized: true },
            ],
          },
        ],
      },
      abilities: { scores: { STR: 18, DEX: 12, CON: 16, INT: 10, WIS: 12, CHA: 8 } },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === humanId ? human : undefined),
      getClass: (id) => (id === fighterId ? fighter : undefined),
    };

    const p1 = buildCharacterSheetProjection(character, catalog);
    const p2 = buildCharacterSheetProjection(character, catalog);

    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
  });

  it("shares collected effects across sub-calculations", () => {
    const humanId = eid("species-human-s");
    const fighterId = eid("class-fighter-s");

    const human = makeSpecies(humanId, [
      makeEffect("add-ability", { ability: "STR", value: 2 }),
    ]);

    const fighter = makeClass(
      fighterId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "heavy" } }),
        makeEffect("set-ac-formula", { formula: { type: "base", base: 16 } }),
      ],
      { hitDie: 10, primaryAbilities: ["STR"], savingThrowProficiencies: ["STR"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2014", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: humanId, backgroundId: eid("bg-soldier") },
      progression: {
        classes: [
          {
            instanceId: cid("fighter-1"),
            classId: fighterId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 10, isMaximized: true },
              { level: 3, rollOrMax: 10, isMaximized: true },
              { level: 4, rollOrMax: 10, isMaximized: true },
              { level: 5, rollOrMax: 10, isMaximized: true },
            ],
          },
        ],
      },
      abilities: { scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 12, CHA: 8 } },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === humanId ? human : undefined),
      getClass: (id) => (id === fighterId ? fighter : undefined),
    };

    const p = buildCharacterSheetProjection(character, catalog);

    // Effects are frozen and shared
    expect(Object.isFrozen(p.effects)).toBe(true);
    expect(p.effects.length).toBeGreaterThan(0);

    // All effects have provenance
    for (const ce of p.effects) {
      expect(ce).toHaveProperty("effect");
      expect(ce).toHaveProperty("provenance");
      expect(ce.provenance).toHaveProperty("sourceKind");
      expect(ce.provenance).toHaveProperty("entityId");
    }

    // Contribution traces are present
    expect(Array.isArray(p.contributionTraces.traces)).toBe(true);
    expect(p.contributionTraces.traces.length).toBeGreaterThan(0);
  });
});
