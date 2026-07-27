import { describe, expect, it } from "vitest";
import { loadRawJsonFiles } from "./raw-loader";
import { validateRawBoundary } from "./raw-boundary";
import { classifySourceFileRole } from "./source-file-role";

const FIVEETOOLS_PATH =
  "/home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src";

describe("classifySourceFileRole", () => {
  it("classifies pinned Foundry platform augmentation paths", () => {
    for (const path of [
      "bestiary/foundry.json",
      "class/foundry.json",
      "foundry-actions.json",
      "foundry-feats.json",
      "foundry-items.json",
      "foundry-optionalfeatures.json",
      "foundry-psionics.json",
      "foundry-races.json",
      "foundry-rewards.json",
      "foundry-vehicles.json",
      "spells/foundry.json",
    ]) {
      expect(classifySourceFileRole(path)).toMatchObject({
        role: "platform-augmentation",
        isCanonicalCopyCandidate: false,
      });
    }
  });

  it("classifies support, index, narrative, and canonical paths without entity-name branching", () => {
    expect(classifySourceFileRole("class/class-artificer.json")).toMatchObject({
      role: "canonical-content",
      isCanonicalCopyCandidate: true,
    });
    expect(classifySourceFileRole("class/index.json").role).toBe("index-or-manifest");
    expect(classifySourceFileRole("class/fluff-class-artificer.json").role).toBe("fluff-or-narrative");
    expect(classifySourceFileRole("generated/gendata-subclass-lookup.json").role).toBe("generated-support");
    expect(classifySourceFileRole("not-json.txt").role).toBe("unknown-data");
  });

  it("keeps platform augmentation present in raw-boundary inventory", () => {
    const loaded = loadRawJsonFiles(FIVEETOOLS_PATH);
    const result = validateRawBoundary(loaded.files);
    const foundry = result.validatedFiles["class/foundry.json"];

    expect(foundry).toBeDefined();
    expect(foundry?.sourceRole).toBe("platform-augmentation");
    expect(foundry?.totalRecords).toBe(589);
    expect(foundry?.collections.map((collection) => [collection.entityKind, collection.recordCount])).toEqual([
      ["class", 12],
      ["subclass", 19],
      ["classFeature", 170],
      ["subclassFeature", 388],
    ]);
    expect(result.sourceFileRoles).toContainEqual({
      sourcePath: "class/foundry.json",
      sourceRole: "platform-augmentation",
      collections: [
        { entityKind: "class", recordCount: 12 },
        { entityKind: "subclass", recordCount: 19 },
        { entityKind: "classFeature", recordCount: 170 },
        { entityKind: "subclassFeature", recordCount: 388 },
      ],
    });
  });
});
