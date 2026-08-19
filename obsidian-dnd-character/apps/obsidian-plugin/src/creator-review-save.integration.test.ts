import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { App, TFile } from "obsidian";
import { createCatalogRevision, type CatalogRevision } from "@obsidian-dnd/domain";
import { deserializeCharacter, isCharacter, type Character } from "@obsidian-dnd/character-contract";
import type { EntityDetailResponse } from "@obsidian-dnd/catalog-contract";
import type { CatalogService } from "./catalog/catalog-service";
import { CharacterCreatorModal } from "./character-creator-modal";
import { CharacterCreatorRuntime } from "./character-creator-runtime";
import { CharacterRepository } from "./character-repository";
import { createEmptyCharacterDraft, isDraftComplete, markStepResolved } from "./character-draft";
import { ALL_DRAFT_STEPS } from "./character-draft-steps";
import { buildReviewSnapshot } from "./character-review-snapshot";

const revision = createCatalogRevision("5etools-test-revision-123");
const catalogRoot = new URL("../../catalog-server/catalog/v1/revisions/5etools-3c5d9d3-b3/entities/", import.meta.url);

function catalogEntity(kind: string, id: string): EntityDetailResponse {
  return JSON.parse(readFileSync(new URL(`${kind}/${id}.json`, catalogRoot), "utf8")) as EntityDetailResponse;
}

const elf = catalogEntity("species", "species:2014:phb:elf");
const acolyte = catalogEntity("background", "background:2014:phb:acolyte");
const barbarian = catalogEntity("class", "class:2014:phb:barbarian");
const celestial = catalogEntity("language", "language:2014:phb:celestial");
const draconic = catalogEntity("language", "language:2014:phb:draconic");
const holySymbol = catalogEntity("item", "item:2014:phb:holy-symbol");
const commonClothes = catalogEntity("item", "item:2014:phb:common-clothes");
const pouch = catalogEntity("item", "item:2014:phb:pouch");
const book = catalogEntity("item", "item:2014:phb:book");
const entities = [elf, acolyte, barbarian, celestial, draconic, holySymbol, commonClothes, pouch, book];

function representativeDraft() {
  const draft = createEmptyCharacterDraft();
  draft.ruleset.ruleset = "2014";
  // Match the deliberately minimal desktop identity: a (a) [a] a.
  // The filename must still derive from CharacterId, not presentation text.
  draft.identity.name = "a";
  draft.identity.playerName = "a";
  draft.identity.pronouns = "a";
  draft.identity.alignment = "a";
  draft.species.speciesId = elf.id;
  draft.background.backgroundId = acolyte.id;
  draft.class.classId = barbarian.id;
  draft.abilities.scores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  for (const step of ALL_DRAFT_STEPS) {
    if (step !== "spell-eligibility" && step !== "spells") markStepResolved(draft, step);
  }
  draft.selections[`${acolyte.id}:choice:background:2014:phb:acolyte:language:0` as never] = {
    instanceId: `${acolyte.id}:choice:background:2014:phb:acolyte:language:0` as never,
    definitionId: "background:2014:phb:acolyte:language:0" as never,
    originGrantId: acolyte.id,
    selectedValue: { type: "entity-ids", entityIds: [celestial.id, draconic.id] },
  };
  draft.selections[`${acolyte.id}:choice:background:2014:phb:acolyte:equipment:1` as never] = {
    instanceId: `${acolyte.id}:choice:background:2014:phb:acolyte:equipment:1` as never,
    definitionId: "background:2014:phb:acolyte:equipment:1" as never,
    originGrantId: acolyte.id,
    selectedValue: { type: "option-ids", optionIds: ["background:2014:phb:acolyte:equipment:1:a" as never] },
  };
  return draft;
}

function catalog(activeRevision: CatalogRevision | null = revision): CatalogService {
  return {
    getRuntimeStatus: () => activeRevision === null ? { state: "inactive" as const } : { state: "current" as const, activeRevision },
    fetchIndex: vi.fn(async (_revision: CatalogRevision, kind: string) => entities
      .filter((entity) => entity.kind === kind)
      .map((entity) => ({ id: entity.id, kind: entity.kind, name: entity.name, detailPath: String(entity.id) }))),
    fetchEntity: vi.fn(async (_revision: CatalogRevision, id: string) => ({ data: entities.find((entity) => entity.id === id)! })),
  } as unknown as CatalogService;
}

interface ModalAccess {
  controller: { setOriginConsequenceCompletion(origin: "species" | "background" | "class", complete: boolean): void; jumpTo(step: "review"): boolean; canSave(): boolean };
  handleSave(): Promise<void>;
  saveDiagnostic: { category: string; message: string } | null;
}

