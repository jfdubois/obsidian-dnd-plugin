import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { buildReviewSnapshot } from "./character-review-snapshot";
import { buildCreatorPreview } from "./creator-preview";
import { finalizeCharacterWithCatalog } from "./character-finalize";

const catalogRoot = new URL("../../catalog-server/catalog/v1/revisions/5etools-3c5d9d3-b3/entities/", import.meta.url);

function entity(kind: string, id: string): EntityDetailResponse {
  return JSON.parse(readFileSync(new URL(`${kind}/${id}.json`, catalogRoot), "utf8")) as EntityDetailResponse;
}

const elf = entity("species", "species:2014:phb:elf");
const human = entity("species", "species:2014:phb:human");
const acolyte = entity("background", "background:2014:phb:acolyte");
const barbarian = entity("class", "class:2014:phb:barbarian");
const celestial = entity("language", "language:2014:phb:celestial");
const draconic = entity("language", "language:2014:phb:draconic");
const holySymbol = entity("item", "item:2014:phb:holy-symbol");
const commonClothes = entity("item", "item:2014:phb:common-clothes");
const pouch = entity("item", "item:2014:phb:pouch");
const book = entity("item", "item:2014:phb:book");
const entities = [elf, human, acolyte, barbarian, celestial, draconic, holySymbol, commonClothes, pouch, book];

function representativeDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2014";
  draft.identity.name = "Review Elf";
  draft.species.speciesId = elf.id;
  draft.background.backgroundId = acolyte.id;
  draft.class.classId = barbarian.id;
  draft.abilities.scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  for (const step of ALL_DRAFT_STEPS) markStepResolved(draft, step);
  draft.selections[`${acolyte.id}:choice:background:2014:phb:acolyte:language:0` as never] = {
    instanceId: `${acolyte.id}:choice:background:2014:phb:acolyte:language:0` as never,
    definitionId: "background:2014:phb:acolyte:language:0" as never,
    originGrantId: acolyte.id,
    selectedValue: { type: "entity-ids", entityIds: [celestial.id, draconic.id] },
  };
  draft.selections[`${acolyte.id}:choice:background:2014:phb:acolyte:equipment:1` as never] = {
    instanceId: `${acolyte.id}:choice:background:2014:phb:acolyte:equipment:1` as never,
    definitionId: "background:2014:phb:acolyte:equipment:1" as never,
    originGrantId: acolyte.id,
    selectedValue: { type: "option-ids", optionIds: ["background:2014:phb:acolyte:equipment:1:a" as never] },
  };
  return draft;
}

describe("buildReviewSnapshot", () => {
  it("derives PHB Elf origin effects and initial HP through the production catalog", () => {
    const draft = representativeDraft();
    const snapshot = buildReviewSnapshot(draft, entities);

    expect(snapshot?.abilities.scores).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
    expect(snapshot?.derived.abilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ ability: "DEX", baseScore: 10, originContribution: 2, finalScore: 12, modifier: 1 }),
      expect.objectContaining({ ability: "CON", baseScore: 10, originContribution: 0, finalScore: 10, modifier: 0 }),
    ]));
    expect(snapshot?.derived.abilityContributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ ability: "DEX", value: 2, provenance: expect.objectContaining({ sourceKind: "species", entityId: elf.id }) }),
    ]));
    expect(snapshot?.derived.hitPoints).toEqual({ maximum: 12, initialCurrent: 12 });
  });

  it("saves the preview-derived initial HP without persisting derived totals", () => {
    const draft = representativeDraft();
    const preview = buildCreatorPreview(draft, entities);
    const character = finalizeCharacterWithCatalog(draft, entities);

    expect(character?.resources.currentHp).toBe(preview?.projection.maxHp.totalHp);
    expect(character?.resources.currentHp).toBe(12);
    expect(character?.abilities.scores).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
    expect(JSON.stringify(character)).not.toContain("maximumHp");
    expect(JSON.stringify(character)).not.toContain("finalScore");
    expect(JSON.stringify(character)).not.toContain("optionQuery");
  });

  it("updates derived consequences after an origin change without rewriting base ability state", () => {
    const draft = representativeDraft();
    const elfSnapshot = buildReviewSnapshot(draft, entities);
    draft.species.speciesId = human.id;
    const humanSnapshot = buildReviewSnapshot(draft, entities);

    expect(elfSnapshot?.derived.abilities.find((entry) => entry.ability === "DEX")?.finalScore).toBe(12);
    expect(humanSnapshot?.derived.abilities.find((entry) => entry.ability === "DEX")?.finalScore).toBe(10);
    expect(draft.abilities.scores).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 });
  });

  it("returns null before the draft is complete", () => {
    expect(buildReviewSnapshot(createEmptyCharacterDraft(), entities)).toBeNull();
  });
});
