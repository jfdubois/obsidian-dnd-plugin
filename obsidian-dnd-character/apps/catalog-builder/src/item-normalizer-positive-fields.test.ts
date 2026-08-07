import { describe, it, expect } from "vitest";
import { normalizeItems, type ItemNormalizerInput } from "./item-normalizer";
import { makeCopyModRawRecord, ctx } from "./item-normalizer-test-helpers";

describe("normalizeItems - field extraction", () => {
  it("extracts page number from record", () => {
    const record = makeCopyModRawRecord({ page: 156 });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.page).toBe(156);
  });

  it("extracts summary from record", () => {
    const record = makeCopyModRawRecord({ summary: "A small, light bladed weapon." });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.summary).toBe("A small, light bladed weapon.");
  });

  it("extracts description as paragraph content", () => {
    const record = makeCopyModRawRecord({
      description: "A dagger is a small, light bladed weapon.",
    });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.content.length).toBe(1);
    expect(result.items[0]!.content[0]).toEqual({
      type: "paragraph",
      text: "A dagger is a small, light bladed weapon.",
    });
  });

  it("extracts item category from type field", () => {
    const record = makeCopyModRawRecord({ name: "Longsword", type: "weapon" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.category).toBe("weapon");
  });

  describe("5eTools type abbreviation to category mapping", () => {
    it("maps PHB melee weapon type 'M' to weapon category", () => {
      const record = makeCopyModRawRecord({ name: "Longsword", source: "PHB", type: "M" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("weapon");
    });

    it("maps PHB ranged weapon type 'R' to weapon category", () => {
      const record = makeCopyModRawRecord({ name: "Shortbow", source: "PHB", type: "R" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("weapon");
    });

    it("maps PHB light armor type 'LA' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Leather Armor", source: "PHB", type: "LA" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps PHB medium armor type 'MA' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Studded Leather", source: "PHB", type: "MA" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps PHB heavy armor type 'HA' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Plate", source: "PHB", type: "HA" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps PHB shield type 'S' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Shield", source: "PHB", type: "S" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps PHB adventuring gear type 'G' to adventuring-gear category", () => {
      const record = makeCopyModRawRecord({ name: "Backpack", source: "PHB", type: "G" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("adventuring-gear");
    });

    it("maps PHB tool type 'T' to adventuring-gear category", () => {
      const record = makeCopyModRawRecord({ name: "Alchemist's Supplies", source: "PHB", type: "T" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("adventuring-gear");
    });

    it("maps PHB gaming set type 'GS' to adventuring-gear category", () => {
      const record = makeCopyModRawRecord({ name: "Dice Set", source: "PHB", type: "GS" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("adventuring-gear");
    });

    it("maps PHB potion type 'P' to consumable category", () => {
      const record = makeCopyModRawRecord({ name: "Potion of Healing", source: "PHB", type: "P" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("consumable");
    });

    it("maps PHB food and drink type 'FD' to consumable category", () => {
      const record = makeCopyModRawRecord({ name: "Wine", source: "PHB", type: "FD" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("consumable");
    });

    it("maps PHB spellcasting focus type 'SCF' to other category", () => {
      const record = makeCopyModRawRecord({ name: "Crystal", source: "PHB", type: "SCF" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("other");
    });

    it("maps DMG treasure coin type '$C' to other category", () => {
      const record = makeCopyModRawRecord({ name: "Gold Piece", source: "DMG", type: "$C" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("other");
    });

    it("maps XPHB pipe-notation type 'S|XPHB' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Shield", source: "XPHB", type: "S|XPHB" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps XPHB pipe-notation type 'MA|XPHB' to armor category", () => {
      const record = makeCopyModRawRecord({ name: "Studded Leather", source: "XPHB", type: "MA|XPHB" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("armor");
    });

    it("maps XPHB pipe-notation type 'G|XPHB' to adventuring-gear category", () => {
      const record = makeCopyModRawRecord({ name: "Backpack", source: "XPHB", type: "G|XPHB" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("adventuring-gear");
    });

    it("maps XPHB pipe-notation type 'SCF|XPHB' to other category", () => {
      const record = makeCopyModRawRecord({ name: "Crystal", source: "XPHB", type: "SCF|XPHB" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("other");
    });

    it("maps XDMG pipe-notation type 'P|XDMG' to consumable category", () => {
      const record = makeCopyModRawRecord({ name: "Potion of Healing", source: "XDMG", type: "P|XDMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("consumable");
    });

    it("maps XDMG pipe-notation type 'SC|XDMG' to consumable category", () => {
      const record = makeCopyModRawRecord({ name: "Scroll of Fireball", source: "XDMG", type: "SC|XDMG" });
      const input: ItemNormalizerInput = { records: [record], context: ctx };

      const result = normalizeItems(input);
      expect(result.items[0]!.category).toBe("consumable");
    });
  });

  it("extracts item category from category field", () => {
    const record = makeCopyModRawRecord({ name: "Leather Armor", category: "armor" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.category).toBe("armor");
  });

  it("defaults category to other when unrecognized", () => {
    const record = makeCopyModRawRecord({ name: "Mystery Item", type: "unknown-category" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.category).toBe("other");
  });

  it("extracts rarity from record", () => {
    const record = makeCopyModRawRecord({ name: "Magic Sword", rarity: "rare" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.rarity).toBe("rare");
  });

  it("extracts cost as structured object", () => {
    const record = makeCopyModRawRecord({ name: "Dagger", cost: { amount: 2, unit: "sp" } });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.cost).toEqual({ amount: 2, unit: "sp" });
  });

  it("extracts cost as string", () => {
    const record = makeCopyModRawRecord({ name: "Dagger", cost: "2 sp" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.cost).toEqual({ amount: 2, unit: "sp" });
  });

  it("extracts weight from record", () => {
    const record = makeCopyModRawRecord({ name: "Dagger", weight: 1 });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.weight).toBe(1);
  });

  it("extracts body slot from record", () => {
    const record = makeCopyModRawRecord({ name: "Ring of Protection", bodySlot: "ring" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.bodySlot).toBe("ring");
  });

  it("extracts properties from record", () => {
    const record = makeCopyModRawRecord({
      name: "Dagger",
      properties: ["Finesse", "Light", "Thrown"],
    });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.properties).toEqual(["Finesse", "Light", "Thrown"]);
  });

  it("extracts requiresAttunement as boolean", () => {
    const record = makeCopyModRawRecord({ name: "Ring of Protection", requiresAttunement: true });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.requiresAttunement).toBe(true);
  });

  it("extracts attunement as string 'yes'", () => {
    const record = makeCopyModRawRecord({ name: "Ring of Protection", attunement: "yes" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.requiresAttunement).toBe(true);
  });

  it("extracts attunement as string 'no'", () => {
    const record = makeCopyModRawRecord({ name: "Dagger", attunement: "no" });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.requiresAttunement).toBe(false);
  });

  it("extracts single entry string as paragraph content", () => {
    const record = makeCopyModRawRecord({ entry: "A small, light bladed weapon." });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.content.length).toBe(1);
    expect(result.items[0]!.content[0]).toEqual({
      type: "paragraph",
      text: "A small, light bladed weapon.",
    });
  });

  it("handles list entries in content", () => {
    const record = makeCopyModRawRecord({ entries: [{ type: "list", items: ["Finesse", "Light"] }] });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items[0]!.content.length).toBe(1);
    expect(result.items[0]!.content[0]).toEqual({ type: "list", ordered: false, items: [] });
  });

  it("normalizes item with all fields populated", () => {
    const record = makeCopyModRawRecord({
      name: "Longsword",
      type: "weapon",
      rarity: "common",
      cost: { amount: 15, unit: "gp" },
      weight: 3,
      bodySlot: "weapon",
      properties: ["Versatile"],
      requiresAttunement: false,
      page: 156,
      summary: "A common melee weapon.",
      entries: [{ type: "paragraph", text: "A longsword is a melee weapon." }],
    });
    const input: ItemNormalizerInput = { records: [record], context: ctx };

    const result = normalizeItems(input);
    expect(result.items.length).toBe(1);
    const item = result.items[0]!;
    expect(item.name).toBe("Longsword");
    expect(item.category).toBe("weapon");
    expect(item.rarity).toBe("common");
    expect(item.cost).toEqual({ amount: 15, unit: "gp" });
    expect(item.weight).toBe(3);
    expect(item.bodySlot).toBe("weapon");
    expect(item.properties).toEqual(["Versatile"]);
    expect(item.requiresAttunement).toBe(false);
    expect(item.page).toBe(156);
    expect(item.summary).toBe("A common melee weapon.");
    expect(item.content.length).toBe(1);
    expect(result.diagnostics.length).toBe(0);
  });
});
