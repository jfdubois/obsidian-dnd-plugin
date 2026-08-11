import { describe, it, expect } from "vitest";
import type { EntityId } from "@obsidian-dnd/domain";
import type { CatalogLookup } from "./effect-provenance";
import { collectEffects } from "./effect-collection";
import {
  eid,
  cii,
  cdi,
  iid,
  makeEffect,
  makeSpecies,
  makeBackground,
  makeFeat,
  makeSpell,
  makeItem,
  makeCharacter,
  makeEmptyCatalog,
} from "./effect-collection-helpers";

/* ── Feat, spell, and item tests ────────────────────────────────── */

describe("collectEffects - feats", () => {
  it("collects feat effects from selections", () => {
    const featEffect = makeEffect("add-ability", { ability: "STR", value: 1 });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getFeat: () => makeFeat(eid("feat-tough"), [featEffect]),
    };

    const character = makeCharacter({
      selections: {
        [cii("choice-1")]: {
          instanceId: cii("choice-1"),
          definitionId: cdi("def-1"),
          originGrantId: eid("grant-1"),
          selectedValue: { type: "entity-ids", entityIds: [eid("feat-tough")] },
        },
      },
    });

    const result = collectEffects(character, catalog);
    const featEffects = result.filter((e) => e.provenance.sourceKind === "feat");

    expect(featEffects).toHaveLength(1);
    expect(featEffects[0]!.effect).toBe(featEffect);
  });
});

describe("collectEffects - spells", () => {
  it("collects spell effects from spell selections", () => {
    const spellEffect = makeEffect("grant-spell", { spell: { type: "known", spellId: eid("spell-firebolt") } });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getSpell: () => makeSpell(eid("spell-firebolt"), [spellEffect]),
    };

    const character = makeCharacter({
      spells: {
        selections: [{ spellId: eid("spell-firebolt"), acquisition: "known" }],
        spellSlotsUsed: {},
      },
    });

    const result = collectEffects(character, catalog);
    const spellEffects = result.filter((e) => e.provenance.sourceKind === "spell");

    expect(spellEffects).toHaveLength(1);
    expect(spellEffects[0]!.effect).toBe(spellEffect);
  });
});

describe("collectEffects - items", () => {
  it("collects equipped item effects before attuned item effects", () => {
    const equippedEffect = makeEffect("add-ac", { value: { type: "fixed", value: 2 } });
    const attunedEffect = makeEffect("add-sense", { sense: { type: "darkvision", range: 60 } });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getItem: (id: EntityId) => {
        if (id === eid("item-armor")) {
          return makeItem(eid("item-armor"), [equippedEffect], { category: "armor", rarity: "common", requiresAttunement: false, bodySlot: "armor", weight: 55, cost: { amount: 75, unit: "gp" } });
        }
        if (id === eid("item-amulet")) {
          return makeItem(eid("item-amulet"), [attunedEffect], { rarity: "uncommon", requiresAttunement: true, weight: 1, cost: { amount: 500, unit: "gp" } });
        }
        return undefined;
      },
    };

    const character = makeCharacter({
      inventory: [
        { instanceId: iid("inv-1"), type: "catalog-item", itemId: eid("item-armor"), quantity: 1, equipped: true, attuned: false },
        { instanceId: iid("inv-2"), type: "catalog-item", itemId: eid("item-amulet"), quantity: 1, equipped: false, attuned: true },
      ],
    });

    const result = collectEffects(character, catalog);
    const itemEffects = result.filter((e) => e.provenance.sourceKind === "item-equipped" || e.provenance.sourceKind === "item-attuned");

    expect(itemEffects).toHaveLength(2);
    expect(itemEffects[0]!.provenance.sourceKind).toBe("item-equipped");
    expect(itemEffects[1]!.provenance.sourceKind).toBe("item-attuned");
  });

  it("does not double-count items that are both equipped and attuned", () => {
    const itemEffect = makeEffect("add-ac", { value: { type: "fixed", value: 1 } });

    const catalog: CatalogLookup = {
      ...makeEmptyCatalog(),
      getSpecies: () => makeSpecies(eid("species-elf")),
      getBackground: () => makeBackground(eid("bg-sage")),
      getItem: () => makeItem(eid("item-ring"), [itemEffect], { rarity: "rare", requiresAttunement: true, weight: 0, cost: { amount: 1000, unit: "gp" } }),
    };

    const character = makeCharacter({
      inventory: [
        { instanceId: iid("inv-1"), type: "catalog-item", itemId: eid("item-ring"), quantity: 1, equipped: true, attuned: true },
      ],
    });

    const result = collectEffects(character, catalog);
    const itemEffects = result.filter((e) => e.provenance.sourceKind === "item-equipped" || e.provenance.sourceKind === "item-attuned");

    expect(itemEffects).toHaveLength(1);
    expect(itemEffects[0]!.provenance.sourceKind).toBe("item-equipped");
  });
});
