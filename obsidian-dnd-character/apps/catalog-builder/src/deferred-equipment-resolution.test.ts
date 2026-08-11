import { describe, expect, it } from "vitest";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import { createBackgroundRule, createClosedOptionChoiceDefinition, createItemRule } from "@obsidian-dnd/catalog-contract";
import { applyDeferredEquipmentIntents, resolveDeferredEquipmentIntent } from "./deferred-equipment-resolution";

const itemId = createEntityId("item:2014:phb:book");
const grantId = createRuleGrantId("grant:background:book");
const item = createItemRule(itemId, "Book", createSourceId("phb"), "2014", "core", "adventuring-gear", [], false, [], [], [], [], [], false);
const destination = { scope: "entity-grants" as const, ownerId: createEntityId("background:2014:phb:acolyte") };

describe("deferred equipment resolution", () => {
  it("requires actual ItemRule existence for authoritative references", () => {
    const resolved = resolveDeferredEquipmentIntent({ mode: "canonical-reference-required", id: grantId, quantity: 1, itemId, destination, sourcePath: "startingEquipment[0]" }, [item]);
    expect(resolved).toEqual({ ok: true, grant: { id: grantId, type: "item", itemId, quantity: 1 } });
    const missing = resolveDeferredEquipmentIntent({ mode: "canonical-reference-required", id: grantId, quantity: 1, itemId: createEntityId("item:2014:phb:missing"), destination, sourcePath: "startingEquipment[0]" }, [item]);
    expect(missing).toMatchObject({ ok: false });
  });

  it("uses only governed candidate resolution before named-item fallback and preserves ID", () => {
    const resolved = resolveDeferredEquipmentIntent({ mode: "physical-name-with-fallback", id: grantId, quantity: 2, name: "vestments", candidateItemId: itemId, destination, sourcePath: "startingEquipment[1]" }, [item]);
    expect(resolved).toEqual({ ok: true, grant: { id: grantId, type: "item", itemId, quantity: 2 } });
    const fallback = resolveDeferredEquipmentIntent({ mode: "physical-name-with-fallback", id: grantId, quantity: 2, name: "vestments", destination, sourcePath: "startingEquipment[1]" }, [item]);
    expect(fallback).toEqual({ ok: true, grant: { id: grantId, type: "named-item", name: "vestments", quantity: 2 } });
  });

  it("applies a resolved grant to the exact closed choice option without changing stable IDs", () => {
    const choiceId = createChoiceDefinitionId("choice:background:equipment");
    const optionA = createChoiceOptionId("option:background:equipment:a");
    const optionB = createChoiceOptionId("option:background:equipment:b");
    const background = createBackgroundRule(
      destination.ownerId, "Acolyte", createSourceId("phb"), "2014", "core", [], [], [], [],
      [createClosedOptionChoiceDefinition(choiceId, "Choose equipment", 1, 1, false, [
        { id: optionA, label: "A", grants: [], choices: [] },
        { id: optionB, label: "B", grants: [], choices: [] },
      ], [])], [], false,
    );
    const applied = applyDeferredEquipmentIntents([background, item], [{
      mode: "canonical-reference-required", id: grantId, quantity: 1, itemId,
      destination: { scope: "choice-option-grants", ownerId: destination.ownerId, choiceId, optionId: optionA }, sourcePath: "startingEquipment:0:A:0",
    }]);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const resolved = applied.entities.find((entity) => entity.kind === "background");
    expect(resolved?.kind).toBe("background");
    if (resolved?.kind !== "background") return;
    const choice = resolved.choices[0];
    expect(choice?.id).toBe(choiceId);
    if (choice?.type !== "closed-option") return;
    expect(choice.options[0]).toMatchObject({ id: optionA, grants: [{ id: grantId, type: "item", itemId }] });
    expect(choice.options[1]).toMatchObject({ id: optionB, grants: [] });
  });

  it("does not return entities when a canonical intent remains unresolved", () => {
    const applied = applyDeferredEquipmentIntents([item], [{
      mode: "canonical-reference-required", id: grantId, quantity: 1, itemId: createEntityId("item:2014:phb:missing"), destination, sourcePath: "startingEquipment:0",
    }]);
    expect(applied).toMatchObject({ ok: false, messages: [expect.stringContaining("did not resolve")] });
  });
});
