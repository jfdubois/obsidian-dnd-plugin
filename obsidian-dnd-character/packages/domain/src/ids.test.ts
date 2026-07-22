import { describe, it, expect } from "vitest";
import {
  createEntityId,
  createSourceId,
  createCharacterId,
  createCatalogRevision,
  createChoiceDefinitionId,
  createChoiceInstanceId,
  createClassInstanceId,
  createItemInstanceId,
  createResourceId,
  entityIdStr,
  sourceIdStr,
  characterIdStr,
  catalogRevisionStr,
  choiceDefinitionIdStr,
  choiceInstanceIdStr,
  classInstanceIdStr,
  itemInstanceIdStr,
  resourceIdStr,
} from "./ids";
import {
  isEntityId,
  isSourceId,
  isCharacterId,
  isCatalogRevision,
  isChoiceDefinitionId,
  isChoiceInstanceId,
  isClassInstanceId,
  isItemInstanceId,
  isResourceId,
  assertEntityId,
  assertSourceId,
  assertCharacterId,
  assertCatalogRevision,
  assertChoiceDefinitionId,
  assertChoiceInstanceId,
  assertClassInstanceId,
  assertItemInstanceId,
  assertResourceId,
} from "./validators";

describe("branded ID factories", () => {
  it("creates EntityId from string", () => {
    const id = createEntityId("class:2024:xphb:fighter");
    expect(id).toBe("class:2024:xphb:fighter");
  });

  it("creates SourceId from string", () => {
    const id = createSourceId("xphb");
    expect(id).toBe("xphb");
  });

  it("creates CharacterId from string", () => {
    const id = createCharacterId("char-001");
    expect(id).toBe("char-001");
  });

  it("creates CatalogRevision from string", () => {
    const id = createCatalogRevision("rev-2026-07-22-001");
    expect(id).toBe("rev-2026-07-22-001");
  });

  it("creates ChoiceDefinitionId from string", () => {
    const id = createChoiceDefinitionId("choice-def-001");
    expect(id).toBe("choice-def-001");
  });

  it("creates ChoiceInstanceId from string", () => {
    const id = createChoiceInstanceId("choice-inst-001");
    expect(id).toBe("choice-inst-001");
  });

  it("creates ClassInstanceId from string", () => {
    const id = createClassInstanceId("class-inst-001");
    expect(id).toBe("class-inst-001");
  });

  it("creates ItemInstanceId from string", () => {
    const id = createItemInstanceId("item-inst-001");
    expect(id).toBe("item-inst-001");
  });

  it("creates ResourceId from string", () => {
    const id = createResourceId("resource-001");
    expect(id).toBe("resource-001");
  });
});

describe("branded ID string accessors", () => {
  it("entityIdStr returns the underlying string", () => {
    const id = createEntityId("test-id");
    expect(entityIdStr(id)).toBe("test-id");
  });

  it("sourceIdStr returns the underlying string", () => {
    const id = createSourceId("src");
    expect(sourceIdStr(id)).toBe("src");
  });

  it("characterIdStr returns the underlying string", () => {
    const id = createCharacterId("char-1");
    expect(characterIdStr(id)).toBe("char-1");
  });

  it("catalogRevisionStr returns the underlying string", () => {
    const id = createCatalogRevision("rev-1");
    expect(catalogRevisionStr(id)).toBe("rev-1");
  });

  it("choiceDefinitionIdStr returns the underlying string", () => {
    const id = createChoiceDefinitionId("cd-1");
    expect(choiceDefinitionIdStr(id)).toBe("cd-1");
  });

  it("choiceInstanceIdStr returns the underlying string", () => {
    const id = createChoiceInstanceId("ci-1");
    expect(choiceInstanceIdStr(id)).toBe("ci-1");
  });

  it("classInstanceIdStr returns the underlying string", () => {
    const id = createClassInstanceId("cls-1");
    expect(classInstanceIdStr(id)).toBe("cls-1");
  });

  it("itemInstanceIdStr returns the underlying string", () => {
    const id = createItemInstanceId("itm-1");
    expect(itemInstanceIdStr(id)).toBe("itm-1");
  });

  it("resourceIdStr returns the underlying string", () => {
    const id = createResourceId("res-1");
    expect(resourceIdStr(id)).toBe("res-1");
  });
});

describe("branded ID validators", () => {
  const validInputs: unknown[] = ["id", "a:1:2:3", "x"];
  const invalidInputs: unknown[] = ["", null, undefined, 0, 1, true, false, {}, [], NaN];

  describe("isEntityId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isEntityId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isEntityId(input)).toBe(false);
      }
    });
  });

  describe("isSourceId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isSourceId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isSourceId(input)).toBe(false);
      }
    });
  });

  describe("isCharacterId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isCharacterId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isCharacterId(input)).toBe(false);
      }
    });
  });

  describe("isCatalogRevision", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isCatalogRevision(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isCatalogRevision(input)).toBe(false);
      }
    });
  });

  describe("isChoiceDefinitionId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isChoiceDefinitionId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isChoiceDefinitionId(input)).toBe(false);
      }
    });
  });

  describe("isChoiceInstanceId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isChoiceInstanceId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isChoiceInstanceId(input)).toBe(false);
      }
    });
  });

  describe("isClassInstanceId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isClassInstanceId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isClassInstanceId(input)).toBe(false);
      }
    });
  });

  describe("isItemInstanceId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isItemInstanceId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isItemInstanceId(input)).toBe(false);
      }
    });
  });

  describe("isResourceId", () => {
    it("accepts non-empty strings", () => {
      for (const input of validInputs) {
        expect(isResourceId(input)).toBe(true);
      }
    });

    it("rejects invalid inputs", () => {
      for (const input of invalidInputs) {
        expect(isResourceId(input)).toBe(false);
      }
    });
  });
});

