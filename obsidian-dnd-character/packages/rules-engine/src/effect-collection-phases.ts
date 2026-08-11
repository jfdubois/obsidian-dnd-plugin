import type { EntityId } from "@obsidian-dnd/domain";
import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import type { Character } from "@obsidian-dnd/character-contract";
import type { CatalogLookup } from "./effect-provenance";
import type { CollectedEffect, EffectProvenance, EffectSourceKind } from "./effect-provenance";

/* ── Internal helpers ───────────────────────────────────────────── */

export function createProvenance(
  sourceKind: EffectSourceKind,
  entityId: EntityId,
  level?: number,
  classInstanceId?: string,
): EffectProvenance {
  const result: EffectProvenance = { sourceKind, entityId };
  if (level !== undefined) result.level = level;
  if (classInstanceId !== undefined) result.classInstanceId = classInstanceId;
  return result;
}

export function addEffectsFrom(
  effects: readonly RuleEffect[],
  provenance: EffectProvenance,
  collected: CollectedEffect[],
): void {
  for (const effect of effects) {
    collected.push({ effect, provenance });
  }
}

/* ── Phase collectors ─────────────────────────────────────────────
   Each phase collects effects from a specific source kind in the
   deterministic ordering.                                         */

export function collectSpeciesEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  const species = catalog.getSpecies(character.origins.speciesId);
  if (!species) return;
  addEffectsFrom(species.effects, createProvenance("species", species.id), collected);
}

export function collectBackgroundEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  const background = catalog.getBackground(character.origins.backgroundId);
  if (!background) return;
  addEffectsFrom(background.effects, createProvenance("background", background.id), collected);
}

function sortClasses(classes: Character["progression"]["classes"]): Character["progression"]["classes"] {
  return [...classes].sort((a, b) => {
    if (a.isStartingClass !== b.isStartingClass) {
      return a.isStartingClass ? -1 : 1;
    }
    return 0; // preserve original order
  });
}

export function collectClassEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const classState of sortClasses(character.progression.classes)) {
    const cls = catalog.getClass(classState.classId);
    if (!cls) continue;
    addEffectsFrom(
      cls.effects,
      createProvenance("class", cls.id, classState.level, classState.instanceId),
      collected,
    );
  }
}

export function collectClassFeatureEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const classState of sortClasses(character.progression.classes)) {
    const cls = catalog.getClass(classState.classId);
    if (!cls) continue;

    for (let level = 1; level <= classState.level; level++) {
      const levelDef = cls.levels[level];
      if (!levelDef) continue;

      for (const grant of levelDef.grants) {
        if (grant.type !== "feature") continue;
        const feature = catalog.getClassFeature(grant.featureId);
        if (!feature) continue;
        addEffectsFrom(
          feature.effects,
          createProvenance("class-feature", feature.id, level, classState.instanceId),
          collected,
        );
      }
    }
  }
}

export function collectSubclassEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const classState of sortClasses(character.progression.classes)) {
    if (!classState.subclassId) continue;
    const subclass = catalog.getSubclass(classState.subclassId);
    if (!subclass) continue;
    addEffectsFrom(
      subclass.effects,
      createProvenance("subclass", subclass.id, classState.level, classState.instanceId),
      collected,
    );
  }
}

export function collectSubclassFeatureEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const classState of sortClasses(character.progression.classes)) {
    if (!classState.subclassId) continue;
    const subclass = catalog.getSubclass(classState.subclassId);
    if (!subclass) continue;

    for (const featureId of subclass.featureIds) {
      const feature = catalog.getSubclassFeature(featureId);
      if (!feature) continue;
      addEffectsFrom(
        feature.effects,
        createProvenance("subclass-feature", feature.id, feature.level, classState.instanceId),
        collected,
      );
    }
  }
}

export function collectFeatEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const choice of Object.values(character.selections)) {
    if (choice.selectedValue.type !== "entity-ids") continue;
    for (const optionId of choice.selectedValue.entityIds) {
      const feat = catalog.getFeat(optionId);
      if (!feat) continue;
      addEffectsFrom(feat.effects, createProvenance("feat", feat.id), collected);
    }
  }
}

export function collectSpellEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const spellSel of character.spells.selections) {
    const spell = catalog.getSpell(spellSel.spellId);
    if (!spell) continue;
    addEffectsFrom(spell.effects, createProvenance("spell", spell.id), collected);
  }
}

export function collectItemEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  // Equipped items first (in inventory order)
  for (const itemInstance of character.inventory) {
    if (itemInstance.type !== "catalog-item" || !itemInstance.equipped) continue;
    const item = catalog.getItem(itemInstance.itemId);
    if (!item) continue;
    addEffectsFrom(item.effects, createProvenance("item-equipped", item.id), collected);
  }

  // Attuned items second; skip items already processed as equipped
  const equippedIds = new Set<EntityId>();
  for (const itemInstance of character.inventory) {
    if (itemInstance.type === "catalog-item" && itemInstance.equipped) {
      equippedIds.add(itemInstance.itemId);
    }
  }

  for (const itemInstance of character.inventory) {
    if (itemInstance.type !== "catalog-item" || !itemInstance.attuned || equippedIds.has(itemInstance.itemId)) continue;
    const item = catalog.getItem(itemInstance.itemId);
    if (!item) continue;
    addEffectsFrom(item.effects, createProvenance("item-attuned", item.id), collected);
  }
}

export function collectOptionalFeatureEffects(
  character: Character,
  catalog: CatalogLookup,
  collected: CollectedEffect[],
): void {
  for (const choice of Object.values(character.selections)) {
    if (choice.selectedValue.type !== "entity-ids") continue;
    for (const optionId of choice.selectedValue.entityIds) {
      const optFeature = catalog.getOptionalFeature(optionId);
      if (!optFeature) continue;
      addEffectsFrom(optFeature.effects, createProvenance("optional-feature", optFeature.id), collected);
    }
  }
}
