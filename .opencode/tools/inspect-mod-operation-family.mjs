#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [, , dataRootArg, modesArg, limitArg] = process.argv;

if (!dataRootArg || !modesArg) {
  console.error("Usage: inspect-mod-operation-family.mjs <data-root> <comma-separated-modes> [examples-per-mode]");
  process.exit(2);
}

const dataRoot = path.resolve(dataRootArg);
const requestedModes = new Set(modesArg.split(",").map((value) => value.trim()).filter(Boolean));
const exampleLimit = Number.parseInt(limitArg ?? "2", 10);

if (!fs.existsSync(dataRoot) || !fs.statSync(dataRoot).isDirectory()) {
  console.error(`Data root is not a directory: ${dataRoot}`);
  process.exit(2);
}
if (!Number.isInteger(exampleLimit) || exampleLimit < 1 || exampleLimit > 5) {
  console.error("examples-per-mode must be an integer from 1 to 5");
  process.exit(2);
}

const results = new Map([...requestedModes].map((mode) => [mode, { count: 0, examples: [] }]));
let filesRead = 0;
let parseFailures = 0;

function listJsonFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listJsonFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(absolute);
  }
  return files;
}

function visit(value, jsonPath, relativeFile) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${jsonPath}[${index}]`, relativeFile));
    return;
  }
  if (!value || typeof value !== "object") return;

  if (Object.prototype.hasOwnProperty.call(value, "_mod")) {
    collectModBlock(value._mod, `${jsonPath}._mod`, relativeFile);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key !== "_mod") visit(child, `${jsonPath}.${key}`, relativeFile);
  }
}

function collectModBlock(block, jsonPath, relativeFile) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return;
  for (const [field, rawOperations] of Object.entries(block)) {
    const operations = Array.isArray(rawOperations) ? rawOperations : [rawOperations];
    operations.forEach((operation, index) => {
      if (!operation || typeof operation !== "object" || Array.isArray(operation)) return;
      const mode = operation.mode;
      if (typeof mode !== "string" || !requestedModes.has(mode)) return;
      const result = results.get(mode);
      result.count += 1;
      if (result.examples.length < exampleLimit) {
        result.examples.push({
          file: relativeFile,
          path: `${jsonPath}.${field}${operations.length > 1 ? `[${index}]` : ""}`,
          field,
          operation,
        });
      }
    });
  }
}

for (const absoluteFile of listJsonFiles(dataRoot)) {
  const relativeFile = path.relative(dataRoot, absoluteFile).split(path.sep).join("/");
  try {
    const parsed = JSON.parse(fs.readFileSync(absoluteFile, "utf8"));
    filesRead += 1;
    visit(parsed, "$", relativeFile);
  } catch (error) {
    parseFailures += 1;
    console.error(`Parse failure: ${relativeFile}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`dataRoot: ${dataRoot}`);
console.log(`jsonFilesRead: ${filesRead}`);
console.log(`jsonParseFailures: ${parseFailures}`);
console.log(`requestedModes: ${[...requestedModes].join(", ")}`);

let missing = false;
for (const mode of [...requestedModes].sort()) {
  const result = results.get(mode);
  console.log(`\n=== ${mode} ===`);
  console.log(`count: ${result.count}`);
  if (result.count === 0) missing = true;
  for (const example of result.examples) {
    console.log(JSON.stringify(example, null, 2));
  }
}

if (parseFailures > 0 || missing) process.exit(1);
