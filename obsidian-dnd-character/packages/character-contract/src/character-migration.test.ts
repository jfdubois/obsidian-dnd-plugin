import { describe, it, expect } from "vitest";
import {
  type CharacterSchemaMigration,
  MIGRATION_REGISTRY,
  CharacterMigrationError,
  migrateCharacter,
} from "./character-migration";
import { CHARACTER_SCHEMA_VERSION } from "./schema-version";

/* ── Helpers ───────────────────────────────────────────────────── */

/** Build a minimal raw character object at a given schema version. */
function makeRawCharacter(version: number, extras?: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: version,
    id: "char-test",
    ...extras,
  };
}

/** Temporarily append a migration to the registry for testing. */
function withTestMigration(
  migration: CharacterSchemaMigration,
  fn: () => void,
): void {
  // We push to the actual array since MIGRATION_REGISTRY is a ReadonlyArray
  // but the underlying array is mutable. We clean up after.
  const arr = MIGRATION_REGISTRY as unknown as Array<CharacterSchemaMigration>;
  arr.push(migration);
  try {
    fn();
  } finally {
    arr.pop();
  }
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("Character Migration Framework", () => {
  describe("migrateCharacter", () => {
    it("passes through current version unchanged", () => {
      const raw = makeRawCharacter(CHARACTER_SCHEMA_VERSION);
      const result = migrateCharacter(raw);
      expect(result).toBe(raw);
    });

    it("passes through current version with explicit target", () => {
      const raw = makeRawCharacter(CHARACTER_SCHEMA_VERSION);
      const result = migrateCharacter(raw, CHARACTER_SCHEMA_VERSION);
      expect(result).toBe(raw);
    });

    it("returns unchanged data when no migrations needed", () => {
      const raw = makeRawCharacter(CHARACTER_SCHEMA_VERSION);
      const result = migrateCharacter(raw);
      expect((result as Record<string, unknown>).schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    });

    it("applies a single migration step", () => {
      withTestMigration(
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data: unknown) => {
            const obj = data as Record<string, unknown>;
            return {
              ...obj,
              schemaVersion: 2,
              migratedField: "present",
            };
          },
        },
        () => {
          const raw = makeRawCharacter(1);
          const result = migrateCharacter(raw, 2);
          expect((result as Record<string, unknown>).schemaVersion).toBe(2);
          expect((result as Record<string, unknown>).migratedField).toBe("present");
        },
      );
    });

    it("applies multiple migration steps in sequence", () => {
      withTestMigration(
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data: unknown) => {
            const obj = data as Record<string, unknown>;
            return { ...obj, schemaVersion: 2, step1: true };
          },
        },
        () => {
          // Push a second migration for step 2->3
          const arr = MIGRATION_REGISTRY as unknown as Array<CharacterSchemaMigration>;
          arr.push({
            fromVersion: 2,
            toVersion: 3,
            migrate: (data: unknown) => {
              const obj = data as Record<string, unknown>;
              return { ...obj, schemaVersion: 3, step2: true };
            },
          });
          try {
            const raw = makeRawCharacter(1);
            const result = migrateCharacter(raw, 3);
            expect((result as Record<string, unknown>).schemaVersion).toBe(3);
            expect((result as Record<string, unknown>).step1).toBe(true);
            expect((result as Record<string, unknown>).step2).toBe(true);
          } finally {
            arr.pop();
          }
        },
      );
    });

    it("preserves non-migrated fields through the pipeline", () => {
      withTestMigration(
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data: unknown) => {
            const obj = data as Record<string, unknown>;
            return { ...obj, schemaVersion: 2 };
          },
        },
        () => {
          const raw = makeRawCharacter(1, { identity: { name: "Test" } });
          const result = migrateCharacter(raw, 2);
          expect((result as Record<string, unknown>).identity).toEqual({ name: "Test" });
        },
      );
    });

    it("throws on missing schema version", () => {
      let thrown: CharacterMigrationError | undefined;
      try {
        migrateCharacter({ id: "char-test" });
      } catch (err) {
        thrown = err as CharacterMigrationError;
      }
      expect(thrown).toBeInstanceOf(CharacterMigrationError);
      expect(thrown?.reason).toBe("missing-schema-version");
    });

    it("throws on non-object input", () => {
      let thrown: CharacterMigrationError | undefined;
      try {
        migrateCharacter("not an object");
      } catch (err) {
        thrown = err as CharacterMigrationError;
      }
      expect(thrown).toBeInstanceOf(CharacterMigrationError);
      expect(thrown?.reason).toBe("missing-schema-version");
    });

    it("throws on null input", () => {
      let thrown: CharacterMigrationError | undefined;
      try {
        migrateCharacter(null);
      } catch (err) {
        thrown = err as CharacterMigrationError;
      }
      expect(thrown).toBeInstanceOf(CharacterMigrationError);
      expect(thrown?.reason).toBe("missing-schema-version");
    });

    it("throws on unsupported future version", () => {
      let thrown: CharacterMigrationError | undefined;
      try {
        migrateCharacter(makeRawCharacter(99));
      } catch (err) {
        thrown = err as CharacterMigrationError;
      }
      expect(thrown).toBeInstanceOf(CharacterMigrationError);
      expect(thrown?.reason).toBe("unsupported-future-version");
      expect(thrown?.fromVersion).toBe(99);
      expect(thrown?.toVersion).toBe(CHARACTER_SCHEMA_VERSION);
    });

    it("throws on unsupported old version with no migration", () => {
      let thrown: CharacterMigrationError | undefined;
      try {
        migrateCharacter(makeRawCharacter(0));
      } catch (err) {
        thrown = err as CharacterMigrationError;
      }
      expect(thrown).toBeInstanceOf(CharacterMigrationError);
      expect(thrown?.reason).toBe("unsupported-old-version");
      expect(thrown?.fromVersion).toBe(0);
    });

    it("propagates migration failure with context", () => {
      withTestMigration(
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: () => {
            throw new Error("boom");
          },
        },
        () => {
          let thrown: CharacterMigrationError | undefined;
          try {
            migrateCharacter(makeRawCharacter(1), 2);
          } catch (err) {
            thrown = err as CharacterMigrationError;
          }
          expect(thrown).toBeInstanceOf(CharacterMigrationError);
          expect(thrown?.reason).toBe("migration-failed");
          expect(thrown?.fromVersion).toBe(1);
          expect(thrown?.toVersion).toBe(2);
          expect(thrown?.cause).toBeInstanceOf(Error);
        },
      );
    });

    it("throws on malformed input at migration boundary", () => {
      withTestMigration(
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (data: unknown) => {
            if (typeof data !== "object" || data === null) {
              throw new Error("expected object");
            }
            const obj = data as Record<string, unknown>;
            return { ...obj, schemaVersion: 2 };
          },
        },
        () => {
          let thrown: CharacterMigrationError | undefined;
          try {
            migrateCharacter("not-an-object", 2);
          } catch (err) {
            thrown = err as CharacterMigrationError;
          }
          // Fails at extractSchemaVersion before migration even runs
          expect(thrown).toBeInstanceOf(CharacterMigrationError);
          expect(thrown?.reason).toBe("missing-schema-version");
        },
      );
    });
  });

  describe("CharacterMigrationError", () => {
    it("has correct name", () => {
      const err = new CharacterMigrationError({
        reason: "missing-schema-version",
        message: "test",
      });
      expect(err.name).toBe("CharacterMigrationError");
    });

    it("carries reason and version context", () => {
      const err = new CharacterMigrationError({
        reason: "migration-failed",
        message: "test",
        fromVersion: 1,
        toVersion: 2,
        cause: new Error("inner"),
      });
      expect(err.reason).toBe("migration-failed");
      expect(err.fromVersion).toBe(1);
      expect(err.toVersion).toBe(2);
      expect(err.cause).toBeInstanceOf(Error);
    });

    it("defaults fromVersion and toVersion to null", () => {
      const err = new CharacterMigrationError({
        reason: "missing-schema-version",
        message: "test",
      });
      expect(err.fromVersion).toBeNull();
      expect(err.toVersion).toBeNull();
    });
  });

  describe("MIGRATION_REGISTRY", () => {
    it("is initially empty", () => {
      expect(MIGRATION_REGISTRY.length).toBe(0);
    });

    it("is a ReadonlyArray", () => {
      // Type-level check: the type is ReadonlyArray, so this should be
      // a type error if uncommented:
      // MIGRATION_REGISTRY.push(...)
      // At runtime we verify it's an array:
      expect(Array.isArray(MIGRATION_REGISTRY)).toBe(true);
    });
  });
});
