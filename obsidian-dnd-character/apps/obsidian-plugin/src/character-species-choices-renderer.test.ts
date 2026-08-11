import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CatalogService } from "./catalog/catalog-service";
import type { CharacterDraft } from "./character-draft";
import type { CharacterChoice } from "@obsidian-dnd/character-contract";
import { createEmptyCharacterDraft } from "./character-draft";
import { selectRuleset } from "./character-ruleset-step";
import { selectSources } from "./character-source-step";
import { selectSpecies } from "./character-species-step";
import { renderSpeciesChoices as renderSpeciesChoicesRuntime } from "./character-species-choices-renderer";
import type { CatalogEntitySummary, QueryChoiceDefinitionType } from "@obsidian-dnd/catalog-contract";
import {
  createCatalogEntitySummary,
  createChoiceDefinition,
  createEntityQuery,
  createSpeciesRule,
} from "@obsidian-dnd/catalog-contract";
import {
  createEntityId,
  createSourceId,
  createChoiceDefinitionId,
  createCatalogRevision,
  type RuleEntityKind,
  type Ruleset,
} from "@obsidian-dnd/domain";

const rev = createCatalogRevision("rev-001");
const srcId = createSourceId("phb");
const humanId = createEntityId("species:2024:phb:human");
const elfId = createEntityId("species:2024:phb:elf");

function createMockHTMLElement(): HTMLElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];
  let _textContent: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _parentRef: any = null;

  function computeText(): string {
    if (_textContent !== undefined) return _textContent;
    return children.map(c => typeof c === "object" && c !== null && "textContent" in c ? c.textContent : String(c)).join("");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el: any = {
    tagName: "DIV",
    get textContent() { return computeText(); },
    set textContent(v: string) { _textContent = v; },
    get innerHTML() { return computeText(); },
    set innerHTML(v: string) { _textContent = v; },
    className: "",
    getAttribute: vi.fn((_name: string) => null),
    setAttribute: vi.fn((_name: string, _value: string) => {}),
    removeAttribute: vi.fn((_name: string) => {}),
    remove: vi.fn(function (this: unknown) {
      if (_parentRef) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const idx = _parentRef.children_arr?.indexOf(this as any);
        if (idx >= 0) _parentRef.children_arr.splice(idx, 1);
      }
    }),
    appendChild: vi.fn(function (child: unknown) {
      children.push(child);
      if (typeof child === "object" && child !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element needs dynamic _parent reference
        (child as any)._parent = el;
      }
      return child;
    }),
    createEl: vi.fn(function (tag: string, attrs?: { text?: string; cls?: string }) {
      const child = createMockHTMLElement();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child as any).tagName = tag.toUpperCase();
      if (attrs?.text) {
        child.textContent = attrs.text;
      }
      if (attrs?.cls) {
        child.className = attrs.cls;
      }
      children.push(child);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element needs dynamic _parent reference
      (child as any)._parent = el;
      return child;
    }),
    createDiv: vi.fn(function (attrs?: { text?: string; cls?: string }) {
      return el.createEl("div", attrs);
    }),
    querySelector: vi.fn((_selector: string) => null),
    querySelectorAll: vi.fn((_selector: string) => []),
    click: vi.fn(),
    children_arr: children,
  };
  return el;
}

function createMockCatalogService(
  speciesData: ReturnType<typeof createSpeciesRule> | null,
  indexData: CatalogEntitySummary[] = [],
): CatalogService {
  return {
    getRuntimeStatus: vi.fn(() => ({
      activationState: "active",
      activeRevision: rev,
    })),
    fetchEntity: vi.fn(async () => ({
      catalogRevision: rev,
      data: speciesData,
    })),
    fetchIndex: vi.fn(async () => indexData),
  } as unknown as CatalogService;
}

function createIsEntityEligible(): (sourceId: string, access: string) => boolean {
  return (_sourceId, access) => access === "core";
}

