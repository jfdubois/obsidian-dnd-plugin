import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCatalogRevision, createEntityId, createSourceId } from "@obsidian-dnd/domain";
import { createRenderParagraph, createSpeciesRule } from "@obsidian-dnd/catalog-contract";
import { RequestUrlCatalogClient } from "./request-url-client";

const { requestUrl } = vi.hoisted(() => ({ requestUrl: vi.fn() }));

vi.mock("obsidian", () => ({ requestUrl }));

const baseUrl = "http://127.0.0.1:8080/catalog/v1";
const revision = createCatalogRevision("5etools-3c5d9d3-b3");

function entityResponse() {
  return {
    status: 200,
    json: createSpeciesRule(
      createEntityId("species:2014:phb:human"),
      "Human",
      createSourceId("phb"),
      "2014",
      "core",
      "Medium",
      30,
      false,
      [],
      [],
      [createRenderParagraph("test")],
      [],
      [],
      [],
      [],
      false,
    ),
  };
}

describe("RequestUrlCatalogClient detailPath transport encoding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestUrl.mockResolvedValue(entityResponse());
  });

  it.each([
    ["entities/item/item:2014:phb:silk-rope-%2850-feet%29.json", "entities/item/item%3A2014%3Aphb%3Asilk-rope-%252850-feet%2529.json"],
    ["entities/class-feature/class-feature:2014:phb:land%27s-stride.json", "entities/class-feature/class-feature%3A2014%3Aphb%3Aland%2527s-stride.json"],
  ])("encodes literal published percent escapes segment by segment for %s", async (detailPath, expectedRequestPath) => {
    await new RequestUrlCatalogClient({ baseUrl }).fetchEntity(revision, detailPath);

    const url = `${baseUrl}/revisions/5etools-3c5d9d3-b3/${expectedRequestPath}`;
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ url }));
    expect(url.split("/").slice(-3, -1)).toEqual(["entities", expectedRequestPath.split("/")[1]]);
    const requestedFilename = url.split("/").slice(-1)[0];
    const publishedFilename = detailPath.split("/").slice(-1)[0];
    expect(decodeURIComponent(requestedFilename!)).toBe(publishedFilename);
  });

  it("keeps simple detail paths equivalent and does not retain prior encoded output", async () => {
    const client = new RequestUrlCatalogClient({ baseUrl });

    await client.fetchEntity(revision, "entities/species/human.json");
    await client.fetchEntity(revision, "entities/species/human.json");

    expect(requestUrl).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: `${baseUrl}/revisions/5etools-3c5d9d3-b3/entities/species/human.json`,
    }));
    expect(requestUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: `${baseUrl}/revisions/5etools-3c5d9d3-b3/entities/species/human.json`,
    }));
  });
});
