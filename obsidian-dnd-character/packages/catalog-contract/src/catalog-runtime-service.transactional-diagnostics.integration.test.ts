import { describe, expect, it } from "vitest";
import { CatalogCacheManager } from "./cache-manager";
import { CatalogRuntimeError } from "./catalog-runtime-error";
import { CatalogRuntimeService, type Fetcher } from "./catalog-runtime-service";
import { InMemoryCatalogCacheStore } from "./cache-store";
import { createCatalogEntitySummary } from "./entity-summary";
import { createCatalogManifest } from "./catalog-manifest";
import { createCatalogSource } from "./source-metadata";
import { KIND_INDEX_FILENAME } from "./kind-index-mapping";
import { CATALOG_SCHEMA_VERSION } from "./schema-version";
import { createCatalogRevision, createEntityId, createSourceId } from "@obsidian-dnd/domain";

const baseUrl = "https://catalog.example.test/api";
const revA = createCatalogRevision("revision-a");
const revB = createCatalogRevision("revision-b");
const kinds = ["species", "background", "class", "feat", "spell", "item"] as const;

function manifest(revision: typeof revA) {
  return createCatalogManifest({
    schemaVersion: CATALOG_SCHEMA_VERSION,
    catalogRevision: revision,
    sourceRevision: "source-001",
    builderVersion: "0.1.0",
    generatedAt: "2026-08-03T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [...kinds],
    checksums: { "manifest.json": "sha256-test" },
  });
}

const sources = [createCatalogSource({
  id: createSourceId("phb"), name: "Player's Handbook", abbreviation: "PHB",
  ruleset: "2024", category: "core",
})];

const indexes = {
  species: [createCatalogEntitySummary({
    id: createEntityId("species:human"), kind: "species", name: "Human",
    sourceId: createSourceId("phb"), ruleset: "2024", access: "core",
    legacy: false, tags: [], detailPath: "entities/species/human.json",
  })],
  background: [], class: [], feat: [], spell: [], item: [],
};

function response(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

function fetcherFor(current: typeof revA): Fetcher {
  return async (url) => {
    const expectedPrefix = `${baseUrl}/revisions/${current}/`;
    if (url === `${baseUrl}/current.json`) return response({ currentRevision: current });
    if (url === `${expectedPrefix}manifest.json`) return response(manifest(current));
    if (url === `${expectedPrefix}sources.json`) return response(sources);
    for (const kind of kinds) {
      if (url === `${expectedPrefix}indexes/${KIND_INDEX_FILENAME[kind]}`) return response(indexes[kind]);
    }
    throw new Error(`unexpected URL: ${url}`);
  };
}

describe("CatalogRuntimeService transactional diagnostics", () => {
  it("preserves the injected cache failure cause when B staging rejects after A is active", async () => {
    const store = new InMemoryCatalogCacheStore();
    const cacheFailure = new Error("simulated cache write rejection");
    const originalSet = store.set.bind(store);
    let failB = false;
    store.set = async (key, envelope) => {
      if (failB && key.includes("revision-b")) throw cacheFailure;
      await originalSet(key, envelope);
    };
    const manager = new CatalogCacheManager(store, { kind: "no-expiry" });
    let current = revA;
    const service = new CatalogRuntimeService({
      baseUrl,
      fetcher: (url) => fetcherFor(current)(url),
      cacheManager: manager,
    });

    await service.activate();
    current = revB;
    failB = true;

    let thrown: unknown;
    try {
      await service.activate();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CatalogRuntimeError);
    const error = thrown as CatalogRuntimeError;
    expect(error.revision).toBe(revB);
    expect(error.previousActiveRevision).toBe(revA);
    expect(error.recoverable).toBe(true);
    expect(Reflect.get(error, "cause")).toBe(cacheFailure);
    expect(service.revision).toBe(revA);
    expect(service.activationState).toBe("active");
  });
});
