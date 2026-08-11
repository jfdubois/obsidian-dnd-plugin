import type { RuleEffect } from "@obsidian-dnd/catalog-contract";
import type {
  AddAbilityEffect,
  AddProficiencyEffect,
  AddAcEffect,
  AddResistanceEffect,
  AddImmunityEffect,
  AddCapabilityEffect,
  AddInitiativeEffect,
  GrantAttackEffect,
  GrantSpellEffect,
  GrantResourceEffect,
  GrantFeatureEffect,
  AddHitPointIncreaseEffect,
} from "@obsidian-dnd/catalog-contract";
import type { CollectedEffect, EffectProvenance } from "./effect-provenance";

/* ── Contribution trace interfaces ───────────────────────────────
   A contribution trace connects a calculated total back to an
   originating effect with full provenance metadata.              */

export interface ContributionTrace {
  category: string;
  detail: string;
  provenance: EffectProvenance;
}

export interface ContributionTracesResult {
  traces: ReadonlyArray<ContributionTrace>;
}

/* ── Category mapping ────────────────────────────────────────────
   Maps each effect type to its contribution category.            */

const EFFECT_CATEGORY_MAP: Record<string, string> = {
  "add-ability": "ability-scores",
  "set-ability": "ability-scores",
  "add-proficiency": "proficiencies",
  "add-expertise": "proficiencies",
  "add-ac": "armor-class",
  "set-ac-formula": "armor-class",
  "add-resistance": "defenses",
  "add-immunity": "defenses",
  "add-capability": "capabilities",
  "add-initiative": "initiative",
  "grant-attack": "attacks",
  "grant-spell": "spellcasting",
  "grant-resource": "resources",
  "grant-feature": "features",
  "add-hit-point-increase": "hit-points",
  "add-language": "capabilities",
  "set-movement": "movement",
  "add-movement": "movement",
  "add-sense": "senses",
  "conditional-roll-mode": "conditional-modifiers",
};

function categoryForEffect(effect: RuleEffect): string {
  return EFFECT_CATEGORY_MAP[effect.type] ?? "unknown";
}

/* ── Provenance source label ─────────────────────────────────────
   Produces a short label like "species-elf" from provenance.     */

function provenanceLabel(provenance: EffectProvenance): string {
  const id = provenance.entityId as unknown as string;
  return `${provenance.sourceKind}-${id}`;
}

/* ── Detail string helpers ───────────────────────────────────────
   Each helper produces a human-readable explanation of what the
   effect contributes, given the effect and its provenance.       */

export function detailForAbilityEffect(
  effect: RuleEffect & AddAbilityEffect,
  provenance: EffectProvenance,
): string {
  return `+${effect.value} to ${effect.ability} from ${provenanceLabel(provenance)}`;
}

export function detailForProficiencyEffect(
  effect: RuleEffect & AddProficiencyEffect,
  provenance: EffectProvenance,
): string {
  const prof = effect.proficiency;

  // Handle WeaponProficiencyScope (has "type" instead of "kind")
  if ("type" in prof) {
    if (prof.type === "weapon-category") {
      return `weapon proficiency: ${prof.category} weapons from ${provenanceLabel(provenance)}`;
    }
    if (prof.type === "weapon-filter") {
      const props = prof.requiredProperties.join("+");
      return `weapon proficiency: ${prof.category} (${props}) from ${provenanceLabel(provenance)}`;
    }
  }

  switch (prof.kind) {
    case "skill": {
      const skillId = prof.entityId as unknown as string;
      return `skill proficiency: ${skillId} from ${provenanceLabel(provenance)}`;
    }
    case "tool": {
      const toolId = prof.toolId as unknown as string;
      return `tool proficiency: ${toolId} from ${provenanceLabel(provenance)}`;
    }
    case "armor": {
      return `armor proficiency: ${prof.category} from ${provenanceLabel(provenance)}`;
    }
    case "saving-throw": {
      return `saving throw proficiency: ${prof.ability} from ${provenanceLabel(provenance)}`;
    }
    case "weapon": {
      const weaponId = prof.weaponId as unknown as string;
      return `weapon proficiency: ${weaponId} from ${provenanceLabel(provenance)}`;
    }
    case "initiative": {
      return `initiative proficiency from ${provenanceLabel(provenance)}`;
    }
  }
}

