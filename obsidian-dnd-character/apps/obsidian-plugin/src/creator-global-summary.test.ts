import { describe, expect, it } from "vitest";
import { createChoiceDefinitionId, createChoiceInstanceId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import { createItemRule, createLanguageRule, type EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { SelectionConsequenceModel } from "./creator-consequence-service";
import { deriveCreatorGlobalSummary } from "./creator-global-summary";

const sourceId = createSourceId("summary-test");
const backgroundId = createEntityId("background:2014:phb:acolyte");
const languageId = createEntityId("language:2014:phb:sylvan");
const itemId = createEntityId("item:2014:phb:holy-symbol");

function model(): SelectionConsequenceModel {
  const definitionId = createChoiceDefinitionId("choice:acolyte:language");
  return {
    diagnostics: [], activeChoiceIds: new Set(), activeGrantIds: new Set(), origins: [{
      origin: { id: backgroundId, kind: "background", name: "Acolyte" }, effects: [], levelOneGrants: [],
      choices: [{ instanceId: createChoiceInstanceId("background:acolyte:language"), definition: { id: definitionId, label: "Choose languages", type: "language", minimum: 1, maximum: 1, repeatable: false, optionQuery: { type: "entity", kind: "language" }, prerequisites: [] }, originId: backgroundId, candidates: [], selectedValue: { type: "entity-ids", entityIds: [languageId] }, status: "resolved" }],
      grants: [
        { originId: backgroundId, provenance: "option", grant: { id: createRuleGrantId("grant:holy-symbol"), type: "item", itemId, quantity: 1 } },
        { originId: backgroundId, provenance: "option", grant: { id: createRuleGrantId("grant:vestments"), type: "named-item", name: "  Vestments  ", quantity: 1 } },
        { originId: backgroundId, provenance: "option", grant: { id: createRuleGrantId("grant:currency"), type: "currency", denomination: "cp", amount: { type: "fixed", value: 1500 } }, resolvedAmount: 1500 },
      ],
    }] as unknown as SelectionConsequenceModel["origins"],
  };
}

describe("creator global derived summaries", () => {
  it("projects origin-owned languages only on the language summary and never as equipment", () => {
    const entities: EntityDetailResponse[] = [
      createLanguageRule(languageId, "Sylvan", sourceId, "2014", "core", [], "language"),
      createItemRule(itemId, "Holy Symbol", sourceId, "2014", "core", "adventuring-gear", [], false, [], [], [], [], [], false, undefined, undefined, undefined, undefined, undefined, undefined, [], undefined, []),
    ];
    const summary = deriveCreatorGlobalSummary(model(), entities);
    expect(summary.languages).toEqual([{ label: "Sylvan", origin: "Background: Acolyte" }]);
    expect(summary.equipment).toEqual([
      { label: "Holy Symbol", quantity: 1, origin: "Background: Acolyte" },
      { label: "Vestments", quantity: 1, origin: "Background: Acolyte" },
      { label: "Starting Currency: 1500 cp", origin: "Background: Acolyte" },
    ]);
    expect(JSON.stringify(summary)).not.toContain("[object Object]");
    expect(JSON.stringify(summary)).not.toContain("background:2014:phb:acolyte:choice");
  });
});
