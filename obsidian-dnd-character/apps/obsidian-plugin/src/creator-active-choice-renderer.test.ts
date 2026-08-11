import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChoiceDefinitionId, createChoiceInstanceId, createChoiceOptionId, createEntityId } from "@obsidian-dnd/domain";
import type { ChoiceConsequence } from "./creator-consequence-service";

interface DropdownRecord { options: Record<string, string>; value: string; change: (value: string) => void; }
const mocks = vi.hoisted(() => {
  const dropdowns: DropdownRecord[] = [];
  const buttons: Array<() => void> = [];
  class MockDropdown {
    readonly selectEl = { replaceChildren: () => { this.record.options = {}; } } as unknown as HTMLSelectElement;
    readonly record: DropdownRecord = { options: {}, value: "", change: () => undefined };
    constructor() { dropdowns.push(this.record); }
    addOptions(options: Record<string, string>) { Object.assign(this.record.options, options); return this; }
    setValue(value: string) { this.record.value = value; return this; }
    onChange(change: (value: string) => void) { this.record.change = change; return this; }
  }
  class MockSetting {
    constructor(private readonly container: { createEl?: (tag: string, options?: { text?: string }) => unknown }) {}
    setName(name: string) { this.container.createEl?.("span", { text: name }); return this; }
    addDropdown(render: (dropdown: MockDropdown) => void) { render(new MockDropdown()); return this; }
    addButton(render: (button: { setButtonText: (text: string) => unknown; setCta: () => unknown; onClick: (click: () => void) => unknown }) => void) {
      const button = {
        setButtonText: (_text: string) => button,
        setCta: () => button,
        onClick: (click: () => void) => { buttons.push(click); return button; },
      };
      render(button);
      return this;
    }
  }
  return { dropdowns, buttons, MockSetting };
});

vi.mock("obsidian", () => ({ Setting: mocks.MockSetting }));

import { renderActiveCreatorChoices } from "./creator-active-choice-renderer";

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
    createDiv(options) { return this.createEl("div", options); }, children,
  };
}

const languageOne = createEntityId("language:2014:phb:common");
const languageTwo = createEntityId("language:2014:phb:elvish");
const languageThree = createEntityId("language:2014:phb:dwarvish");
const languageDefinition = createChoiceDefinitionId("choice:test:languages");

function entityChoice(minimum = 2, maximum = 2): ChoiceConsequence {
  return {
    instanceId: createChoiceInstanceId("choice-instance:test:languages"), originId: createEntityId("background:2014:phb:acolyte"), status: "unresolved",
    definition: { id: languageDefinition, label: "Choose languages", type: "language", minimum, maximum, repeatable: false, optionQuery: { type: "entity", kind: "language" }, prerequisites: [] },
    candidates: [
      { id: languageOne, name: "Common" }, { id: languageTwo, name: "Elvish" }, { id: languageThree, name: "Dwarvish" },
    ],
  } as unknown as ChoiceConsequence;
}

function render(choice: ChoiceConsequence, submit = vi.fn()) {
  const container = element();
  renderActiveCreatorChoices(container as unknown as HTMLElement, "Background Choices", [choice], submit);
  return { container, submit };
}

function confirm(): void { mocks.buttons[0]?.(); }

