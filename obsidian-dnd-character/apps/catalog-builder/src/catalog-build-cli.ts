import * as path from "node:path";
import { buildCatalog } from "./catalog-build.js";
import { readSourceManifest } from "./source-manifest.js";
import { createBuilderConfig } from "./config.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const clonePath = argument("--clone-path");
const outputRoot = argument("--output-root");
const rulesetArg = argument("--ruleset");

if (clonePath === undefined) {
  console.error("Missing required --clone-path (path to 5eTools clone).");
  process.exitCode = 1;
} else if (outputRoot === undefined) {
  console.error("Missing required --output-root (for example apps/catalog-server).");
  process.exitCode = 1;
} else {
  try {
    const resolvedClonePath = path.resolve(process.env.INIT_CWD ?? process.cwd(), clonePath);
    const resolvedOutputRoot = path.resolve(process.env.INIT_CWD ?? process.cwd(), outputRoot);

    // Read source manifest from git
    const sourceManifest = readSourceManifest(resolvedClonePath);

    // Build config
    const config = createBuilderConfig({
      clonePath: resolvedClonePath,
      outputPath: resolvedOutputRoot,
      includedRulesets: rulesetArg !== undefined ? [rulesetArg as "2014" | "2024"] : ["2014", "2024"],
      contentPolicy: { enabledSourceIds: [], includeCore: true },
      buildMode: "full",
    });

    // Run build
    const result = buildCatalog(config, sourceManifest);

    if (!result.publishResult.success) {
      console.error(`Catalog build failed:`);
      for (const error of result.publishResult.errors) {
        console.error(`  - ${error}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`Catalog revision: ${result.catalogRevision}`);
      console.log(`Source revision: ${result.sourceRevision}`);
      console.log(`Revision path: ${result.publishResult.revisionPath}`);
      console.log(`Current pointer path: ${result.publishResult.pointerPath}`);
      console.log(`Entities: ${result.entityCount}`);
      console.log(`Kinds: ${result.kindCount}`);
      console.log(`Total files: ${result.publishResult.fileCount}`);
      for (const diag of result.diagnostics) {
        console.log(`  ${diag}`);
      }
    }
  } catch (error) {
    console.error(`Catalog build failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