function createSpecies(
  id: ReturnType<typeof createEntityId> = humanId,
  name = "Human",
  choiceDef?: { defId: string; label: string; type: QueryChoiceDefinitionType; min: number; max: number; queryKind: RuleEntityKind },
  ruleset: Ruleset = "2024",
): ReturnType<typeof createSpeciesRule> {
  const choices = choiceDef
    ? [createChoiceDefinition(
        createChoiceDefinitionId(choiceDef.defId),
        choiceDef.label, choiceDef.type, choiceDef.min, choiceDef.max, false,
        createEntityQuery(choiceDef.queryKind), [],
      )]
    : [];
  return createSpeciesRule(
    id, name, srcId, ruleset, "core",
    "Medium", 30, id === elfId,
    [], [], [], [], [], choices, [],
    false,
  );
}

function createSpeciesSummary(
  id: ReturnType<typeof createEntityId>,
): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id,
    kind: "species",
    name: id === elfId ? "Elf" : "Human",
    sourceId: srcId,
    ruleset: id.includes(":2014:") ? "2014" : "2024",
    access: "core",
    legacy: false,
    tags: [],
    detailPath: `entities/species/${id}.json`,
  });
}

function renderSpeciesChoices(
  container: HTMLElement,
  draft: CharacterDraft,
  catalog: CatalogService,
  isEntityEligible: (sourceId: string, access: string) => boolean,
  onChoicesResolved: (choices: Record<string, CharacterChoice>) => void,
): Promise<void> {
  const speciesId = draft.species.speciesId;
  if (speciesId === null) {
    return renderSpeciesChoicesRuntime(
      container, draft, catalog, createSpeciesSummary(humanId),
      isEntityEligible, onChoicesResolved,
    );
  }
  return renderSpeciesChoicesRuntime(
    container, draft, catalog, createSpeciesSummary(speciesId),
    isEntityEligible, onChoicesResolved,
  );
}

function createFeatSummary(id: string): CatalogEntitySummary {
  return createCatalogEntitySummary({
    id: createEntityId(id),
    kind: "feat",
    name: id.replace("feat:2024:phb:", "").replace("-", " "),
    sourceId: srcId,
    ruleset: "2024",
    access: "core",
    legacy: false,
    tags: [],
    detailPath: `entities/feat/phb/2024/${id.replace("feat:2024:phb:", "")}.json`,
  });
}

