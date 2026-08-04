import { describe, it, expect } from "vitest";
import {
  isCharacterIdentity,
  createCharacterIdentity,
} from "./character-identity";

describe("CharacterIdentity", () => {
  it("accepts valid identity with just a name", () => {
    expect(isCharacterIdentity(createCharacterIdentity("Aragorn"))).toBe(true);
  });

  it("accepts identity with all optional fields", () => {
    expect(isCharacterIdentity(createCharacterIdentity("Aragorn", {
      playerName: "Alice",
      portraitPath: "portraits/aragorn.png",
      pronouns: "he/him",
      alignment: "Lawful Good",
      notes: "King of Gondor",
    }))).toBe(true);
  });

  it("rejects identity with empty name", () => {
    expect(isCharacterIdentity({ name: "" })).toBe(false);
  });

  it("rejects identity with missing name", () => {
    expect(isCharacterIdentity({})).toBe(false);
  });

  it("rejects identity with non-string name", () => {
    expect(isCharacterIdentity({ name: 123 })).toBe(false);
  });

  it("rejects identity with non-string playerName", () => {
    expect(isCharacterIdentity({ name: "Aragorn", playerName: 123 })).toBe(false);
  });

  it("factory returns identity with correct name", () => {
    const identity = createCharacterIdentity("Aragorn");
    expect(identity.name).toBe("Aragorn");
    expect(identity.playerName).toBeUndefined();
  });

  it("factory sets optional fields when provided", () => {
    const identity = createCharacterIdentity("Aragorn", {
      playerName: "Alice",
      alignment: "Lawful Good",
    });
    expect(identity.playerName).toBe("Alice");
    expect(identity.alignment).toBe("Lawful Good");
    expect(identity.portraitPath).toBeUndefined();
  });
});
