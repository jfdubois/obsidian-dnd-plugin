import { describe, it, expect } from "vitest";
import {
  isChoiceDefinition,
  isChoiceDefinitionType,
  createChoiceDefinition,
  CHOICE_DEFINITION_TYPES,
  type ChoiceDefinition,
} from "./choice-definition";
import {
  createChoiceDefinitionId,
  createEntityId,
} from "@obsidian-dnd/domain";
import {
  createEntityQuery,
  createSpellQuery,
  createProficiencyQuery,
  createEquipmentQuery,
} from "./query";
import {
  createAbilityScorePrerequisite,
  createLevelPrerequisite,
  createEntitySelectionPrerequisite,
} from "./prerequisite";

describe("ChoiceDefinitionType", () => {
  it("constant array contains all three contract variants", () => {
    expect(CHOICE_DEFINITION_TYPES).toHaveLength(9);
  });

  it("guard accepts every known type", () => {
    for (const t of CHOICE_DEFINITION_TYPES) {
      expect(isChoiceDefinitionType(t)).toBe(true);
    }
  });

  it("guard rejects unknown string", () => {
    expect(isChoiceDefinitionType("weapon-proficiency")).toBe(false);
  });

  it("guard rejects non-string", () => {
    expect(isChoiceDefinitionType(42)).toBe(false);
    expect(isChoiceDefinitionType(null)).toBe(false);
    expect(isChoiceDefinitionType(undefined)).toBe(false);
  });
});

