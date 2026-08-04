import { describe, expect, it, vi } from "vitest";
import {
  activateAndPersist,
  createGraph,
  detailPath,
  humanId,
  keys,
  rev,
} from "./catalog-service.test-helpers";

vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));

describe("CatalogService persistent offline restart", () => {
  it("loads a cached entity through reconstructed production services", async () => {
    const backing = { data: null };
    const original = createGraph(backing);
    await activateAndPersist(original);
    await original.manager.set("entity/rev-001/species:2024:phb:elf", {
      ...(await original.manager.getCached(keys.entity()))!,
      inputHash: "src-001:species:2024:phb:elf",
    });
    await original.service.dispose();

    expect(original.runtime.revision).toBe(rev);
    expect(original.runtime.manifest?.sourceRevision).toBe("src-001");
    expect(await original.manager.getCached(keys.entity())).not.toBeNull();

    const restored = createGraph(backing, { throwOnClientFetch: true });
    await restored.store.initialize();
    const result = await restored.runtime.restoreFromCache();
    const entity = await restored.service.fetchEntity(rev, humanId, detailPath);

    expect(result.success).toBe(true);
    expect(restored.runtime.revision).toBe(rev);
    expect(restored.runtime.manifest?.catalogRevision).toBe(rev);
    expect(restored.runtime.activationState).toBe("active");
    expect(entity.data.id).toBe(humanId);
    expect(entity.data.kind).toBe("species");
    expect(restored.client.fetchEntity).not.toHaveBeenCalled();
    expect(restored.fetcher).not.toHaveBeenCalled();
    expect(await restored.manager.getCached("entity/rev-001/species:2024:phb:elf"))
      .not.toBeNull();
  });
});