export function detailForACEffect(
  effect: RuleEffect & AddAcEffect,
  provenance: EffectProvenance,
): string {
  const cond = effect.condition
    ? ` (condition: ${effect.condition.type})`
    : "";
  return `+${effect.value} to AC${cond} from ${provenanceLabel(provenance)}`;
}

export function detailForResistanceEffect(
  effect: RuleEffect & AddResistanceEffect,
  provenance: EffectProvenance,
): string {
  return `${effect.damageType} resistance from ${provenanceLabel(provenance)}`;
}

export function detailForImmunityEffect(
  effect: RuleEffect & AddImmunityEffect,
  provenance: EffectProvenance,
): string {
  const imm = effect.immunity;
  switch (imm.type) {
    case "damage": {
      return `${imm.damageType} immunity from ${provenanceLabel(provenance)}`;
    }
    case "condition": {
      const condId = imm.conditionId as unknown as string;
      return `condition immunity: ${condId} from ${provenanceLabel(provenance)}`;
    }
    case "disease": {
      return `disease immunity from ${provenanceLabel(provenance)}`;
    }
    case "magical-sleep": {
      return `magical sleep immunity from ${provenanceLabel(provenance)}`;
    }
  }
}

export function detailForCapabilityEffect(
  effect: RuleEffect & AddCapabilityEffect,
  provenance: EffectProvenance,
): string {
  return `${effect.capability.type} from ${provenanceLabel(provenance)}`;
}

export function detailForInitiativeEffect(
  effect: RuleEffect & AddInitiativeEffect,
  provenance: EffectProvenance,
): string {
  return `+${effect.value} to initiative from ${provenanceLabel(provenance)}`;
}

function formatDiceExpression(dice: { count: number; sides: number; modifier: number }): string {
  const mod = dice.modifier >= 0 ? `+${dice.modifier}` : `${dice.modifier}`;
  return `${dice.count}d${dice.sides}${mod !== "+0" ? mod : ""}`;
}

export function detailForAttackEffect(
  effect: RuleEffect & GrantAttackEffect,
  provenance: EffectProvenance,
): string {
  const atk = effect.attack;
  const damageStr = atk.damage.type === "simple"
    ? formatDiceExpression(atk.damage.dice)
    : atk.damage.damages.map((d) => formatDiceExpression(d.dice)).join(", ");
  return `attack: ${atk.name} (${damageStr}) from ${provenanceLabel(provenance)}`;
}

export function detailForSpellEffect(
  effect: RuleEffect & GrantSpellEffect,
  provenance: EffectProvenance,
): string {
  const spellId = effect.spellId as unknown as string;
  const grant = effect.grant;
  switch (grant.type) {
    case "known": {
      return `known spell: ${spellId} (level ${grant.level}) from ${provenanceLabel(provenance)}`;
    }
    case "prepared": {
      return `prepared spell: ${spellId} (level ${grant.level}) from ${provenanceLabel(provenance)}`;
    }
    case "always-prepared": {
      return `always-prepared spell: ${spellId} (level ${grant.level}) from ${provenanceLabel(provenance)}`;
    }
    case "cantrip": {
      return `cantrip: ${spellId} from ${provenanceLabel(provenance)}`;
    }
  }
}