describe("2014 Review → Save production pipeline", () => {
  it("S0-S8 persists the active catalog revision through finalization and the vault", async () => {
    const draft = representativeDraft();
    const files: Record<string, string> = {};
    const stages: string[] = [];
    const folders = new Set<string>();
    const vaultCreate = vi.fn(async (path: string, contents: string) => {
      stages.push("S6");
      files[path] = contents;
      return { path } as TFile;
    });
    const app = { vault: {
      getFolderByPath: vi.fn((path: string) => folders.has(path) ? { path } : null),
      getFileByPath: vi.fn((path: string) => files[path] === undefined ? null : { path }),
      createFolder: vi.fn(async (path: string) => { folders.add(path); return { path }; }),
      create: vaultCreate,
      cachedRead: vi.fn(async (file: TFile) => files[file.path]!),
    }, notice: vi.fn() } as unknown as App;
    const repository = new CharacterRepository(app, "characters");
    const repositoryCreate = vi.spyOn(repository, "create");
    const runtime = new CharacterCreatorRuntime(app, repository, catalog());
    const persist = vi.fn(runtime.buildPersistenceCallback());
    const modal = new CharacterCreatorModal(app, draft, persist, catalog(), undefined, "", (stage) => stages.push(stage));
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);
    expect(access.controller.jumpTo("review")).toBe(true);
    expect(access.controller.canSave()).toBe(true);
    expect(isDraftComplete(draft)).toBe(true);
    expect(buildReviewSnapshot(draft, entities, revision)?.derived.hitPoints).toEqual({ maximum: 12, initialCurrent: 12 });
    const close = vi.spyOn(modal, "close");

    await access.handleSave();

    expect(access.saveDiagnostic).toBeNull();
    expect(repositoryCreate).toHaveBeenCalledTimes(1);
    expect(vaultCreate).toHaveBeenCalledTimes(1);
		expect(folders.has("characters")).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledOnce();
    expect(stages).toEqual(["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
    const serialized = Object.values(files)[0]!;
    expect(JSON.parse(serialized).catalog).toEqual({
      catalogSchemaVersion: 1,
      createdWithRevision: revision,
      lastValidatedRevision: revision,
    });
    const saved = deserializeCharacter(serialized);
    expect(isCharacter(saved)).toBe(true);
    expect(saved.origins).toEqual({ speciesId: elf.id, backgroundId: acolyte.id });
    expect(saved.catalog).toEqual({
      catalogSchemaVersion: 1,
      createdWithRevision: revision,
      lastValidatedRevision: revision,
    });
    expect(saved.progression.classes[0]?.classId).toBe(barbarian.id);
    expect(saved.resources.currentHp).toBe(12);
    expect(saved.spells.selections).toEqual([]);
    expect(Object.values(saved.selections).some((choice) => choice.selectedValue.type === "entity-ids" && choice.selectedValue.entityIds.includes(celestial.id))).toBe(true);
    expect(saved.currency.cp).toBe(1500);
    expect(saved.inventory.filter((item) => item.type === "catalog-item")).toHaveLength(4);
    expect(saved.inventory.filter((item) => item.type === "named-item")).toEqual(expect.arrayContaining([expect.objectContaining({ name: "sticks of incense", quantity: 5 }), expect.objectContaining({ name: "vestments", quantity: 1 })]));
    expect(JSON.stringify(saved)).not.toContain("optionQuery");
    expect(JSON.stringify(saved)).not.toContain("dieSides");
		await expect(repository.read(saved.id)).resolves.toMatchObject({ status: "read", character: saved });
  });

  it("persists the exact non-default revision from the active catalog runtime state", async () => {
    const activeRevision = createCatalogRevision("5etools-test-revision-123");
    let persisted: Character | undefined;
    const persist = vi.fn(async (character: Character) => {
      persisted = character;
      return { status: "created" as const };
    });
    const modal = new CharacterCreatorModal({} as App, representativeDraft(), persist, catalog(activeRevision));
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);

    await access.handleSave();

    expect(persist).toHaveBeenCalledOnce();
    expect(persisted?.catalog).toEqual({
      catalogSchemaVersion: 1,
      createdWithRevision: activeRevision,
      lastValidatedRevision: activeRevision,
    });
  });

  it("fails before persistence when no active catalog revision is available", async () => {
    const persist = vi.fn();
    const modal = new CharacterCreatorModal({} as App, representativeDraft(), persist, catalog(null));
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);

    await access.handleSave();

    expect(persist).not.toHaveBeenCalled();
    expect(access.saveDiagnostic).toMatchObject({ category: "catalog", message: expect.stringContaining("active catalog is unavailable") });
  });

  it("projects an authoritative finalization blocker on Review without persistence", async () => {
    const draft = representativeDraft();
    delete draft.selections[`${acolyte.id}:choice:background:2014:phb:acolyte:language:0` as never];
    const persist = vi.fn();
    const modal = new CharacterCreatorModal({} as App, draft, persist, catalog());
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);
    expect(access.controller.jumpTo("review")).toBe(true);

    await access.handleSave();

    expect(persist).not.toHaveBeenCalled();
    expect(access.saveDiagnostic).toMatchObject({ category: "creator", message: expect.stringContaining("required origin consequences") });
  });

  it("projects catalog and final-document failures without persistence", async () => {
    const persist = vi.fn();
    const brokenCatalog = catalog();
    (brokenCatalog.fetchIndex as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("offline"));
    const catalogModal = new CharacterCreatorModal({} as App, representativeDraft(), persist, brokenCatalog);
    const catalogAccess = catalogModal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) catalogAccess.controller.setOriginConsequenceCompletion(origin, true);
    expect(catalogAccess.controller.jumpTo("review")).toBe(true);
    await catalogAccess.handleSave();
    expect(persist).not.toHaveBeenCalled();
    expect(catalogAccess.saveDiagnostic).toMatchObject({ category: "catalog", message: expect.stringContaining("catalog could not be loaded") });

    const invalidDraft = representativeDraft();
    invalidDraft.equipment.items.push({} as never);
    const validationModal = new CharacterCreatorModal({} as App, invalidDraft, persist, catalog());
    const validationAccess = validationModal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) validationAccess.controller.setOriginConsequenceCompletion(origin, true);
    expect(validationAccess.controller.jumpTo("review")).toBe(true);
    await validationAccess.handleSave();
    expect(persist).not.toHaveBeenCalled();
    expect(validationAccess.saveDiagnostic).toMatchObject({ category: "validation", message: expect.stringContaining("final character document failed validation") });
  });

  it("keeps Review open on a write failure and retries without duplicating grants or rerolling", async () => {
    const persist = vi.fn()
      .mockResolvedValueOnce({ status: "failure", category: "persistence", message: "Character could not be saved because the vault write failed." })
      .mockResolvedValueOnce({ status: "created" });
    const modal = new CharacterCreatorModal({} as App, representativeDraft(), persist, catalog());
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);
    expect(access.controller.jumpTo("review")).toBe(true);
    const close = vi.spyOn(modal, "close");

    await access.handleSave();
    expect(close).not.toHaveBeenCalled();
    expect(access.saveDiagnostic).toMatchObject({ category: "persistence" });
    await access.handleSave();

    expect(persist).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    const [first, second] = persist.mock.calls.map(([character]) => character);
    expect(first.inventory).toEqual(second.inventory);
    expect(first.currency).toEqual(second.currency);
    expect(first.currency.cp).toBe(1500);
  });

  it("retries a real Vault.create failure through the runtime and leaves exactly one readable file", async () => {
    const files: Record<string, string> = {};
    const folders = new Set<string>();
    const vaultCreate = vi.fn(async (path: string, contents: string) => {
      if (vaultCreate.mock.calls.length === 1) throw new Error("disk temporarily unavailable");
      files[path] = contents;
      return { path } as TFile;
    });
    const app = { vault: {
      getFolderByPath: vi.fn((path: string) => folders.has(path) ? { path } : null),
      getFileByPath: vi.fn((path: string) => files[path] === undefined ? null : { path }),
      createFolder: vi.fn(async (path: string) => { folders.add(path); return { path }; }),
      create: vaultCreate,
      cachedRead: vi.fn(async (file: TFile) => files[file.path]!),
    }, notice: vi.fn() } as unknown as App;
    const repository = new CharacterRepository(app, "characters");
    const modal = new CharacterCreatorModal(app, representativeDraft(), new CharacterCreatorRuntime(app, repository, catalog()).buildPersistenceCallback(), catalog());
    const access = modal as unknown as ModalAccess;
    for (const origin of ["species", "background", "class"] as const) access.controller.setOriginConsequenceCompletion(origin, true);
    expect(access.controller.jumpTo("review")).toBe(true);
    const close = vi.spyOn(modal, "close");

    await access.handleSave();
    expect(access.saveDiagnostic).toMatchObject({ category: "persistence", message: expect.stringContaining("vault write failed") });
    expect(close).not.toHaveBeenCalled();
    await access.handleSave();

    expect(vaultCreate).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
    expect(Object.keys(files)).toHaveLength(1);
    const saved = deserializeCharacter(Object.values(files)[0]!);
    expect(isCharacter(saved)).toBe(true);
    expect(saved.currency.cp).toBe(1500);
    expect(saved.inventory.filter((item) => item.type === "catalog-item")).toHaveLength(4);
  });
});
