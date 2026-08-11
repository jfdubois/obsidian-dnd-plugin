import { describe, expect, it } from "vitest";
import { createEntityId, createRuleGrantId } from "@obsidian-dnd/domain";
import {
  createDiceCurrencyGrantAmount,
  createFixedCurrencyGrantAmount,
  isCurrencyGrantAmount,
  isRuleGrant,
} from "./rule-grant";

describe("CurrencyGrantAmount", () => {
  it("accepts fixed positive currency", () => {
    expect(isCurrencyGrantAmount(createFixedCurrencyGrantAmount(10))).toBe(true);
  });

  it("accepts NdM with multiplier one", () => {
    expect(isCurrencyGrantAmount(createDiceCurrencyGrantAmount(5, 4))).toBe(true);
  });

  it("accepts NdM times K", () => {
    expect(createDiceCurrencyGrantAmount(5, 4, 10)).toEqual({
      type: "dice", count: 5, dieSides: 4, multiplier: 10,
    });
  });

  it("rejects raw formulas and non-positive values", () => {
    expect(isCurrencyGrantAmount({ type: "dice", formula: "5d4 × 10" })).toBe(false);
    expect(isCurrencyGrantAmount({ type: "fixed", value: 0 })).toBe(false);
  });
});

describe("RuleGrant", () => {
  it("validates strict named-item and currency variants", () => {
    expect(isRuleGrant({ id: createRuleGrantId("grant-1"), type: "named-item", name: "vestments", quantity: 1 })).toBe(true);
    expect(isRuleGrant({ id: createRuleGrantId("grant-2"), type: "item", itemId: createEntityId("item:phb:book"), quantity: 1 })).toBe(true);
    expect(isRuleGrant({ id: createRuleGrantId("grant-3"), type: "currency", denomination: "gp", amount: createDiceCurrencyGrantAmount(5, 4, 10) })).toBe(true);
    expect(isRuleGrant({ id: createRuleGrantId("grant-4"), type: "named-item", name: " ", quantity: 1 })).toBe(false);
  });
});
