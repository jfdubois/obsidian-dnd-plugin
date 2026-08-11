import { Setting } from "obsidian";
import type { RuleGrantId } from "@obsidian-dnd/domain";
import type { CreatorConsequenceDiagnostic, OriginConsequence } from "./creator-consequence-service";

export type ResolveOriginRandomGrant = (grantId: RuleGrantId) => void;

/** Presentation-only summary of the consequence model; it has no draft writes. */
export function renderOriginConsequences(container: HTMLElement, origin: OriginConsequence | undefined, diagnostics: readonly CreatorConsequenceDiagnostic[], resolveRandomGrant?: ResolveOriginRandomGrant): void {
  if (origin === undefined) return;
  const section = container.createDiv({ cls: "dnd-origin-consequences" });
  section.createEl("h4", { text: "Automatic consequences" });
  const grants = origin.grants.filter((entry) => entry.grant.type === "item" || entry.grant.type === "named-item" || entry.grant.type === "currency");
  if (origin.effects.length === 0 && grants.length === 0 && origin.levelOneGrants.length === 0) section.createEl("p", { text: "No additional automatic consequences.", cls: "dnd-creator-info" });
  for (const effect of origin.effects) section.createEl("p", { text: `Automatic effect: ${formatEffectType(effect.type)}` });
  for (const entry of grants) {
    const grant = entry.grant;
    if (grant.type === "item") section.createEl("p", { text: `Automatically granted catalog item ×${grant.quantity}` });
    else if (grant.type === "named-item") section.createEl("p", { text: `Automatically granted: ${grant.quantity} ${grant.name}` });
    else if (grant.type === "currency" && grant.amount.type === "fixed") section.createEl("p", { text: `${grant.amount.value} ${grant.denomination}` });
    else if (grant.type === "currency" && entry.randomResolution?.status === "resolved") section.createEl("p", { text: `${currencyLabel(grant.denomination)}: ${entry.resolvedAmount} ${grant.denomination}` });
    else if (grant.type === "currency" && entry.randomResolution?.status === "invalid") section.createEl("p", { text: `${currencyLabel(grant.denomination)}: saved result is invalid`, cls: "dnd-creator-error" });
    else if (grant.type === "currency") {
      section.createEl("p", { text: `${currencyLabel(grant.denomination)}: Not rolled` });
      if (resolveRandomGrant !== undefined) new Setting(section).addButton((button) => button
        .setButtonText(`Roll ${currencyLabel(grant.denomination)}`)
        .setTooltip(`Resolve ${currencyLabel(grant.denomination)}`)
        .onClick(() => resolveRandomGrant(grant.id)));
    }
  }
  if (origin.levelOneGrants.length > 0) section.createEl("p", { text: `${origin.levelOneGrants.length} level-one class consequence${origin.levelOneGrants.length === 1 ? "" : "s"}.` });
  if (origin.choices.length > 0) {
    section.createEl("h5", { text: "User decisions required" });
    for (const choice of origin.choices) section.createEl("p", { text: `${choice.definition.label}: ${choice.status === "resolved" ? "resolved" : choice.status === "invalid" ? "invalid selection" : choice.candidates.length === 0 && choice.definition.type !== "closed-option" && choice.definition.type !== "ability-allocation" ? "no valid candidates" : "choose a value"}`, cls: choice.status === "resolved" ? "dnd-creator-info" : "dnd-creator-error" });
  }
  for (const diagnostic of diagnostics.filter((entry) => entry.originId === origin.origin.id && entry.code !== "stale-choice")) section.createEl("p", { text: diagnostic.message, cls: "dnd-creator-error" });
}

function currencyLabel(denomination: string): string { return denomination === "gp" ? "Starting Gold" : `Starting ${denomination.toUpperCase()}`; }
function formatEffectType(type: string): string { return type.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); }
