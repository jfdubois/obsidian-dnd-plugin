import type { EntityId } from "@obsidian-dnd/domain";
import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import type {
  SpeciesRule,
  BackgroundRule,
  ClassRule,
  ClassFeatureRule,
  SubclassRule,
  SubclassFeatureRule,
  FeatRule,
  SpellRule,
  ItemRule,
  OptionalFeatureRule,
} from "@obsidian-dnd/catalog-contract";

/* ── Effect source kind ───────────────────────────────────────────
   Discriminates where an effect originated within the character
   build pipeline. The ordering of these kinds defines the
   deterministic collection order.                                */

export type EffectSourceKind =
  | "species"
  | "background"
  | "class"
  | "class-feature"
  | "subclass"
  | "subclass-feature"
  | "feat"
  | "spell"
  | "item-equipped"
  | "item-attuned"
  | "optional-feature"
  | "override";

export const EFFECT_SOURCE_KINDS: ReadonlyArray<EffectSourceKind> = [
  "species",
  "background",
  "class",
  "class-feature",
  "subclass",
  "subclass-feature",
  "feat",
  "spell",
  "item-equipped",
  "item-attuned",
  "optional-feature",
  "override",
];

/* ── Effect provenance ────────────────────────────────────────────
   Tracks the origin of each collected effect for explanation
   and debugging purposes.                                       */

export interface EffectProvenance {
  sourceKind: EffectSourceKind;
  entityId: EntityId;
  /** Class level at which the effect was granted (class features, subclass features). */
  level?: number;
  /** Class instance ID when the effect originates from a class progression. */
  classInstanceId?: string;
}

/* ── Collected effect ─────────────────────────────────────────────
   A rule effect paired with its provenance metadata.              */

export interface CollectedEffect {
  effect: RuleEffect;
  provenance: EffectProvenance;
}

/* ── Catalog lookup interface ─────────────────────────────────────
   Pure lookup interface for resolving entity IDs to their full
   rule definitions. The rules engine never mutates catalog data. */

export interface CatalogLookup {
  getSpecies(id: EntityId): SpeciesRule | undefined;
  getBackground(id: EntityId): BackgroundRule | undefined;
  getClass(id: EntityId): ClassRule | undefined;
  getClassFeature(id: EntityId): ClassFeatureRule | undefined;
  getSubclass(id: EntityId): SubclassRule | undefined;
  getSubclassFeature(id: EntityId): SubclassFeatureRule | undefined;
  getFeat(id: EntityId): FeatRule | undefined;
  getSpell(id: EntityId): SpellRule | undefined;
  getItem(id: EntityId): ItemRule | undefined;
  getOptionalFeature(id: EntityId): OptionalFeatureRule | undefined;
}
