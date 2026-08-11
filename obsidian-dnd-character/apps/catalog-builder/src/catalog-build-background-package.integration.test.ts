import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createChoiceDefinitionId, createChoiceOptionId, createEntityId } from "@obsidian-dnd/domain";
import { evaluateEquipmentQuery, type BackgroundRule, type EquipmentQuery, type ItemRule } from "@obsidian-dnd/catalog-contract";
import { buildCatalog } from "./catalog-build";
import { createBuilderConfig } from "./config";
import { createSourceManifest } from "./source-manifest";
import { createDeterministicRuleGrantId } from "./rule-grant-id";

const SOURCE_CLONE = path.resolve(process.cwd(), "../external/5etools-src");
const backgroundId = createEntityId("background:2014:phb:slice-c-package");
let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-background-package-"));
  const data = path.join(root, "data");
  fs.mkdirSync(data);
  fs.symlinkSync(path.join(SOURCE_CLONE, "data"), path.join(data, "pinned-source"), "dir");
  fs.symlinkSync(path.join(SOURCE_CLONE, "data", "books.json"), path.join(data, "books.json"), "file");
  fs.writeFileSync(path.join(data, "slice-c-background.json"), JSON.stringify({ background: [{
    name: "Slice C Package", source: "PHB",
    skillProficiencies: [{ insight: true }],
    startingEquipment: [{
      A: ["book|phb", { special: "sealed travel case", quantity: 2 }, { value: 1200 }, { equipmentType: "toolArtisan" }],
      B: [{ value: 5000 }],
    }],
    entries: [{ type: "paragraph", text: "Synthetic supported package fixture." }],
  }, {
    name: "Slice C Multi Group", source: "XPHB",
    startingEquipment: [{ A: [{ equipmentTypes: ["toolArtisan", "instrumentMusical"] }], B: [{ value: 5000 }] }],
    entries: [],
  }] }), "utf8");
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("catalog build — Background complete equipment package", () => {
  it("publishes resolved package grants and a derived nested EquipmentQuery without raw leakage", () => {
    const result = buildCatalog(createBuilderConfig({
      clonePath: root,
      outputPath: root,
      includedRulesets: ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    }), createSourceManifest({ clonePath: root, commitHash: "0123456789abcdef0123456789abcdef01234567", shortHash: "0123456", subject: "slice-c", date: "2026-08-10T00:00:00Z" }));

    expect(result.publishResult.success).toBe(true);
    const entityPath = path.join(result.publishResult.revisionPath, "entities", "background", `${backgroundId}.json`);
    const background = JSON.parse(fs.readFileSync(entityPath, "utf8")) as BackgroundRule;
    const choiceId = createChoiceDefinitionId(`${backgroundId}:equipment:0`);
    const optionAId = createChoiceOptionId(`${backgroundId}:equipment:0:A`);
    const packageChoice = background.choices.find((choice) => choice.id === choiceId);
    expect(packageChoice?.type).toBe("closed-option");
    if (packageChoice?.type !== "closed-option") return;
    const optionA = packageChoice.options.find((option) => option.id === optionAId);
    expect(optionA).toMatchObject({
      id: optionAId,
      grants: expect.arrayContaining([
        { id: createDeterministicRuleGrantId(backgroundId, "startingEquipment:0:A:0"), type: "item", itemId: createEntityId("item:2014:phb:book"), quantity: 1 },
        { id: createDeterministicRuleGrantId(backgroundId, "startingEquipment:0:A:1"), type: "named-item", name: "sealed travel case", quantity: 2 },
        { id: createDeterministicRuleGrantId(backgroundId, "startingEquipment:0:A:2"), type: "currency", denomination: "cp", amount: { type: "fixed", value: 1200 } },
      ]),
    });
    const nested = optionA?.choices.find((choice) => choice.type === "equipment");
    expect(nested).toMatchObject({ type: "equipment", optionQuery: { equipmentGroups: ["artisan-tool"] } });
    if (nested?.type !== "equipment") return;

    const itemDirectory = path.join(result.publishResult.revisionPath, "entities", "item");
    const items = fs.readdirSync(itemDirectory).map((file) => JSON.parse(fs.readFileSync(path.join(itemDirectory, file), "utf8")) as ItemRule);
    const candidates = evaluateEquipmentQuery(items, nested.optionQuery as EquipmentQuery);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((item) => item.equipmentGroups.includes("artisan-tool"))).toBe(true);

    const serialized = JSON.stringify(background);
    for (const forbidden of ["equipmentType", "equipmentTypes", "special", "fallbackName", "canonical-reference-required", "deferredEquipment", "candidates"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("maps plural source equipmentTypes to one published multi-group query", () => {
    const result = buildCatalog(createBuilderConfig({ clonePath: root, outputPath: root, includedRulesets: ["2014", "2024"], contentPolicy: { enabledSourceIds: [], includeCore: true }, buildMode: "full" }), createSourceManifest({ clonePath: root, commitHash: "0123456789abcdef0123456789abcdef01234567", shortHash: "0123456", subject: "slice-c", date: "2026-08-10T00:00:00Z" }));
    expect(result.publishResult.success).toBe(true);
    const id = createEntityId("background:2024:xphb:slice-c-multi-group");
    const background = JSON.parse(fs.readFileSync(path.join(result.publishResult.revisionPath, "entities", "background", `${id}.json`), "utf8")) as BackgroundRule;
    const closed = background.choices.find((choice) => choice.type === "closed-option");
    expect(closed?.type).toBe("closed-option");
    if (closed?.type !== "closed-option") return;
    const nested = closed.options[0]?.choices.filter((choice) => choice.type === "equipment") ?? [];
    expect(nested).toHaveLength(1);
    expect(nested[0]).toMatchObject({ optionQuery: { equipmentGroups: ["artisan-tool", "musical-instrument"] } });
  });

  it("fails the real build for a missing authoritative item reference without publishing a named fallback", () => {
    fs.writeFileSync(path.join(root, "data", "slice-c-broken-background.json"), JSON.stringify({ background: [{
      name: "Slice C Broken Reference", source: "PHB", startingEquipment: [{ _: ["missing item|phb"] }], entries: [],
    }] }), "utf8");
    const result = buildCatalog(createBuilderConfig({ clonePath: root, outputPath: root, includedRulesets: ["2014", "2024"], contentPolicy: { enabledSourceIds: [], includeCore: true }, buildMode: "full" }), createSourceManifest({ clonePath: root, commitHash: "0123456789abcdef0123456789abcdef01234567", shortHash: "0123456", subject: "slice-c", date: "2026-08-10T00:00:00Z" }));
    expect(result.publishResult.success).toBe(false);
    expect(result.publishResult.errors).toEqual(expect.arrayContaining([expect.stringContaining("missing-item") ]));
    expect(result.publishResult.errors.join(" ")).not.toContain("named-item");
  });
});
