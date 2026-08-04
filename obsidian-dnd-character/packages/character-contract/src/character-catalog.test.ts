import { describe, it, expect } from "vitest";
import {
  createCatalogRevision,
} from "@obsidian-dnd/domain";
import {
  isCharacterCatalogReference,
  createCharacterCatalogReference,
} from "./character-catalog";

describe("CharacterCatalogReference", () => {
  it("accepts valid catalog reference", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 1,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    })).toBe(true);
  });

  it("accepts catalog reference with different revisions", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 2,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240201"),
    })).toBe(true);
  });

  it("rejects catalog reference with schema version 0", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 0,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    })).toBe(false);
  });

  it("rejects catalog reference with negative schema version", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: -1,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    })).toBe(false);
  });

  it("rejects catalog reference with non-integer schema version", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 1.5,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    })).toBe(false);
  });

  it("rejects catalog reference with missing revisions", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 1,
    })).toBe(false);
  });

  it("rejects catalog reference with empty string revision", () => {
    expect(isCharacterCatalogReference({
      catalogSchemaVersion: 1,
      createdWithRevision: "",
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    })).toBe(false);
  });

  it("factory produces correct catalog reference", () => {
    const ref = createCharacterCatalogReference({
      catalogSchemaVersion: 1,
      createdWithRevision: createCatalogRevision("rev-20240101"),
      lastValidatedRevision: createCatalogRevision("rev-20240101"),
    });
    expect(ref.catalogSchemaVersion).toBe(1);
    expect(ref.createdWithRevision).toBe(ref.lastValidatedRevision);
  });
});
