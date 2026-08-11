import { describe, it, expect } from "vitest";
import { calculateAbilityScores } from "./ability-scores";
import {
  makeCharacter,
  makeEmptyCatalog,
  makeFeat,
  makeItem,
  makeEffect,
  eid,
  cii,
  cdi,
  iid,
} from "./effect-collection-helpers";

describe("calculateAbilityScores - feat effects", () => {
  it("applies feat add-ability effects", () => {
    const featEffect = makeEffect("add-ability", { ability: "DEX", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getFeat: () => makeFeat(eid("feat-tough"), [featEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-tough")] },
        },
      },
    });

    const result = calculateAbilityScores(character, catalog);

    const dexEntry = result.abilities.find((a) => a.ability === "DEX");
    expect(dexEntry!.finalScore).toBe(12);
    expect(dexEntry!.modifier).toBe(1);
  });
});

describe("calculateAbilityScores - item effects", () => {
  it("applies item add-ability effects (equipped)", () => {
    const itemEffect = makeEffect("add-ability", { ability: "CHA", value: 2 });
    const catalog = {
      ...makeEmptyCatalog(),
      getItem: () => makeItem(eid("item-amulet"), [itemEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
      inventory: [
        {
          instanceId: iid("amulet-1"),
          type: "catalog-item",
          itemId: eid("item-amulet"),
          quantity: 1,
          equipped: true,
          attuned: false,
        },
      ],
    });

    const result = calculateAbilityScores(character, catalog);

    const chaEntry = result.abilities.find((a) => a.ability === "CHA");
    expect(chaEntry!.finalScore).toBe(12);
    expect(chaEntry!.modifier).toBe(1);
  });

  it("applies item add-ability effects (attuned)", () => {
    const itemEffect = makeEffect("add-ability", { ability: "WIS", value: 1 });
    const catalog = {
      ...makeEmptyCatalog(),
      getItem: () => makeItem(eid("item-ring"), [itemEffect]),
    };

    const character = makeCharacter({
      abilities: {
        scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      },
      inventory: [
        {
          instanceId: iid("ring-1"),
          type: "catalog-item",
          itemId: eid("item-ring"),
          quantity: 1,
          equipped: false,
          attuned: true,
        },
      ],
    });

    const result = calculateAbilityScores(character, catalog);

    const wisEntry = result.abilities.find((a) => a.ability === "WIS");
    expect(wisEntry!.finalScore).toBe(11);
    expect(wisEntry!.modifier).toBe(0);
  });
});
