import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import { createEmptyCharacterDraft } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { renderChoiceDefinition } from "./character-species-choice-renderers";
import type { CatalogEntitySummary, ChoiceDefinitionType } from "@obsidian-dnd/catalog-contract";
import {
  createCatalogEntitySummary,
  createChoiceDefinition,
  createEntityQuery,
  createProficiencyQuery,
  createEquipmentQuery,
  createSpellQuery,
} from "@obsidian-dnd/catalog-contract";
import {
  createEntityId,
  createSourceId,
  createChoiceDefinitionId,
  createCatalogRevision,
  type RuleEntityKind,
  type Ruleset,
  type ContentAccess,
} from "@obsidian-dnd/domain";

const rev = createCatalogRevision("rev-001");
const srcId = createSourceId("phb");
const humanId = createEntityId("species:2024:phb:human");

function createMockHTMLElement() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el: any = {
    tagName: "DIV",
    textContent: "",
    innerHTML: "",
    className: "",
    getAttribute: vi.fn(() => null),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    remove: vi.fn(),
    appendChild: vi.fn(function (child: unknown) { return child; }),
    createEl: vi.fn((tag: string, attrs?: { text?: string; cls?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child: any = createMockHTMLElement();
      child.tagName = tag.toUpperCase();
      if (attrs?.text) child.textContent = attrs.text;
      if (attrs?.cls) child.className = attrs.cls;
      return child;
    }),
    createDiv: vi.fn(function (attrs?: { text?: string; cls?: string }) {
      return el.createEl("div", attrs);
    }),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    click: vi.fn(),
  };
  return el;
}

function createMockCatalogService(
  indexData: Record<string, CatalogEntitySummary[]> = {},
): CatalogService {
  return {
    getRuntimeStatus: vi.fn(() => ({
      activationState: "active",
      activeRevision: rev,
    })),
    fetchEntity: vi.fn(async () => ({ catalogRevision: rev, data: null })),
    fetchIndex: vi.fn(async (
      _revision: ReturnType<typeof createCatalogRevision>,
      kind: string,
    ) => indexData[kind] ?? []),
  } as unknown as CatalogService;
}

function createEntitySummary(
  id: string,
  kind: RuleEntityKind,
  name: string,
  ruleset: Ruleset = "2024",
  access: ContentAccess = "core",
): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: createEntityId(id),
    kind,
    name,
    sourceId: srcId,
    ruleset,
    access,
    legacy: false,
    tags: [],
    detailPath: `entities/${kind}/phb/${ruleset}/${id.split(":").pop()}.json`,
  });
}

function createChoiceDef(
  type: ChoiceDefinitionType,
  label: string,
  min: number,
  max: number,
  queryKind?: RuleEntityKind,
) {
  let optionQuery;
  if (type === "ability") {
    optionQuery = createEntityQuery("feat");
  } else if (type === "skill-proficiency") {
    optionQuery = createProficiencyQuery("skill");
  } else if (type === "tool-proficiency") {
    optionQuery = createProficiencyQuery("tool");
  } else if (type === "equipment") {
    optionQuery = createEquipmentQuery();
  } else if (type === "spell") {
    optionQuery = createSpellQuery();
  } else {
    optionQuery = createEntityQuery(queryKind ?? "feat");
  }
  return createChoiceDefinition(
    createChoiceDefinitionId(`def-${type}`),
    label, type, min, max, false, optionQuery, [],
  );
}

