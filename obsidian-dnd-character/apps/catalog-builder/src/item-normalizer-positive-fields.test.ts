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
