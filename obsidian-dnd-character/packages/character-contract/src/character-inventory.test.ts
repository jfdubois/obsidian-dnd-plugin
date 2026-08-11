import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createItemInstanceId,
} from "@obsidian-dnd/domain";
import {
  isInventoryItemInstance,
} from "./character-inventory";

describe("InventoryItemInstance", () => {
  it("accepts valid inventory item", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: false,
      attuned: false,
    })).toBe(true);
  });

  it("accepts equipped and attuned item", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:amulet_health"),
      quantity: 1,
      equipped: true,
      attuned: true,
    })).toBe(true);
  });

  it("accepts item with container instance", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:potion"),
      quantity: 3,
      equipped: false,
      attuned: false,
      containerInstanceId: createItemInstanceId("bag-1"),
    })).toBe(true);
  });

  it("accepts item with charges used", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:wand"),
      quantity: 1,
      equipped: true,
      attuned: false,
      chargesUsed: 5,
    })).toBe(true);
  });

  it("accepts item with custom name and notes", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: false,
      attuned: false,
      customName: "Bittersweet",
      notes: "A cursed blade",
    })).toBe(true);
  });

  it("accepts item with ability modifier overrides", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:amulet_health"),
      quantity: 1,
      equipped: true,
      attuned: true,
      overrides: {
        abilityModifier: { STR: 2, DEX: 1 },
      },
    })).toBe(true);
  });

  it("rejects item with negative quantity", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: -1,
      equipped: false,
      attuned: false,
    })).toBe(false);
  });

  it("rejects item with non-boolean equipped", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:longsword"),
      quantity: 1,
      equipped: "yes",
      attuned: false,
    })).toBe(false);
  });

  it("rejects item with negative charges used", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:wand"),
      quantity: 1,
      equipped: false,
      attuned: false,
      chargesUsed: -1,
    })).toBe(false);
  });

  it("rejects item with invalid ability in overrides", () => {
    expect(isInventoryItemInstance({
      instanceId: createItemInstanceId("item-1"),
      type: "catalog-item",
      itemId: createEntityId("item:2024:xphb:amulet_health"),
      quantity: 1,
      equipped: true,
      attuned: true,
      overrides: {
        abilityModifier: { INVALID: 2 },
      },
    })).toBe(false);
  });
});
