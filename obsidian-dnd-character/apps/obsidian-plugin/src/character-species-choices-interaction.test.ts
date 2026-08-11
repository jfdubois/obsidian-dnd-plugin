import { describe, it, expect } from "vitest";
import type { ChoiceDropdownState } from "./character-species-choice-renderers";
import { buildChoices } from "./character-species-choices-renderer";
import type { ChoiceDefinition } from "@obsidian-dnd/catalog-contract";
import {
  createChoiceDefinition,
  createEntityQuery,
} from "@obsidian-dnd/catalog-contract";
import {
  createEntityId,
  createChoiceInstanceId,
  createChoiceDefinitionId,
  type RuleEntityKind,
} from "@obsidian-dnd/domain";

/* ── buildChoices min/max enforcement (P10-T020) ─────────────────
   Verifies that the Confirm path correctly enforces minimum and
   maximum selection counts before resolving choices.               */

function createDropdownState(
  defId: string,
  min: number,
  max: number,
  selectedIds: string[],
  kind: RuleEntityKind = "feat",
): ChoiceDropdownState {
  const def: ChoiceDefinition = createChoiceDefinition(
    createChoiceDefinitionId(defId),
    "Test Choice",
    "entity",
    min,
    max,
    false,
    createEntityQuery(kind),
    [],
  );
  return {
    definition: def,
    instanceId: createChoiceInstanceId(`species:2024:phb:elf:choice:${defId}`),
    originId: createEntityId("species:2024:phb:elf"),
    selectedIds: new Set(selectedIds),
    candidates: [],
  };
}

describe("buildChoices min/max enforcement", () => {
  it("returns choices when selection meets minimum", () => {
    const state = createDropdownState("test-1", 1, 1, [createEntityId("feat-a")]);
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toHaveLength(1);
  });

  it("returns choices when multi-select meets minimum", () => {
    const state = createDropdownState(
      "test-2",
      1,
      2,
      [createEntityId("feat-a"), createEntityId("feat-b")],
    );
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).not.toBeNull();
  });

  it("returns null when selection below minimum", () => {
    const state = createDropdownState("test-3", 1, 1, []);
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).toBeNull();
  });

  it("returns null when selection exceeds maximum", () => {
    const state = createDropdownState(
      "test-4",
      1,
      1,
      [createEntityId("feat-a"), createEntityId("feat-b")],
    );
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).toBeNull();
  });

  it("returns choices with correct originGrantId", () => {
    const state = createDropdownState("test-5", 1, 1, [createEntityId("feat-a")]);
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    const choice = Object.values(result!)[0];
    expect(choice).toBeDefined();
    expect(choice!.originGrantId).toBe("species:2024:phb:elf");
  });

  it("returns choices with correct definitionId", () => {
    const state = createDropdownState("test-6", 1, 1, [createEntityId("feat-a")]);
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    const choice = Object.values(result!)[0];
    expect(choice).toBeDefined();
    expect(choice!.definitionId).toBe("test-6");
  });

  it("returns choices with correct selectedOptionIds", () => {
    const state = createDropdownState(
      "test-7",
      1,
      2,
      [createEntityId("feat-a"), createEntityId("feat-b")],
    );
    const result = buildChoices([state], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    const choice = Object.values(result!)[0];
    expect(choice).toBeDefined();
    expect(choice!.selectedValue.type === "entity-ids" ? choice!.selectedValue.entityIds : []).toContain("feat-a");
    expect(choice!.selectedValue.type === "entity-ids" ? choice!.selectedValue.entityIds : []).toContain("feat-b");
  });

  it("handles multiple dropdown states", () => {
    const state1 = createDropdownState("test-8a", 1, 1, [createEntityId("feat-a")]);
    const state2 = createDropdownState("test-8b", 1, 1, [createEntityId("feat-b")]);
    const result = buildChoices([state1, state2], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toHaveLength(2);
  });

  it("returns null if any dropdown fails min/max", () => {
    const state1 = createDropdownState("test-9a", 1, 1, [createEntityId("feat-a")]);
    const state2 = createDropdownState("test-9b", 1, 1, []); // below minimum
    const result = buildChoices([state1, state2], "species:2024:phb:elf");

    expect(result).toBeNull();
  });

  it("each choice has unique instanceId", () => {
    const state1 = createDropdownState("test-10a", 1, 1, [createEntityId("feat-a")]);
    const state2 = createDropdownState("test-10b", 1, 1, [createEntityId("feat-b")]);
    const result = buildChoices([state1, state2], "species:2024:phb:elf");

    expect(result).not.toBeNull();
    const instanceIds = Object.keys(result!);
    expect(new Set(instanceIds).size).toBe(instanceIds.length);
  });
});

/* ── Catalog query inventory (P10-T020) ──────────────────────────
   Enumerates all ChoiceDefinition query types actually used by
   species in the normalized catalog fixture.                      */

describe("catalog species ChoiceDefinition query inventory", () => {
  it("identifies all query types used by species choices", async () => {
    // Import the fixture catalog to verify query types
    const catalog = await import(
      "../../../packages/catalog-contract/fixtures/normalized-catalog.json",
      { assert: { type: "json" } }
    );
    const data = catalog.default as { entities: { species: unknown[] } };

    // Collect all choice definition types and query types from species
    const choiceTypes = new Set<string>();
    const queryTypes = new Set<string>();

    for (const entity of data.entities.species) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const species = entity as any;
      if (species.choices && Array.isArray(species.choices)) {
        for (const choice of species.choices) {
          choiceTypes.add(choice.type);
          if (choice.optionQuery) {
            queryTypes.add(choice.optionQuery.type);
          }
        }
      }
    }

    // In the fixture catalog, species choices use:
    // - choice type "entity" (subrace selection)
    // - query type "entity" (entity query for subrace candidates)
    expect(choiceTypes).toContain("entity");
    expect(queryTypes).toContain("entity");

    // Record all observed types for documentation
    expect(Array.from(choiceTypes).sort()).toEqual(["entity"]);
    expect(Array.from(queryTypes).sort()).toEqual(["entity"]);
  });
});
