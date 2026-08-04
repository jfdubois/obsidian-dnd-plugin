import {
  CatalogCacheManager,
  createCatalogEntitySummary,
  createCatalogManifest,
  createCatalogSource,
  createNoExpiryExpiration,
  createRenderParagraph,
  createSpeciesRule,
  type ActiveRevisionPersistence,
  type Fetcher,
} from ".";
import { KIND_INDEX_FILENAME } from "./kind-index-mapping";
import { buildCatalogArtifactUrl } from "./catalog-artifact-path";
import { CATALOG_SCHEMA_VERSION } from "./schema-version";
import { InMemoryCatalogCacheStore } from "./cache-store";
import { createCatalogRevision, createEntityId, createSourceId } from "@obsidian-dnd/domain";

export const integrationBaseUrl = "https://catalog.integration.test/api";
export const integrationKinds = ["species", "background", "class", "feat", "spell", "item"] as const;
export const integrationEntityId = createEntityId("species:2024:phb:human");
export const integrationDetailPath = "entities/species/human.json";
export const revisionA = createCatalogRevision("revision-a");
export const revisionB = createCatalogRevision("revision-b");

export type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(reason: unknown): void };
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  return { promise: new Promise<T>((ok, fail) => { resolve = ok; reject = fail; }), resolve, reject };
}

export function fixture(revision: typeof revisionA, schemaVersion: typeof CATALOG_SCHEMA_VERSION = CATALOG_SCHEMA_VERSION) {
  const source = createCatalogSource({ id: createSourceId("phb"), name: "PHB", abbreviation: "PHB", ruleset: "2024", category: "core" });
  const manifest = createCatalogManifest({ schemaVersion, catalogRevision: revision, sourceRevision: `source-${revision}`, builderVersion: "test", generatedAt: "2026-08-03T00:00:00Z", rulesets: ["2024"], entityKinds: [...integrationKinds], checksums: { "manifest.json": "sha256-test" } });
  const entity = createSpeciesRule(integrationEntityId, `Human ${revision}`, source.id, "2024", "core", "Medium", 30, false, [], [], [createRenderParagraph("test")], [], [], [], [], false);
  const indexes = Object.fromEntries(integrationKinds.map((kind) => [kind, kind === "species" ? [createCatalogEntitySummary({ id: integrationEntityId, kind, name: `Human ${revision}`, sourceId: source.id, ruleset: "2024", access: "core", legacy: false, tags: [], detailPath: integrationDetailPath })] : []]));
  return { manifest, sources: [source], indexes, entity };
}

export function expectedUrls(revision: typeof revisionA) {
  return [
    buildCatalogArtifactUrl(integrationBaseUrl, undefined, "current.json"),
    buildCatalogArtifactUrl(integrationBaseUrl, revision, "manifest.json"),
    buildCatalogArtifactUrl(integrationBaseUrl, revision, "sources.json"),
    ...integrationKinds.map((kind) => buildCatalogArtifactUrl(integrationBaseUrl, revision, `indexes/${KIND_INDEX_FILENAME[kind]}`)),
    buildCatalogArtifactUrl(integrationBaseUrl, revision, integrationDetailPath),
  ];
}

export function recordingFetcher(current: { value: typeof revisionA; incompatible?: boolean }, requests: string[]): Fetcher {
  return async (url) => {
    requests.push(url);
    const revision = current.value;
    const data = fixture(revision, current.incompatible === true && revision === revisionB ? 999 as never : CATALOG_SCHEMA_VERSION);
    const expected = expectedUrls(revision);
    if (!expected.includes(url)) throw new Error(`unexpected URL: ${url}`);
    const value = url.endsWith("current.json") ? { currentRevision: revision } : url.endsWith("manifest.json") ? data.manifest : url.endsWith("sources.json") ? data.sources : url.endsWith(integrationDetailPath) ? data.entity : data.indexes[integrationKinds.find((kind) => url.endsWith(KIND_INDEX_FILENAME[kind]))!];
    return { ok: true, status: 200, json: async () => value } as Response;
  };
}

export class MemoryPointer implements ActiveRevisionPersistence {
  public value: unknown = null;
  public saves: string[] = [];
  async load(): Promise<unknown> { return this.value; }
  async save(revision: typeof revisionA): Promise<void> { this.saves.push(revision); this.value = revision; }
  async clear(): Promise<void> { this.value = null; }
}

export function cacheGraph() {
  const store = new InMemoryCatalogCacheStore();
  return { store, manager: new CatalogCacheManager(store, createNoExpiryExpiration()) };
}
