import type { CatalogableEntity } from "./compact-index-tag-generator.js";

/* ── Required entity kinds ────────────────────────────────────────
   The catalog must contain at least one entity of each required kind
   before publication is permitted. This guard prevents publishing
   incomplete catalogs.                                               */

export const REQUIRED_ENTITY_KINDS: ReadonlySet<string> = Object.freeze(
  new Set(["species", "background", "class", "feat", "spell", "item"]),
);

/**
 * Validate that the normalized entity set contains at least one entity
 * for every required entity kind.
 *
 * @returns An array of error messages (empty if all required kinds are present).
 */
export function validateRequiredEntityKinds(
  entities: readonly CatalogableEntity[],
): readonly string[] {
  const presentKinds = new Set<string>();
  for (const entity of entities) {
    presentKinds.add(entity.kind);
  }

  const missingKinds: string[] = [];
  for (const requiredKind of REQUIRED_ENTITY_KINDS) {
    if (!presentKinds.has(requiredKind)) {
      missingKinds.push(requiredKind);
    }
  }

  if (missingKinds.length === 0) {
    return Object.freeze([]);
  }

  const errors: string[] = [
    `Publication guard: missing required entity kind(s): ${missingKinds.join(", ")}`,
  ];
  for (const kind of missingKinds) {
    errors.push(`  - "${kind}": zero entities found (at least one required)`);
  }

  return Object.freeze(errors);
}
