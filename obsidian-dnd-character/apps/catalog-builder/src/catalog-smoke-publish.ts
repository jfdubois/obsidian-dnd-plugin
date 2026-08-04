import { createCatalogRevision } from "@obsidian-dnd/domain";
import * as path from "node:path";
import { publishCatalogRelease } from "./catalog-publisher.js";
import { createSmokeCatalogInput, SMOKE_SOURCE_REVISION } from "./smoke-catalog.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputRoot = argument("--output-root");
const revision = argument("--revision") ?? "manual-smoke-001";
if (outputRoot === undefined) {
  console.error("Missing required --output-root (for example apps/catalog-server).");
  process.exitCode = 1;
} else {
  try {
    createCatalogRevision(revision);
    const resolvedOutputRoot = path.resolve(process.env.INIT_CWD ?? process.cwd(), outputRoot);
    const input = createSmokeCatalogInput(resolvedOutputRoot, revision);
    const result = publishCatalogRelease(input);
    if (!result.success) throw new Error(result.errors.join("\n"));
    console.log(`Catalog revision: ${revision}`);
    console.log(`Source revision: ${SMOKE_SOURCE_REVISION}`);
    console.log(`Revision path: ${result.revisionPath}`);
    console.log(`Current pointer path: ${result.pointerPath}`);
    console.log(`Entities: ${input.summaries.length}`);
    console.log(`Indexes: ${input.manifest.entityKinds.length}`);
    console.log(`Total files: ${result.fileCount}`);
  } catch (error) {
    console.error(`Catalog smoke publication failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