describe("renderChoiceDefinition — production data types", () => {
  let draft: CharacterDraft;
  let container: ReturnType<typeof createMockHTMLElement>;
  let isEntityEligible: (sourceId: string, access: string) => boolean;

  beforeEach(() => {
    draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    selectSpecies(draft, humanId);
    container = createMockHTMLElement();
    isEntityEligible = (_s, access) => access === "core";
  });

  it("entity type returns candidates matching query kind", async () => {
    const feat1 = createEntitySummary("feat:2024:phb:darkvision", "feat", "Darkvision");
    const feat2 = createEntitySummary("feat:2024:phb:fey-ancestry", "feat", "Fey Ancestry");
    const catalog = createMockCatalogService({ feat: [feat1, feat2] });
    const def = createChoiceDef("entity", "Elven Traits", 1, 1, "feat");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Darkvision");
    expect(state!.candidates.map(c => c.name)).toContain("Fey Ancestry");
  });

  it("ability type returns all six abilities", async () => {
    const catalog = createMockCatalogService({});
    const def = createChoiceDef("ability", "Ability Score Increase", 1, 1);
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(6);
    const names = state!.candidates.map(c => c.name);
    expect(names).toContain("Strength");
    expect(names).toContain("Dexterity");
    expect(names).toContain("Constitution");
    expect(names).toContain("Intelligence");
    expect(names).toContain("Wisdom");
    expect(names).toContain("Charisma");
  });

  it("skill-proficiency type returns skill candidates", async () => {
    const skill1 = createEntitySummary("skill:2024:phb:athletics", "skill", "Athletics");
    const skill2 = createEntitySummary("skill:2024:phb:stealth", "skill", "Stealth");
    const catalog = createMockCatalogService({ skill: [skill1, skill2] });
    const def = createChoiceDef("skill-proficiency", "Skill Proficiency", 1, 1);
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Athletics");
    expect(state!.candidates.map(c => c.name)).toContain("Stealth");
  });

  it("tool-proficiency type returns item candidates", async () => {
    const tool1 = createEntitySummary("item:2024:phb:woodcarvers-kit", "item", "Woodcarver's Kit");
    const tool2 = createEntitySummary("item:2024:phb:musical-instrument", "item", "Musical Instrument");
    const catalog = createMockCatalogService({ item: [tool1, tool2] });
    const def = createChoiceDef("tool-proficiency", "Tool Proficiency", 1, 1);
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Woodcarver's Kit");
    expect(state!.candidates.map(c => c.name)).toContain("Musical Instrument");
  });

  it("language type returns language candidates", async () => {
    const lang1 = createEntitySummary("language:2024:phb:common", "language", "Common");
    const lang2 = createEntitySummary("language:2024:phb:elvish", "language", "Elvish");
    const catalog = createMockCatalogService({ language: [lang1, lang2] });
    const def = createChoiceDef("language", "Extra Language", 1, 1, "language");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Common");
    expect(state!.candidates.map(c => c.name)).toContain("Elvish");
  });

  it("equipment type returns item candidates", async () => {
    const eq1 = createEntitySummary("item:2024:phb:shield", "item", "Shield");
    const eq2 = createEntitySummary("item:2024:phb:spear", "item", "Spear");
    const catalog = createMockCatalogService({ item: [eq1, eq2] });
    const def = createChoiceDef("equipment", "Starting Equipment", 1, 1);
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Shield");
    expect(state!.candidates.map(c => c.name)).toContain("Spear");
  });

  it("spell type returns spell candidates", async () => {
    const spell1 = createEntitySummary("spell:2024:phb:guidance", "spell", "Guidance");
    const spell2 = createEntitySummary("spell:2024:phb:shield", "spell", "Shield");
    const catalog = createMockCatalogService({ spell: [spell1, spell2] });
    const def = createChoiceDef("spell", "Ritual Spell", 1, 1);
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Guidance");
    expect(state!.candidates.map(c => c.name)).toContain("Shield");
  });

  it("feature type returns feature candidates", async () => {
    const feat1 = createEntitySummary("feat:2024:phb:natural-armor", "feat", "Natural Armor");
    const feat2 = createEntitySummary("feat:2024:phb:darkvision", "feat", "Darkvision");
    const catalog = createMockCatalogService({ feat: [feat1, feat2] });
    const def = createChoiceDef("feature", "Species Feature", 1, 1, "feat");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(2);
    expect(state!.candidates.map(c => c.name)).toContain("Natural Armor");
    expect(state!.candidates.map(c => c.name)).toContain("Darkvision");
  });

  it("filters out candidates from wrong ruleset", async () => {
    const feat2024 = createEntitySummary("feat:2024:phb:darkvision", "feat", "Darkvision", "2024");
    const feat2014 = createEntitySummary("feat:2014:phb:darkvision", "feat", "Old Darkvision", "2014");
    const catalog = createMockCatalogService({ feat: [feat2024, feat2014] });
    const def = createChoiceDef("entity", "Elven Traits", 1, 1, "feat");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(1);
    const darkvision2024 = state!.candidates.find(c => c.name === "Darkvision");
    expect(darkvision2024).toBeDefined();
  });

  it("filters out ineligible source entities", async () => {
    const coreFeat = createEntitySummary("feat:2024:phb:darkvision", "feat", "Darkvision", "2024", "core");
    const sourceFeat = createEntitySummary("feat:2024:xphb:extra", "feat", "Extra", "2024", "source");
    const catalog = createMockCatalogService({ feat: [coreFeat, sourceFeat] });
    const def = createChoiceDef("entity", "Elven Traits", 1, 1, "feat");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(1);
    const darkvisionCore = state!.candidates.find(c => c.name === "Darkvision");
    expect(darkvisionCore).toBeDefined();
  });

  it("returns null when prerequisites not met", async () => {
    const catalog = createMockCatalogService({});
    const def = createChoiceDef("entity", "Locked Feature", 1, 1, "feat");
    def.prerequisites = [{
      type: "entity-selection",
      entityId: createEntityId("species:2024:phb:elf"),
    }];
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).toBeNull();
  });

  it("returns empty candidates when index is empty", async () => {
    const catalog = createMockCatalogService({ feat: [] });
    const def = createChoiceDef("entity", "Elven Traits", 1, 1, "feat");
    const state = await renderChoiceDefinition(container, draft, catalog, rev, def, isEntityEligible);
    expect(state).not.toBeNull();
    expect(state!.candidates.length).toBe(0);
  });
});