describe("active creator choice slots", () => {
  beforeEach(() => { mocks.dropdowns.length = 0; mocks.buttons.length = 0; });

  it("renders exactly two required language slots for an exact choose-two entity choice", () => {
    const { container } = render(entityChoice());
    expect(mocks.dropdowns).toHaveLength(2);
    expect(container.textContent).toContain("Language 1");
    expect(container.textContent).toContain("Language 2");
  });

  it("leaves empty and partially filled required slots unresolved, then persists two distinct typed entity IDs", () => {
    const { submit } = render(entityChoice());
    confirm();
    expect(submit).not.toHaveBeenCalled();
    mocks.dropdowns[0]!.change(String(languageOne)); confirm();
    expect(submit).not.toHaveBeenCalled();
    mocks.dropdowns[1]!.change(String(languageTwo)); confirm();
    expect(submit).toHaveBeenCalledWith([{ instanceId: expect.anything(), value: { type: "entity-ids", entityIds: [languageOne, languageTwo] } }]);
  });

  it("excludes a sibling selection, restores it when changed, and makes a cleared required slot unresolved", () => {
    const { submit } = render(entityChoice());
    mocks.dropdowns[0]!.change(String(languageOne));
    expect(mocks.dropdowns[1]!.options[String(languageOne)]).toBeUndefined();
    mocks.dropdowns[0]!.change(String(languageTwo));
    expect(mocks.dropdowns[1]!.options[String(languageOne)]).toBe("Common");
    mocks.dropdowns[1]!.change(String(languageOne)); confirm();
    expect(submit).toHaveBeenCalledTimes(1);
    mocks.dropdowns[0]!.change(""); confirm();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("renders maximum slots with optional trailing slots and omits empty optional values", () => {
    const { container, submit } = render(entityChoice(1, 3));
    expect(mocks.dropdowns).toHaveLength(3);
    expect(container.textContent).toContain("Language 2 (optional)");
    mocks.dropdowns[0]!.change(String(languageOne)); confirm();
    expect(submit).toHaveBeenCalledWith([{ instanceId: expect.anything(), value: { type: "entity-ids", entityIds: [languageOne] } }]);
  });

  it("renders a one-of-N closed package as one dropdown and retains the option-ids contract", () => {
    const packageA = createChoiceOptionId("option:test:package:a"); const packageB = createChoiceOptionId("option:test:package:b");
    const choice: ChoiceConsequence = {
      instanceId: createChoiceInstanceId("choice-instance:test:package"), originId: createEntityId("background:2014:phb:acolyte"), status: "unresolved", candidates: [],
      definition: { id: createChoiceDefinitionId("choice:test:package"), label: "Starting equipment", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: packageA, label: "Package A", grants: [], choices: [] }, { id: packageB, label: "Package B", grants: [], choices: [] }] },
    };
    const { submit } = render(choice);
    expect(mocks.dropdowns).toHaveLength(1);
    expect(mocks.dropdowns[0]!.options).toMatchObject({ [packageA]: "Package A", [packageB]: "Package B" });
    mocks.dropdowns[0]!.change(String(packageA)); confirm();
    expect(submit).toHaveBeenCalledWith([{ instanceId: choice.instanceId, value: { type: "option-ids", optionIds: [packageA] } }]);
  });

  it("renders 2014 Acolyte's two language slots and one starting-equipment package dropdown", () => {
    const packageA = createChoiceOptionId("option:background:2014:phb:acolyte:equipment:0");
    const equipment: ChoiceConsequence = {
      instanceId: createChoiceInstanceId("choice-instance:acolyte:equipment"), originId: createEntityId("background:2014:phb:acolyte"), status: "unresolved", candidates: [],
      definition: { id: createChoiceDefinitionId("choice:background:2014:phb:acolyte:equipment:0"), label: "Starting equipment", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: packageA, label: "Acolyte package", grants: [], choices: [] }] },
    };
    const container = element();
    renderActiveCreatorChoices(container as unknown as HTMLElement, "Background Choices", [entityChoice(), equipment], vi.fn());
    expect(mocks.dropdowns).toHaveLength(3);
    expect(container.textContent).toContain("Language 1");
    expect(container.textContent).toContain("Language 2");
    expect(mocks.dropdowns[2]!.options[String(packageA)]).toBe("Acolyte package");
  });

  it("submits all visible resolved choices as one batch", () => {
    const packageA = createChoiceOptionId("option:batch:package:a");
    const equipment: ChoiceConsequence = {
      instanceId: createChoiceInstanceId("choice-instance:batch:equipment"), originId: createEntityId("background:2014:phb:acolyte"), status: "unresolved", candidates: [],
      definition: { id: createChoiceDefinitionId("choice:batch:equipment"), label: "Starting equipment", type: "closed-option", minimum: 1, maximum: 1, repeatable: false, prerequisites: [], options: [{ id: packageA, label: "Package A", grants: [], choices: [] }] },
    };
    const submit = vi.fn(); const container = element();
    renderActiveCreatorChoices(container as unknown as HTMLElement, "Background Choices", [entityChoice(), equipment], submit);
    mocks.dropdowns[0]!.change(String(languageOne)); mocks.dropdowns[1]!.change(String(languageTwo)); mocks.dropdowns[2]!.change(String(packageA)); confirm();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith([
      { instanceId: entityChoice().instanceId, value: { type: "entity-ids", entityIds: [languageOne, languageTwo] } },
      { instanceId: equipment.instanceId, value: { type: "option-ids", optionIds: [packageA] } },
    ]);
  });
});
