import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App, TFile } from "obsidian";
import { createCatalogRevision, createEntityId, createRuleGrantId, createSourceId } from "@obsidian-dnd/domain";
import type { BackgroundRule, ClassRule, RuleGrant, SpeciesRule } from "@obsidian-dnd/catalog-contract";
import { createEmptyCharacterDraft, markStepResolved } from "./character-draft";
import { finalizeCharacterWithCatalog } from "./character-finalize";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";

vi.mock("obsidian", () => ({ App: class {}, Vault: class {}, TFile: class {}, TFolder: class {} }));
vi.mock("./character-folder", () => ({ ensureCharacterFolder: vi.fn().mockResolvedValue({ status: "exists" }) }));
import { createCharacterInVault } from "./character-create";

const source = createSourceId("persistence"); const speciesId = createEntityId("species:2024:persistence"); const backgroundId = createEntityId("background:2024:persistence"); const classId = createEntityId("class:2024:persistence");
const revision = createCatalogRevision("creator-persistence-test-revision");
const dice: RuleGrant = { id: createRuleGrantId("grant:persistence:dice"), type: "currency", denomination: "gp", amount: { type: "dice", count: 2, dieSides: 4, multiplier: 10 } };
function species(): SpeciesRule { return { id: speciesId, kind: "species", name: "Species", sourceId: source, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [dice], choices: [], dependencies: [], size: "Medium", speed: 30, darkvision: false, languageIds: [], traitDefs: [] }; }
function background(): BackgroundRule { return { id: backgroundId, kind: "background", name: "Background", sourceId: source, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], skillProficiencies: [] }; }
function cls(): ClassRule { return { id: classId, kind: "class", name: "Class", sourceId: source, ruleset: "2024", access: "core", legacy: false, content: [], prerequisites: [], effects: [], grants: [], choices: [], dependencies: [], hitDie: 8, primaryAbilities: [], savingThrowProficiencies: [], startingChoices: [], startingGrants: [], levels: {}, subclassIds: [] }; }
function draft() { const value = createEmptyCharacterDraft(); value.ruleset.ruleset = "2024"; value.identity.name = "Retry"; value.species.speciesId = speciesId; value.background.backgroundId = backgroundId; value.class.classId = classId; value.abilities.scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }; value.randomGrantResolutions[dice.id] = 60; for (const step of ALL_DRAFT_STEPS) markStepResolved(value, step); return value; }

describe("creator finalization persistence boundary", () => {
  let files: Record<string, string>; let create: ReturnType<typeof vi.fn>;
  beforeEach(() => { files = {}; create = vi.fn(); });
  it("does not write invalid drafts, and a failed write followed by retry uses the unchanged resolved result", async () => {
    const value = draft(); const entities = [species(), background(), cls()]; const beforeDraft = structuredClone(value); const beforeCatalog = structuredClone(entities);
    const invalid = structuredClone(value); delete invalid.randomGrantResolutions[dice.id];
    expect(finalizeCharacterWithCatalog(invalid, entities, revision)).toBeNull(); expect(create).not.toHaveBeenCalled();
    const first = finalizeCharacterWithCatalog(value, entities, revision)!; const second = finalizeCharacterWithCatalog(value, entities, revision)!;
    expect(first.currency.gp).toBe(60); expect(second.currency.gp).toBe(60); expect(first.inventory).toEqual(second.inventory);
    const vaultCreate = vi.fn().mockRejectedValueOnce(new Error("write failed")).mockImplementation(async (path: string, content: string) => { files[path] = content; return { path } as TFile; });
    const app = { vault: { getFileByPath: vi.fn(() => null), create: vaultCreate } } as unknown as App;
    const failed = await createCharacterInVault(app, first, "characters");
    expect(failed).toMatchObject({ status: "error", reason: "vault-write-failed" }); expect(vaultCreate).toHaveBeenCalledTimes(1); expect(files).toEqual({}); expect(value).toEqual(beforeDraft); expect(entities).toEqual(beforeCatalog);
    const saved = await createCharacterInVault(app, second, "characters");
    expect(saved.status).toBe("created"); expect(vaultCreate).toHaveBeenCalledTimes(2); expect(Object.values(files)[0]).toContain('"gp":60'); expect(value.randomGrantResolutions[dice.id]).toBe(60);
  });
});
