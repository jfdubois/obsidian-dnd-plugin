import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { CreatorCatalogDetailsModal } from "./creator-catalog-details-modal";

interface TestElement { textContent: string; setText(text: string): void; empty(): void; createEl(tag: string, options?: { text?: string; cls?: string }): TestElement; children: TestElement[]; }
function element(): TestElement {
  const children: TestElement[] = [];
  return { get textContent() { return children.map((child) => child.textContent).join(" "); }, set textContent(value: string) { children.push({ ...element(), textContent: value }); }, setText(value: string) { this.textContent = value; }, empty() { children.splice(0); }, createEl(_tag, options) { const child = element(); if (options?.text !== undefined) child.textContent = options.text; children.push(child); return child; }, children };
}
function entity(kind: "species" | "background" | "class"): EntityDetailResponse {
  return { id: `${kind}:2024:xphb:test`, kind, name: `Test ${kind}`, sourceId: "xphb", page: 22, ruleset: "2024", access: "core", legacy: false, content: [{ type: "paragraph", text: "Normalized descriptive context." }], effects: [{ type: "add-sense" }], grants: [], choices: [], dependencies: [], ...(kind === "species" ? { size: "Medium", speed: 30, traits: [] } : kind === "background" ? { skillProficiencies: [] } : { hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices: [], startingGrants: [], levels: {}, subclassIds: [] }) } as unknown as EntityDetailResponse;
}

describe("creator catalog details modal", () => {
  for (const kind of ["species", "background", "class"] as const) it(`renders normalized ${kind} context read-only`, () => {
    const modal = new CreatorCatalogDetailsModal({} as App, entity(kind)); const title = element(); const content = element();
    Object.assign(modal, { titleEl: title, contentEl: content });
    modal.onOpen(); modal.onClose();
    expect(title.textContent).toContain(`Test ${kind}`);
    expect(content.textContent).toBe("");
  });

  it("renders source, page, content, effects, grants, and choices from the normalized entity", () => {
    const detail = entity("background"); const modal = new CreatorCatalogDetailsModal({} as App, detail); const title = element(); const content = element();
    Object.assign(modal, { titleEl: title, contentEl: content }); modal.onOpen();
    expect(content.textContent).toContain("2024 • xphb, p. 22");
    expect(content.textContent).toContain("Normalized descriptive context.");
    expect(content.textContent).toContain("Automatic consequences");
    expect(content.textContent).toContain("1 effect");
  });
});
