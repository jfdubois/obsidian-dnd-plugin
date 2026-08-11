import { Modal } from "obsidian";
import type { App } from "obsidian";
import type { EntityDetailResponse, RenderNode } from "@obsidian-dnd/catalog-contract";
import { findFiveEToolsExternalReference, resolveFiveEToolsExternalUrl } from "./fiveetools-external-url";

/** Read-only normalized catalog context, reusable for every creator origin. */
export class CreatorCatalogDetailsModal extends Modal {
  constructor(app: App, private readonly entity: EntityDetailResponse, private readonly fiveEToolsWebBaseUrl = "") { super(app); }

  onOpen(): void {
    this.titleEl.setText(this.entity.name);
    this.contentEl.createEl("p", { text: `${this.entity.ruleset} • ${this.entity.sourceId}${this.entity.page === undefined ? "" : `, p. ${this.entity.page}`}`, cls: "dnd-creator-details-meta" });
    renderNodes(this.contentEl, this.entity.content);
    const externalUrl = resolveFiveEToolsExternalUrl(this.fiveEToolsWebBaseUrl, findFiveEToolsExternalReference("externalReferences" in this.entity ? this.entity.externalReferences : undefined));
    if (externalUrl !== undefined) {
      const link = this.contentEl.createEl("a", { text: "Open in 5eTools", href: externalUrl, cls: "dnd-creator-external-link" });
      link.setAttr("target", "_blank"); link.setAttr("rel", "noopener noreferrer");
    }
    this.contentEl.createEl("h3", { text: "Automatic consequences" });
    const effects = "effects" in this.entity ? this.entity.effects.length : 0;
    const grants = "grants" in this.entity ? this.entity.grants.length : 0;
    this.contentEl.createEl("p", { text: effects + grants === 0 ? "No catalog-defined automatic consequences." : `${effects} effect${effects === 1 ? "" : "s"}; ${grants} grant${grants === 1 ? "" : "s"}.` });
    const choices = "choices" in this.entity ? this.entity.choices.length : 0;
    if (choices > 0) this.contentEl.createEl("p", { text: `${choices} required choice definition${choices === 1 ? "" : "s"} are available in the creator.`, cls: "dnd-creator-info" });
  }

  onClose(): void { this.contentEl.empty(); }
}

export function openCreatorCatalogDetails(app: App, entity: EntityDetailResponse, fiveEToolsWebBaseUrl = ""): void { new CreatorCatalogDetailsModal(app, entity, fiveEToolsWebBaseUrl).open(); }

function renderNodes(container: HTMLElement, nodes: readonly RenderNode[]): void {
  for (const node of nodes) {
    if (node.type === "heading") container.createEl(`h${node.level}` as "h2" | "h3" | "h4", { text: node.text });
    else if (node.type === "paragraph" || node.type === "note") container.createEl("p", { text: node.text });
    else if (node.type === "dice") container.createEl("p", { text: node.label === undefined ? node.expression : `${node.label}: ${node.expression}` });
    else if (node.type === "reference") container.createEl("p", { text: node.label });
    else if (node.type === "list") { const list = container.createEl(node.ordered ? "ol" : "ul"); for (const item of node.items) { const li = list.createEl("li"); renderNodes(li, item); } }
    else { const table = container.createEl("table"); const header = table.createEl("tr"); for (const column of node.columns) header.createEl("th", { text: column }); for (const row of node.rows) { const tr = table.createEl("tr"); for (const value of row) tr.createEl("td", { text: value }); }
    }
  }
}
