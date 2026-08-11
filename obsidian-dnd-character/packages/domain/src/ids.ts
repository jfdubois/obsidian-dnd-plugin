type Brand<T, B extends string> = T & { readonly __brand: B };

/* ── Branded ID types ─────────────────────────────────────────── */

export type EntityId = Brand<string, "EntityId">;
export type SourceId = Brand<string, "SourceId">;
export type CharacterId = Brand<string, "CharacterId">;
export type CatalogRevision = Brand<string, "CatalogRevision">;
export type ChoiceDefinitionId = Brand<string, "ChoiceDefinitionId">;
export type ChoiceOptionId = Brand<string, "ChoiceOptionId">;
export type RuleGrantId = Brand<string, "RuleGrantId">;
export type ChoiceInstanceId = Brand<string, "ChoiceInstanceId">;
export type ClassInstanceId = Brand<string, "ClassInstanceId">;
export type ItemInstanceId = Brand<string, "ItemInstanceId">;
export type ResourceId = Brand<string, "ResourceId">;

/* ── Factory functions ────────────────────────────────────────── */

export function createEntityId(value: string): EntityId {
  return value as EntityId;
}

export function createSourceId(value: string): SourceId {
  return value as SourceId;
}

export function createCharacterId(value: string): CharacterId {
  return value as CharacterId;
}

export function createCatalogRevision(value: string): CatalogRevision {
  return value as CatalogRevision;
}

export function createChoiceDefinitionId(value: string): ChoiceDefinitionId {
  return value as ChoiceDefinitionId;
}

export function createChoiceOptionId(value: string): ChoiceOptionId {
  return value as ChoiceOptionId;
}

export function createRuleGrantId(value: string): RuleGrantId {
  return value as RuleGrantId;
}

export function createChoiceInstanceId(value: string): ChoiceInstanceId {
  return value as ChoiceInstanceId;
}

export function createClassInstanceId(value: string): ClassInstanceId {
  return value as ClassInstanceId;
}

export function createItemInstanceId(value: string): ItemInstanceId {
  return value as ItemInstanceId;
}

export function createResourceId(value: string): ResourceId {
  return value as ResourceId;
}

/* ── Unbranded access ─────────────────────────────────────────── */

export function entityIdStr(id: EntityId): string {
  return id;
}

export function sourceIdStr(id: SourceId): string {
  return id;
}

export function characterIdStr(id: CharacterId): string {
  return id;
}

export function catalogRevisionStr(rev: CatalogRevision): string {
  return rev;
}

export function choiceDefinitionIdStr(id: ChoiceDefinitionId): string {
  return id;
}

export function choiceOptionIdStr(id: ChoiceOptionId): string {
  return id;
}

export function ruleGrantIdStr(id: RuleGrantId): string {
  return id;
}

export function choiceInstanceIdStr(id: ChoiceInstanceId): string {
  return id;
}

export function classInstanceIdStr(id: ClassInstanceId): string {
  return id;
}

export function itemInstanceIdStr(id: ItemInstanceId): string {
  return id;
}

export function resourceIdStr(id: ResourceId): string {
  return id;
}
