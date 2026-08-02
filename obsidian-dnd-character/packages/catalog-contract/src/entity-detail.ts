/**
 * Entity detail response types.
 *
 * Defines the discriminated union of all possible entity rule
 * detail responses returned by the catalog server. Each rule
 * type carries a `kind` discriminator field that allows runtime
 * validation and type narrowing.
 */

import type {
  EntityId,
  RuleEntityKind,
  Ruleset,
  SourceId,
  ContentAccess,
} from "@obsidian-dnd/domain";
import {
  isEntityId,
  isRuleEntityKind,
  isRuleset,
  isSourceId,
  isContentAccess,
} from "@obsidian-dnd/domain";

import type { SpeciesRule } from "./entity-species";
import { isSpeciesRule } from "./entity-species";

import type { BackgroundRule } from "./entity-background";
import { isBackgroundRule } from "./entity-background";

import type { ClassRule } from "./class-progression";
import { isClassRule } from "./class-progression";

import type { SubclassRule } from "./entity-subclass";
import { isSubclassRule } from "./entity-subclass";

import type { ClassFeatureRule } from "./entity-class-feature";
import { isClassFeatureRule } from "./entity-class-feature";

import type { SubclassFeatureRule } from "./entity-subclass-feature";
import { isSubclassFeatureRule } from "./entity-subclass-feature";

import type { FeatRule } from "./entity-feat";
import { isFeatRule } from "./entity-feat";

import type { SpellRule } from "./entity-spell";
import { isSpellRule } from "./entity-spell";

import type { ItemRule } from "./entity-item";
import { isItemRule } from "./entity-item";

import type { OptionalFeatureRule } from "./entity-optional-feature";
import { isOptionalFeatureRule } from "./entity-optional-feature";

import type { SkillRule } from "./entity-skill";
import { isSkillRule } from "./entity-skill";

import type { LanguageRule } from "./entity-language";
import { isLanguageRule } from "./entity-language";

/* ── Discriminated union ───────────────────────────────────────── */

/**
 * A validated entity detail response from the catalog server.
 *
 * Each variant carries a `kind` discriminator that matches the
 * entity kind in the catalog index. Callers can narrow the type
 * by checking the `kind` field.
 */
export type EntityDetailResponse =
  | SpeciesRule
  | BackgroundRule
  | ClassRule
  | SubclassRule
  | ClassFeatureRule
  | SubclassFeatureRule
  | FeatRule
  | SpellRule
  | ItemRule
  | OptionalFeatureRule
  | SkillRule
  | LanguageRule;

/* ── Common entity rule fields ───────────────────────────────────
    All entity rule types share these base fields. Validate them
    first before dispatching to the kind-specific validator.       */

interface CommonEntityRuleFields {
  id: EntityId;
  kind: RuleEntityKind;
  name: string;
  sourceId: SourceId;
  ruleset: Ruleset;
  access: ContentAccess;
  legacy: boolean;
}

function hasCommonEntityRuleFields(
  value: unknown,
): value is CommonEntityRuleFields {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isEntityId(obj.id)) return false;
  if (!isRuleEntityKind(obj.kind)) return false;
  if (typeof obj.name !== "string" || obj.name.length === 0) return false;
  if (!isSourceId(obj.sourceId)) return false;
  if (!isRuleset(obj.ruleset)) return false;
  if (!isContentAccess(obj.access)) return false;
  if (typeof obj.legacy !== "boolean") return false;

  return true;
}

/* ── Validation guard ──────────────────────────────────────────── */

/**
 * Validate that an unknown value is a well-formed entity detail
 * response. Checks common fields first, then dispatches to the
 * kind-specific validator.
 */
export function isEntityDetailResponse(
  value: unknown,
): value is EntityDetailResponse {
  if (!hasCommonEntityRuleFields(value)) return false;

  const kind = value.kind;

  switch (kind) {
    case "species":
      return isSpeciesRule(value);
    case "background":
      return isBackgroundRule(value);
    case "class":
      return isClassRule(value);
    case "subclass":
      return isSubclassRule(value);
    case "class-feature":
      return isClassFeatureRule(value);
    case "subclass-feature":
      return isSubclassFeatureRule(value);
    case "feat":
      return isFeatRule(value);
    case "spell":
      return isSpellRule(value);
    case "item":
      return isItemRule(value);
    case "optional-feature":
      return isOptionalFeatureRule(value);
    case "skill":
      return isSkillRule(value);
    case "language":
      return isLanguageRule(value);
    default: {
      // Exhaustive check — should never reach here if
      // isRuleEntityKind passes and all kinds are handled.
      const _exhaustive: never = kind;
      return false;
    }
  }
}
