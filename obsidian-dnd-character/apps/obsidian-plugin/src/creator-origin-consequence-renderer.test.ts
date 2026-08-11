import { describe, expect, it } from "vitest";
import type { OriginConsequence } from "./creator-consequence-service";
import { renderOriginConsequences } from "./creator-origin-consequence-renderer";

interface TestElement {
  textContent: string;
  createEl(tag: string, options?: { text?: string; cls?: string }): TestElement;
  createDiv(options?: { text?: string; cls?: string }): TestElement;
  children: TestElement[];
}

function element(): TestElement {
  const children: TestElement[] = [];
  return {
    get textContent() { return children.map((child) => child.textContent).join(" "); },
    set textContent(value: string) { children.push({ ...element(), textContent: value }); },
    createEl(_tag, options) { const child = element(); if (options?.text !== undefined) child.textContent = options.text; children.push(child); return child; },
    createDiv(options) { return this.createEl("div", options); },
    children,
  };
}

function consequence(): OriginConsequence {
  return {
    origin: { id: "species:2024:phb:test", name: "Test Species" },
    effects: [{ type: "add-sense" }],
    grants: [
      { originId: "species:2024:phb:test", provenance: "entity", grant: { id: "grant:fixed", type: "currency", denomination: "sp", amount: { type: "fixed", value: 12 } }, resolvedAmount: 12 },
      { originId: "species:2024:phb:test", provenance: "entity", grant: { id: "grant:random", type: "currency", denomination: "gp", amount: { type: "dice", count: 5, dieSides: 4, multiplier: 10 } }, randomResolution: { status: "unresolved" } },
    ],
    choices: [{ instanceId: "choice:language", originId: "species:2024:phb:test", definition: { id: "choice:language", label: "Language", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [] }, candidates: [], status: "unresolved" }],
    levelOneGrants: [],
  } as unknown as OriginConsequence;
}

describe("creator origin consequence renderer", () => {
  it("keeps automatic grants and user decisions visually distinct without mutating its input", () => {
    const container = element(); const origin = consequence(); const before = structuredClone(origin);
    renderOriginConsequences(container as unknown as HTMLElement, origin, []);
    expect(container.textContent).toContain("Automatic consequences");
    expect(container.textContent).toContain("12 sp");
    expect(container.textContent).toContain("Starting Gold: Not rolled");
    expect(container.textContent).toContain("User decisions required");
    expect(container.textContent).toContain("Language: choose a value");
    expect(origin).toEqual(before);
  });

  it("shows a stored random result and invalid-result diagnostic without rolling", () => {
    const resolved = consequence(); resolved.grants[1] = { ...resolved.grants[1]!, resolvedAmount: 60, randomResolution: { status: "resolved", value: 60 } };
    const resolvedContainer = element(); renderOriginConsequences(resolvedContainer as unknown as HTMLElement, resolved, []);
    expect(resolvedContainer.textContent).toContain("Starting Gold: 60 gp");
    const invalid = consequence(); invalid.grants[1] = { ...invalid.grants[1]!, randomResolution: { status: "invalid" } };
    const invalidContainer = element(); renderOriginConsequences(invalidContainer as unknown as HTMLElement, invalid, []);
    expect(invalidContainer.textContent).toContain("saved result is invalid");
  });
});