describe("ChoiceDefinition", () => {
  const validId = createChoiceDefinitionId("choice:test:1");
  const validEntityQuery = createEntityQuery("feat");
  const validPrerequisites = [createAbilityScorePrerequisite("STR", 13)];

  /* ── Positive ─────────────────────────────────────────────────── */

  it("validator accepts entity choice with all fields", () => {
    const choice: unknown = {
      id: validId,
      label: "Select a feat",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: validPrerequisites,
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts each choice type", () => {
    for (const type of ["entity", "skill-proficiency", "tool-proficiency", "language", "equipment", "spell", "feature"] as const) {
      const choice: unknown = {
        id: validId,
        label: `Test ${type}`,
        type,
        minimum: 1,
        maximum: 1,
        repeatable: false,
        optionQuery: validEntityQuery,
        prerequisites: [],
      };
      expect(isChoiceDefinition(choice)).toBe(true);
    }
  });

  it("validator accepts minimum 0", () => {
    const choice: unknown = {
      id: validId,
      label: "Optional feat",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts minimum equals maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Exactly one",
      type: "entity",
      minimum: 3,
      maximum: 3,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts repeatable true", () => {
    const choice: unknown = {
      id: validId,
      label: "Repeatable choice",
      type: "entity",
      minimum: 0,
      maximum: 3,
      repeatable: true,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts empty prerequisites array", () => {
    const choice: unknown = {
      id: validId,
      label: "No prerequisites",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts multiple prerequisites", () => {
    const choice: unknown = {
      id: validId,
      label: "Multiple prereqs",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [
        createAbilityScorePrerequisite("STR", 15),
        createLevelPrerequisite(5),
        createEntitySelectionPrerequisite(createEntityId("class:2024:xphb:barbarian")),
      ],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts spell query", () => {
    const choice: unknown = {
      id: validId,
      label: "Choose a spell",
      type: "spell",
      minimum: 1,
      maximum: 2,
      repeatable: false,
      optionQuery: createSpellQuery(),
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts proficiency query", () => {
    const choice: unknown = {
      id: validId,
      label: "Choose a proficiency",
      type: "skill-proficiency",
      minimum: 1,
      maximum: 2,
      repeatable: false,
      optionQuery: createProficiencyQuery("skill"),
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  it("validator accepts equipment query", () => {
    const choice: unknown = {
      id: validId,
      label: "Choose equipment",
      type: "equipment",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: createEquipmentQuery(),
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(true);
  });

  /* ── Negative: id ─────────────────────────────────────────────── */

  it("validator rejects missing id", () => {
    const choice: unknown = {
      label: "Test",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects empty string id", () => {
    const choice: unknown = {
      id: "",
      label: "Test",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-string id", () => {
    const choice: unknown = {
      id: 42,
      label: "Test",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: label ─────────────────────────────────────────── */

  it("validator rejects missing label", () => {
    const choice: unknown = {
      id: validId,
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects empty label", () => {
    const choice: unknown = {
      id: validId,
      label: "",
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-string label", () => {
    const choice: unknown = {
      id: validId,
      label: 123,
      type: "entity",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: type ──────────────────────────────────────────── */

  it("validator rejects missing type", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects unknown type string", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "weapon-proficiency",
      minimum: 1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: minimum ───────────────────────────────────────── */

  it("validator rejects missing minimum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-number minimum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: "0",
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects negative minimum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: -1,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects NaN minimum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: NaN,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects Infinity minimum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: Infinity,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: maximum ───────────────────────────────────────── */

  it("validator rejects missing maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-number maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: "1",
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects zero maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 0,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects negative maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: -1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects NaN maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: NaN,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: minimum > maximum ─────────────────────────────── */

  it("validator rejects minimum greater than maximum", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 3,
      maximum: 2,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: repeatable ────────────────────────────────────── */

  it("validator rejects missing repeatable", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-boolean repeatable", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: "true",
      optionQuery: validEntityQuery,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: optionQuery ───────────────────────────────────── */

  it("validator rejects missing optionQuery", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects invalid optionQuery", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      optionQuery: { type: "unknown" },
      prerequisites: [],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: prerequisites ─────────────────────────────────── */

  it("validator rejects missing prerequisites", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects non-array prerequisites", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: {},
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  it("validator rejects invalid prerequisite in array", () => {
    const choice: unknown = {
      id: validId,
      label: "Test",
      type: "entity",
      minimum: 0,
      maximum: 1,
      repeatable: false,
      optionQuery: validEntityQuery,
      prerequisites: [{ type: "unknown" }],
    };
    expect(isChoiceDefinition(choice)).toBe(false);
  });

  /* ── Negative: type boundaries ───────────────────────────────── */

  it("validator rejects null", () => {
    expect(isChoiceDefinition(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isChoiceDefinition(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isChoiceDefinition("choice")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isChoiceDefinition(42)).toBe(false);
  });

  it("validator rejects boolean", () => {
    expect(isChoiceDefinition(true)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isChoiceDefinition([])).toBe(false);
  });

  it("validator rejects empty object", () => {
    expect(isChoiceDefinition({})).toBe(false);
  });
});

describe("factory", () => {
  it("createChoiceDefinition produces valid choice", () => {
    const choice = createChoiceDefinition(
      createChoiceDefinitionId("choice:test:1"),
      "Select a feat",
      "entity",
      1,
      1,
      false,
      createEntityQuery("feat"),
      [createAbilityScorePrerequisite("STR", 13)],
    );

    expect(isChoiceDefinition(choice)).toBe(true);
    expect(choice.id).toBe(createChoiceDefinitionId("choice:test:1"));
    expect(choice.label).toBe("Select a feat");
    expect(choice.type).toBe("entity");
    expect(choice.minimum).toBe(1);
    expect(choice.maximum).toBe(1);
    expect(choice.repeatable).toBe(false);
  });

  it("factory creates immutable copy of prerequisites array", () => {
    const prereqs = [createAbilityScorePrerequisite("STR", 13)];
    const choice = createChoiceDefinition(
      createChoiceDefinitionId("choice:test:2"),
      "Test",
      "entity",
      0,
      1,
      false,
      createEntityQuery("feat"),
      prereqs,
    );

    expect(choice.prerequisites).not.toBe(prereqs);
    expect(choice.prerequisites).toHaveLength(1);
  });

  it("factory produces valid choice with empty prerequisites", () => {
    const choice = createChoiceDefinition(
      createChoiceDefinitionId("choice:test:3"),
      "Test",
      "entity",
      0,
      3,
      false,
      createEntityQuery("feat"),
      [],
    );

    expect(isChoiceDefinition(choice)).toBe(true);
    expect(choice.prerequisites).toHaveLength(0);
  });
});

describe("round-trip", () => {
  it("all choice types round-trip through validator", () => {
    const choices: ChoiceDefinition[] = [
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:entity"),
        "Entity choice",
        "entity",
        1,
        1,
        false,
        createEntityQuery("feat"),
        [],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:ability"),
        "Ability choice",
        "entity",
        0,
        3,
        false,
        createEntityQuery("feat"),
        [],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:skill-prof"),
        "Skill proficiency",
        "skill-proficiency",
        1,
        2,
        false,
        createProficiencyQuery("skill"),
        [createLevelPrerequisite(1)],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:tool-prof"),
        "Tool proficiency",
        "tool-proficiency",
        1,
        1,
        false,
        createProficiencyQuery("tool"),
        [],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:language"),
        "Language choice",
        "language",
        1,
        2,
        true,
        createEntityQuery("language"),
        [],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:equipment"),
        "Equipment choice",
        "equipment",
        1,
        1,
        false,
        createEquipmentQuery({ category: "weapon" }),
        [],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:spell"),
        "Spell choice",
        "spell",
        1,
        2,
        false,
        createSpellQuery({ maxSpellLevel: 3 }),
        [createEntitySelectionPrerequisite(createEntityId("class:2024:xphb:wizard"))],
      ),
      createChoiceDefinition(
        createChoiceDefinitionId("choice:test:feature"),
        "Feature choice",
        "feature",
        1,
        1,
        false,
        createEntityQuery("optional-feature"),
        [createLevelPrerequisite(3)],
      ),
    ];

    for (const choice of choices) {
      expect(isChoiceDefinition(choice)).toBe(true);
    }
  });
});