describe("branded ID assertion helpers", () => {
  it("assertEntityId passes for valid input", () => {
    expect(() => assertEntityId("valid-id")).not.toThrow();
  });

  it("assertEntityId throws for empty string", () => {
    expect(() => assertEntityId("")).toThrow("Invalid EntityId");
  });

  it("assertEntityId throws for null", () => {
    expect(() => assertEntityId(null)).toThrow("Invalid EntityId");
  });

  it("assertEntityId includes context in message", () => {
    expect(() => assertEntityId("", "manifest.id")).toThrow("in manifest.id");
  });

  it("assertSourceId passes for valid input", () => {
    expect(() => assertSourceId("xphb")).not.toThrow();
  });

  it("assertSourceId throws for invalid input", () => {
    expect(() => assertSourceId(123)).toThrow("Invalid SourceId");
  });

  it("assertCharacterId passes for valid input", () => {
    expect(() => assertCharacterId("char-1")).not.toThrow();
  });

  it("assertCharacterId throws for invalid input", () => {
    expect(() => assertCharacterId(undefined)).toThrow("Invalid CharacterId");
  });

  it("assertCatalogRevision passes for valid input", () => {
    expect(() => assertCatalogRevision("rev-1")).not.toThrow();
  });

  it("assertCatalogRevision throws for invalid input", () => {
    expect(() => assertCatalogRevision(false)).toThrow("Invalid CatalogRevision");
  });

  it("assertChoiceDefinitionId passes for valid input", () => {
    expect(() => assertChoiceDefinitionId("cd-1")).not.toThrow();
  });

  it("assertChoiceDefinitionId throws for invalid input", () => {
    expect(() => assertChoiceDefinitionId({})).toThrow("Invalid ChoiceDefinitionId");
  });

  it("assertChoiceInstanceId passes for valid input", () => {
    expect(() => assertChoiceInstanceId("ci-1")).not.toThrow();
  });

  it("assertChoiceInstanceId throws for invalid input", () => {
    expect(() => assertChoiceInstanceId([])).toThrow("Invalid ChoiceInstanceId");
  });

  it("assertClassInstanceId passes for valid input", () => {
    expect(() => assertClassInstanceId("cls-1")).not.toThrow();
  });

  it("assertClassInstanceId throws for invalid input", () => {
    expect(() => assertClassInstanceId(NaN)).toThrow("Invalid ClassInstanceId");
  });

  it("assertItemInstanceId passes for valid input", () => {
    expect(() => assertItemInstanceId("itm-1")).not.toThrow();
  });

  it("assertItemInstanceId throws for invalid input", () => {
    expect(() => assertItemInstanceId(0)).toThrow("Invalid ItemInstanceId");
  });

  it("assertResourceId passes for valid input", () => {
    expect(() => assertResourceId("res-1")).not.toThrow();
  });

  it("assertResourceId throws for invalid input", () => {
    expect(() => assertResourceId(true)).toThrow("Invalid ResourceId");
  });
});

describe("round-trip", () => {
  it("factory + accessor round-trips for EntityId", () => {
    const raw = "class:2024:xphb:fighter";
    const id = createEntityId(raw);
    expect(entityIdStr(id)).toBe(raw);
  });

  it("factory + accessor round-trips for SourceId", () => {
    const raw = "xphb";
    const id = createSourceId(raw);
    expect(sourceIdStr(id)).toBe(raw);
  });

  it("factory + accessor round-trips for CharacterId", () => {
    const raw = "uuid-char-001";
    const id = createCharacterId(raw);
    expect(characterIdStr(id)).toBe(raw);
  });

  it("factory + accessor round-trips for CatalogRevision", () => {
    const raw = "rev-2026-07-22-001";
    const id = createCatalogRevision(raw);
    expect(catalogRevisionStr(id)).toBe(raw);
  });

  it("validator accepts factory-produced IDs", () => {
    expect(isEntityId(createEntityId("x"))).toBe(true);
    expect(isSourceId(createSourceId("x"))).toBe(true);
    expect(isCharacterId(createCharacterId("x"))).toBe(true);
    expect(isCatalogRevision(createCatalogRevision("x"))).toBe(true);
    expect(isChoiceDefinitionId(createChoiceDefinitionId("x"))).toBe(true);
    expect(isChoiceInstanceId(createChoiceInstanceId("x"))).toBe(true);
    expect(isClassInstanceId(createClassInstanceId("x"))).toBe(true);
    expect(isItemInstanceId(createItemInstanceId("x"))).toBe(true);
    expect(isResourceId(createResourceId("x"))).toBe(true);
  });
});
