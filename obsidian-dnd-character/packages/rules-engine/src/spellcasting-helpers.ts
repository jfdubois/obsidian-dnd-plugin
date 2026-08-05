import {
  makeEffect,
  eid,
} from "./effect-collection-helpers";
import {
  createSpellKnownGrant,
  createSpellPreparedGrant,
  createSpellAlwaysPreparedGrant,
  createSpellCantripGrant,
} from "@obsidian-dnd/catalog-contract";

export function makeKnownSpell(spellId: string, level: number) {
  return makeEffect("grant-spell", {
    spellId: eid(spellId),
    grant: createSpellKnownGrant(level),
  });
}

export function makePreparedSpell(spellId: string, level: number) {
  return makeEffect("grant-spell", {
    spellId: eid(spellId),
    grant: createSpellPreparedGrant(level),
  });
}

export function makeAlwaysPreparedSpell(spellId: string, level: number) {
  return makeEffect("grant-spell", {
    spellId: eid(spellId),
    grant: createSpellAlwaysPreparedGrant(level),
  });
}

export function makeCantrip(spellId: string) {
  return makeEffect("grant-spell", {
    spellId: eid(spellId),
    grant: createSpellCantripGrant(),
  });
}
