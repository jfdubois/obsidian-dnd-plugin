import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCatalogRevision } from "@obsidian-dnd/domain";
import { createCatalogManifest } from "@obsidian-dnd/catalog-contract";

import type { CatalogClientError } from "./client";
import { RequestUrlCatalogClient } from "./request-url-client";

const requestUrl = vi.fn();

vi.mock("obsidian", () => ({ requestUrl: (...args: unknown[]) => requestUrl(...args) }));

const revision = createCatalogRevision("rev-a");

function response(json: unknown, status = 200) {
  return {
    status,
    headers: { "content-type": "application/json" },
    arrayBuffer: new ArrayBuffer(0),
    json,
    text: JSON.stringify(json),
  };
}

function manifest() {
  return createCatalogManifest({
    schemaVersion: 2,
    catalogRevision: revision,
    sourceRevision: "source-a",
    builderVersion: "test",
    generatedAt: "2026-08-04T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [
      "species", "background", "class", "subclass", "class-feature",
      "subclass-feature", "feat", "spell", "item", "optional-feature",
      "skill", "language",
    ],
    checksums: {},
  });
}

describe("RequestUrlCatalogClient catalog API-root contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests current and manifest under the configured catalog/v1 API root", async () => {
    requestUrl
      .mockResolvedValueOnce(response({ currentRevision: "rev-a" }))
      .mockResolvedValueOnce(response(manifest()));

    const client = new RequestUrlCatalogClient({ baseUrl: "http://127.0.0.1:8080/catalog/v1" });

    await expect(client.testConnection()).resolves.toBe(true);
    expect(requestUrl).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: "http://127.0.0.1:8080/catalog/v1/current.json",
    }));
    expect(requestUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: "http://127.0.0.1:8080/catalog/v1/revisions/rev-a/manifest.json",
    }));
  });

  it.each([
    ["http://localhost:7775/", "http://localhost:7775/current.json"],
    ["http://localhost:7775/catalog", "http://localhost:7775/catalog/current.json"],
  ])("does not add a catalog path to %s", async (baseUrl, expectedUrl) => {
    requestUrl.mockResolvedValue(response({ currentRevision: "rev-a" }));

    await new RequestUrlCatalogClient({ baseUrl }).fetchCurrentRevision();

    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ url: expectedUrl }));
  });

  it("exposes a wrong API-root 404 as an actionable HTTP diagnostic", async () => {
    requestUrl.mockResolvedValue(response({ error: "not found" }, 404));
    const client = new RequestUrlCatalogClient({ baseUrl: "http://localhost:7775/catalog" });

    const error = await client.fetchCurrentRevision().catch((value: unknown) => value as CatalogClientError);

    expect(error).toMatchObject({ status: 404, message: "Request failed with status 404" });
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
      url: "http://localhost:7775/catalog/current.json",
    }));
  });
});