describe("renderSpeciesChoices", () => {
  let draft: CharacterDraft;
  let container: HTMLElement;
  let onChoicesResolved: ReturnType<typeof vi.fn<(choices: Record<string, unknown>) => void>>;

  beforeEach(() => {
    draft = createEmptyCharacterDraft();
    selectRuleset(draft, "2024");
    selectSources(draft, []);
    container = createMockHTMLElement();
    onChoicesResolved = vi.fn();
  });

  it("returns early when no species is selected", async () => {
    const catalog = createMockCatalogService(null);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.innerHTML).toBe("");
    expect(onChoicesResolved).not.toHaveBeenCalled();
    expect(catalog.fetchEntity).not.toHaveBeenCalled();
  });
  it("auto-resolves zero-choice species", async () => {
    const species = createSpecies();
    const catalog = createMockCatalogService(species);
    selectSpecies(draft, humanId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(onChoicesResolved).toHaveBeenCalledWith({});
    expect(container.textContent).toContain("No additional choices");
  });
  it("renders entity choice dropdown with filtered candidates", async () => {
    const species = createSpecies(elfId, "Elf", { defId: "species-elf-trait", label: "Elven Traits", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const feat1 = createFeatSummary("feat:2024:phb:darkvision");
    const feat2 = createFeatSummary("feat:2024:phb:fey-ancestry");
    const catalog = createMockCatalogService(species, [feat1, feat2]);
    selectSpecies(draft, elfId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(catalog.fetchIndex).toHaveBeenCalledWith(rev, "feat");
    expect(container.textContent).toContain("Elven Traits");
    expect(container.textContent).toContain("1 required");
  });
  it("renders an entity choice without inventing ability candidates", async () => {
    const species = createSpecies(humanId, "Human", { defId: "species-human-ability", label: "Ability Score Increase", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const catalog = createMockCatalogService(species);
    selectSpecies(draft, humanId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.textContent).toContain("Ability Score Increase");
    expect(container.textContent).toContain("Confirm choices");
  });
  it("renders multi-select checkboxes for max > 1", async () => {
    const species = createSpecies(humanId, "Human", { defId: "species-human-skills", label: "Skill Proficiencies", type: "entity", min: 1, max: 2, queryKind: "skill" });
    const skill1 = createCatalogEntitySummary({
      id: createEntityId("skill:2024:phb:athletics"),
      kind: "skill", name: "Athletics", sourceId: srcId,
      ruleset: "2024", access: "core", legacy: false, tags: [],
      detailPath: "entities/skill/phb/2024/athletics.json",
    });
    const skill2 = createCatalogEntitySummary({
      id: createEntityId("skill:2024:phb:acrobatics"),
      kind: "skill", name: "Acrobatics", sourceId: srcId,
      ruleset: "2024", access: "core", legacy: false, tags: [],
      detailPath: "entities/skill/phb/2024/acrobatics.json",
    });
    const catalog = createMockCatalogService(species, [skill1, skill2]);
    selectSpecies(draft, humanId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.textContent).toContain("1-2 required");
    expect(container.textContent).toContain("Athletics");
    expect(container.textContent).toContain("Acrobatics");
  });
  it("shows confirm button for entity choices", async () => {
    const species = createSpecies(elfId, "Elf", { defId: "species-elf-trait", label: "Elven Traits", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const feat1 = createFeatSummary("feat:2024:phb:darkvision");
    const catalog = createMockCatalogService(species, [feat1]);
    selectSpecies(draft, elfId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.textContent).toContain("Confirm choices");
  });
  it("filters out ineligible candidates", async () => {
    const species = createSpecies(elfId, "Elf", { defId: "species-elf-trait", label: "Elven Traits", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const coreFeat = createFeatSummary("feat:2024:phb:darkvision");
    const sourceFeat = createCatalogEntitySummary({
      id: createEntityId("feat:2024:xphb:extra-darkvision"),
      kind: "feat", name: "Extra Darkvision",
      sourceId: createSourceId("xphb"), ruleset: "2024",
      access: "source", legacy: false, tags: [],
      detailPath: "entities/feat/xphb/2024/extra-darkvision.json",
    });
    const catalog = createMockCatalogService(species, [coreFeat, sourceFeat]);
    selectSpecies(draft, elfId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.textContent).toContain("darkvision");
    expect(container.textContent).not.toContain("Extra Darkvision");
  });
  it("shows message when no candidates available", async () => {
    const species = createSpecies(elfId, "Elf", { defId: "species-elf-trait", label: "Elven Traits", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const catalog = createMockCatalogService(species, []);
    selectSpecies(draft, elfId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(container.textContent).toContain("No candidates available");
  });
  it("species change invalidates previous choices", async () => {
    const elfSpecies = createSpecies(elfId, "Elf", { defId: "species-elf-trait", label: "Elven Traits", type: "entity", min: 1, max: 1, queryKind: "feat" });
    const feat1 = createFeatSummary("feat:2024:phb:darkvision");
    const catalog = createMockCatalogService(elfSpecies, [feat1]);
    selectSpecies(draft, elfId);
    await renderSpeciesChoices(
      container, draft, catalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(onChoicesResolved).not.toHaveBeenCalled();

    container.innerHTML = "";
    const humanSpecies = createSpecies();
    const updatedCatalog = createMockCatalogService(humanSpecies);
    selectSpecies(draft, humanId);
    await renderSpeciesChoices(
      container, draft, updatedCatalog,
      createIsEntityEligible(), onChoicesResolved,
    );
    expect(onChoicesResolved).toHaveBeenCalledWith({});
  });
});
