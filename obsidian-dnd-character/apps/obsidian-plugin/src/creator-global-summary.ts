import type { AddProficiencyTarget, EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { EntityId } from "@obsidian-dnd/domain";
import type { SelectionConsequenceModel } from "./creator-consequence-service";

export interface CreatorSummaryEntry { label: string; origin: string; }
export interface CreatorEquipmentEntry extends CreatorSummaryEntry { quantity?: number; }
export interface CreatorGlobalSummary { languages: CreatorSummaryEntry[]; proficiencies: CreatorSummaryEntry[]; equipment: CreatorEquipmentEntry[]; }

/** A disposable projection; it never reads raw draft selections. */
export function deriveCreatorGlobalSummary(model: SelectionConsequenceModel, entities: readonly EntityDetailResponse[]): CreatorGlobalSummary {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const languages: CreatorSummaryEntry[] = []; const proficiencies: CreatorSummaryEntry[] = []; const equipment: CreatorEquipmentEntry[] = [];
  for (const origin of model.origins) {
    const originName = `${origin.origin.kind[0]!.toUpperCase()}${origin.origin.kind.slice(1)}: ${origin.origin.name}`;
    for (const effect of origin.effects) {
      if (effect.type === "add-language") addEntity(languages, effect.languageId, originName, byId);
      if (effect.type === "add-proficiency") addProficiency(proficiencies, effect.proficiency, originName, byId);
    }
    for (const consequence of origin.grants) {
      const grant = consequence.grant;
      if (grant.type === "item") { const item = byId.get(grant.itemId); if (item?.kind === "item") equipment.push({ label: item.name, quantity: grant.quantity, origin: originName }); }
      else if (grant.type === "named-item") equipment.push({ label: grant.name.trim(), quantity: grant.quantity, origin: originName });
      else if (grant.type === "currency" && consequence.resolvedAmount !== undefined) equipment.push({ label: `Starting Currency: ${consequence.resolvedAmount} ${grant.denomination}`, origin: originName });
      else if (grant.type === "entity") { const entity = byId.get(grant.entityId); if (entity?.kind === "language") languages.push({ label: entity.name, origin: originName }); if (entity?.kind === "skill" || entity?.kind === "item") proficiencies.push({ label: entity.name, origin: originName }); }
    }
    for (const choice of origin.choices) {
      if (choice.selectedValue?.type !== "entity-ids") continue;
      for (const entityId of choice.selectedValue.entityIds) {
        const entity = byId.get(entityId);
        if (entity?.kind === "language") languages.push({ label: entity.name, origin: originName });
        else if (isProficiencyChoice(choice.definition.type) && entity !== undefined) proficiencies.push({ label: entity.name, origin: originName });
      }
    }
  }
  return { languages: unique(languages), proficiencies: unique(proficiencies), equipment: unique(equipment) };
}

function addEntity(entries: CreatorSummaryEntry[], id: EntityId, origin: string, byId: ReadonlyMap<EntityId, EntityDetailResponse>): void { const entity = byId.get(id); if (entity !== undefined) entries.push({ label: entity.name, origin }); }
function addProficiency(entries: CreatorSummaryEntry[], target: AddProficiencyTarget, origin: string, byId: ReadonlyMap<EntityId, EntityDetailResponse>): void { if ("type" in target) { entries.push({ label: target.type === "weapon-category" ? `${target.category} weapons` : `${target.category} weapons`, origin }); return; } const id = "entityId" in target ? target.entityId : "toolId" in target ? target.toolId : undefined; if (id !== undefined) return addEntity(entries, id, origin, byId); entries.push({ label: target.kind.replaceAll("-", " "), origin }); }
function isProficiencyChoice(type: string): boolean { return type === "skill-proficiency" || type === "tool-proficiency" || type === "saving-throw"; }
function unique<T extends CreatorSummaryEntry>(entries: readonly T[]): T[] { const seen = new Set<string>(); return entries.filter((entry) => { const key = `${entry.origin}\u0000${entry.label}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
