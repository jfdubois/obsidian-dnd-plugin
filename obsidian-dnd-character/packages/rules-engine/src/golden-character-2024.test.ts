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

/* ── Golden Character: 2024 SRD Elf Rogue 5 ─────────────────────── */

describe("Golden Character 2024 - Elf Rogue 5", () => {
  it("projects all calculated totals correctly", () => {
    const elfId = eid("species-elf-2024");
    const rogueId = eid("class-rogue-2024");

    const elf = makeSpecies(elfId, [
      makeEffect("add-ability", { ability: "DEX", value: 2 }),
      makeEffect("add-sense", { sense: { type: "darkvision", range: 60 } }),
    ]);

    const stealthId = eid("skill-stealth");
    const rogue = makeClass(
      rogueId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "DEX" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "saving-throw", ability: "INT" } }),
        makeEffect("add-proficiency", { proficiency: { kind: "skill", skillId: stealthId } }),
        makeEffect("add-expertise", { proficiency: { kind: "skill", skillId: stealthId } }),
        makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
        makeEffect("grant-attack", {
          attack: createAttackDefinition(
            "Rapiers",
            createSimpleDamageDefinition(createDiceExpression(1, 8, 0), "piercing"),
            createMeleeRange(5),
            ["finesse"],
          ),
        }),
        makeEffect("grant-resource", {
          resource: {
            name: "Sneak Attack",
            maximum: { type: "fixed", value: 3 },
            recovery: { type: "none" },
          },
        }),
      ],
      { hitDie: 8, primaryAbilities: ["DEX"], savingThrowProficiencies: ["DEX", "INT"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2024", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: elfId, backgroundId: eid("bg-sage") },
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: rogueId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 8, isMaximized: true },
              { level: 3, rollOrMax: 8, isMaximized: true },
              { level: 4, rollOrMax: 8, isMaximized: true },
              { level: 5, rollOrMax: 8, isMaximized: true },
            ],
          },
        ],
      },
      abilities: {
        scores: { STR: 10, DEX: 16, CON: 14, INT: 14, WIS: 12, CHA: 8 },
      },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === elfId ? elf : undefined),
      getClass: (id) => (id === rogueId ? rogue : undefined),
    };

    const p = buildCharacterSheetProjection(character, catalog);

    // Total level and proficiency bonus
    expect(p.totalLevel).toBe(5);
    expect(p.proficiencyBonus).toBe(3);

    // Ability scores (DEX +2 from elf)
    expect(p.abilities.abilities.find((a) => a.ability === "DEX")?.finalScore).toBe(18);
    expect(p.abilities.abilities.find((a) => a.ability === "DEX")?.modifier).toBe(4);
    expect(p.abilities.abilities.find((a) => a.ability === "INT")?.finalScore).toBe(14);
    expect(p.abilities.abilities.find((a) => a.ability === "INT")?.modifier).toBe(2);

    // Saving throws
    const dexSave = p.savingThrows.savingThrows.find((s) => s.ability === "DEX");
    expect(dexSave?.isProficient).toBe(true);
    expect(dexSave?.total).toBe(6); // +3 base mod + 3 prof

    const intSave = p.savingThrows.savingThrows.find((s) => s.ability === "INT");
    expect(intSave?.isProficient).toBe(true);
    expect(intSave?.total).toBe(5); // +2 mod + 3 prof

    // Armor proficiencies
    expect(p.proficiencies.armors.map((a) => a.category)).toContain("light");

    // Movement and senses
    const walk = p.movementSenses.movement.find((m) => m.kind === "walk");
    expect(walk?.speed).toBe(30);
    const dv = p.movementSenses.senses.find((s) => s.kind === "darkvision");
    expect(dv?.hasSense).toBe(true);
    expect(dv?.range).toBe(60);

    // Max HP: level 1 (8+2) + levels 2-5 (8+2 each) = 50
    expect(p.maxHp.totalHp).toBe(50);
    expect(p.maxHp.conModifier).toBe(2);

    // Armor class (dex-plus: 12 + min(+4, 2) = 14)
    expect(p.armorClass.total).toBe(14);
    expect(p.armorClass.formula.type).toBe("dex-plus");
    expect(p.armorClass.dexContribution).toBe(2);

    // Initiative (uses base DEX modifier)
    expect(p.initiative.dexModifier).toBe(3);
    expect(p.initiative.isProficient).toBe(false);
    expect(p.initiative.total).toBe(3);

    // Attacks
    expect(p.attacks.attacks).toHaveLength(1);
    expect(p.attacks.attacks[0]?.name).toBe("Rapiers");
    expect(p.attacks.attacks[0]?.attackBonus).toBe(7); // +4 DEX + 3 prof

    // Resources (Sneak Attack)
    expect(p.resources.resources).toHaveLength(1);
    expect(p.resources.resources[0]?.name).toBe("Sneak Attack");
    expect(p.resources.resources[0]?.maximum).toBe(3);
    expect(p.resources.explanations.length).toBeGreaterThan(0);

    // Defenses and capabilities are distinct
    expect(p.defenses).not.toBe(p.capabilities);
    expect(Array.isArray(p.defenses.resistances)).toBe(true);
    expect(Array.isArray(p.defenses.damageImmunities)).toBe(true);
    expect(typeof p.capabilities.noBreathingRequired).toBe("boolean");
  });

  it("produces identical frozen snapshots across calls", () => {
    const elfId = eid("species-elf-g");
    const rogueId = eid("class-rogue-g");

    const elf = makeSpecies(elfId, [
      makeEffect("add-ability", { ability: "DEX", value: 2 }),
    ]);

    const rogue = makeClass(
      rogueId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
        makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
      ],
      { hitDie: 8, primaryAbilities: ["DEX"], savingThrowProficiencies: ["DEX", "INT"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2024", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: elfId, backgroundId: eid("bg-sage") },
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: rogueId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 8, isMaximized: true },
              { level: 3, rollOrMax: 8, isMaximized: true },
              { level: 4, rollOrMax: 8, isMaximized: true },
              { level: 5, rollOrMax: 8, isMaximized: true },
            ],
          },
        ],
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 14, INT: 14, WIS: 12, CHA: 8 } },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === elfId ? elf : undefined),
      getClass: (id) => (id === rogueId ? rogue : undefined),
    };

    const p1 = buildCharacterSheetProjection(character, catalog);
    const p2 = buildCharacterSheetProjection(character, catalog);

    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
  });

  it("shares collected effects and produces contribution traces", () => {
    const elfId = eid("species-elf-s");
    const rogueId = eid("class-rogue-s");

    const elf = makeSpecies(elfId, [
      makeEffect("add-ability", { ability: "DEX", value: 2 }),
    ]);

    const rogue = makeClass(
      rogueId,
      [
        makeEffect("add-proficiency", { proficiency: { kind: "armor", category: "light" } }),
        makeEffect("set-ac-formula", { formula: { type: "dex-plus", base: 12, maxDexBonus: 2 } }),
        makeEffect("grant-resource", {
          resource: {
            name: "Sneak Attack",
            maximum: { type: "fixed", value: 3 },
            recovery: { type: "none" },
          },
        }),
      ],
      { hitDie: 8, primaryAbilities: ["DEX"], savingThrowProficiencies: ["DEX", "INT"] },
    );

    const character = makeCharacter({
      contentPolicy: { ruleset: "2024", enabledSourceIds: [], mode: "snapshot" },
      origins: { speciesId: elfId, backgroundId: eid("bg-sage") },
      progression: {
        classes: [
          {
            instanceId: cid("rogue-1"),
            classId: rogueId,
            level: 5,
            isStartingClass: true,
            hitPointIncreases: [
              { level: 2, rollOrMax: 8, isMaximized: true },
              { level: 3, rollOrMax: 8, isMaximized: true },
              { level: 4, rollOrMax: 8, isMaximized: true },
              { level: 5, rollOrMax: 8, isMaximized: true },
            ],
          },
        ],
      },
      abilities: { scores: { STR: 10, DEX: 16, CON: 14, INT: 14, WIS: 12, CHA: 8 } },
    });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: (id) => (id === elfId ? elf : undefined),
      getClass: (id) => (id === rogueId ? rogue : undefined),
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

    // Resource explanations are present
    expect(Array.isArray(p.resources.explanations)).toBe(true);
    expect(p.resources.explanations.length).toBeGreaterThan(0);
  });
});