export function detailForResourceEffect(
  effect: RuleEffect & GrantResourceEffect,
  provenance: EffectProvenance,
): string {
  const res = effect.resource;
  let recoveryStr = "";
  switch (res.recovery.type) {
    case "short-rest": {
      recoveryStr = `${res.recovery.amountRecovered} uses/short rest`;
      break;
    }
    case "long-rest": {
      recoveryStr = "uses/long rest";
      break;
    }
    case "none": {
      recoveryStr = "no recovery";
      break;
    }
    case "custom": {
      recoveryStr = res.recovery.description;
      break;
    }
  }
  return `resource: ${res.name} (${recoveryStr}) from ${provenanceLabel(provenance)}`;
}

export function detailForHitPointEffect(
  effect: RuleEffect & AddHitPointIncreaseEffect,
  provenance: EffectProvenance,
): string {
  return `+${effect.value} HP per level from ${provenanceLabel(provenance)}`;
}

export function detailForFeatureEffect(
  effect: RuleEffect & GrantFeatureEffect,
  provenance: EffectProvenance,
): string {
  const featureId = effect.featureId as unknown as string;
  return `feature: ${featureId} from ${provenanceLabel(provenance)}`;
}

/* ── Detail dispatcher ───────────────────────────────────────────
   Routes to the correct detail helper based on effect type.      */

function detailForCollectedEffect(collected: CollectedEffect): string {
  const effect = collected.effect;
  const provenance = collected.provenance;

  switch (effect.type) {
    case "add-ability":
    case "set-ability":
      return detailForAbilityEffect(effect as RuleEffect & AddAbilityEffect, provenance);
    case "add-proficiency":
      return detailForProficiencyEffect(effect as RuleEffect & AddProficiencyEffect, provenance);
    case "add-ac":
      return detailForACEffect(effect as RuleEffect & AddAcEffect, provenance);
    case "add-resistance":
      return detailForResistanceEffect(effect as RuleEffect & AddResistanceEffect, provenance);
    case "add-immunity":
      return detailForImmunityEffect(effect as RuleEffect & AddImmunityEffect, provenance);
    case "add-capability":
      return detailForCapabilityEffect(effect as RuleEffect & AddCapabilityEffect, provenance);
    case "add-initiative":
      return detailForInitiativeEffect(effect as RuleEffect & AddInitiativeEffect, provenance);
    case "grant-attack":
      return detailForAttackEffect(effect as RuleEffect & GrantAttackEffect, provenance);
    case "grant-spell":
      return detailForSpellEffect(effect as RuleEffect & GrantSpellEffect, provenance);
    case "grant-resource":
      return detailForResourceEffect(effect as RuleEffect & GrantResourceEffect, provenance);
    case "grant-feature":
      return detailForFeatureEffect(effect as RuleEffect & GrantFeatureEffect, provenance);
    case "add-hit-point-increase":
      return detailForHitPointEffect(effect as RuleEffect & AddHitPointIncreaseEffect, provenance);
    default: {
      return `unknown effect type: ${effect.type} from ${provenanceLabel(provenance)}`;
    }
  }
}

/* ── Stable sort key ─────────────────────────────────────────────
   Deterministic sort: category first, then detail string.        */

function traceSortKey(trace: ContributionTrace): string {
  return `${trace.category}::${trace.detail}`;
}

/* ── Build contribution traces ───────────────────────────────────
   Takes collected effects with provenance and produces a sorted,
   frozen array of contribution traces.                           */

export function buildContributionTraces(
  collectedEffects: ReadonlyArray<CollectedEffect>,
  categoryFilter?: string,
): ContributionTracesResult {
  const traces: ContributionTrace[] = [];

  for (const collected of collectedEffects) {
    const category = categoryForEffect(collected.effect);

    if (categoryFilter !== undefined && category !== categoryFilter) {
      continue;
    }

    const detail = detailForCollectedEffect(collected);

    traces.push({
      category,
      detail,
      provenance: collected.provenance,
    });
  }

  // Deterministic sort
  traces.sort((a, b) => {
    const keyA = traceSortKey(a);
    const keyB = traceSortKey(b);
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return {
    traces: Object.freeze(traces),
  };
}
