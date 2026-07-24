import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const inputRoot = process.argv[2];
if (!inputRoot) {
  console.error("Usage: node .opencode/tools/inspect-mod-operations.mjs <data-root>");
  process.exit(2);
}

const root = resolve(inputRoot);
const counts = new Map();
const examples = new Map();
let filesRead = 0;
let parseFailures = 0;
let modBlocks = 0;

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile() && extname(entry.name) === ".json") yield path;
  }
}

function recordOperation(mode, payload, file, objectPath, field) {
  counts.set(mode, (counts.get(mode) ?? 0) + 1);
  if (!examples.has(mode)) {
    examples.set(mode, {
      file: relative(root, file),
      objectPath,
      field,
      payload,
    });
  }
}

function inspectModValue(value, file, objectPath) {
  modBlocks += 1;
  if (!value || typeof value !== "object" || Array.isArray(value)) return;

  for (const [field, operationValue] of Object.entries(value)) {
    const operations = Array.isArray(operationValue) ? operationValue : [operationValue];
    for (const operation of operations) {
      if (!operation || typeof operation !== "object" || Array.isArray(operation)) continue;
      const mode = operation.mode;
      if (typeof mode === "string") {
        recordOperation(mode, operation, file, objectPath, field);
      }
    }
  }
}

function visit(value, file, objectPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, file, `${objectPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${objectPath}.${key}`;
    if (key === "_mod") inspectModValue(child, file, childPath);
    visit(child, file, childPath);
  }
}

for await (const file of walk(root)) {
  filesRead += 1;
  try {
    visit(JSON.parse(await readFile(file, "utf8")), file);
  } catch {
    parseFailures += 1;
  }
}

console.log(`dataRoot: ${root}`);
console.log(`jsonFilesRead: ${filesRead}`);
console.log(`jsonParseFailures: ${parseFailures}`);
console.log(`modBlocksFound: ${modBlocks}`);
console.log("operations:");

const modes = [...counts.keys()].sort((a, b) => a.localeCompare(b));
for (const mode of modes) {
  const example = examples.get(mode);
  console.log(`- mode: ${mode}`);
  console.log(`  count: ${counts.get(mode)}`);
  console.log(`  file: ${example.file}`);
  console.log(`  path: ${example.objectPath}`);
  console.log(`  field: ${example.field}`);
  console.log(`  example: ${JSON.stringify(example.payload)}`);
}
