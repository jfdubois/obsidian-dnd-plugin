import * as fs from "node:fs";
import type { CatalogSource } from "@obsidian-dnd/catalog-contract";
import { createCatalogSource } from "@obsidian-dnd/catalog-contract";
import type { Ruleset } from "@obsidian-dnd/domain";
import { createSourceId } from "@obsidian-dnd/domain";
import { RULESET_SOURCE_CLASSIFICATIONS } from "./ruleset-classifier.js";

/** Map 5eTools group names to SourceCategory values */
function mapGroupToCategory(group: string): "core" | "supplement" | "setting" | "adventure" | "other" {
  switch (group) {
    case "core":
      return "core";
    case "supplement":
    case "supplement-alt":
      return "supplement";
    case "setting":
    case "setting-alt":
      return "setting";
    case "adventure":
      return "adventure";
    default:
      return "other";
  }
}

/**
 * Load books.json from 5eTools and convert to CatalogSource[].
 * Maps 5eTools group names to SourceCategory and uses RULESET_SOURCE_CLASSIFICATIONS for ruleset.
 */
export function loadSources(booksPath: string, diagnostics: string[]): CatalogSource[] {
  const booksRaw = JSON.parse(fs.readFileSync(booksPath, "utf-8"));
  const books = booksRaw.book;
  if (!Array.isArray(books) || books.length === 0) {
    diagnostics.push("books.json contains no book entries");
    return [];
  }

  const rulesetBySource = new Map<string, Ruleset>();
  for (const classification of RULESET_SOURCE_CLASSIFICATIONS) {
    rulesetBySource.set(classification.source, classification.ruleset);
  }

  const sources: CatalogSource[] = [];
  for (const book of books) {
    const id = book.id ?? book.source;
    if (!id || typeof id !== "string") continue;

    const rawGroup = book.group ?? "other";
    const category = mapGroupToCategory(rawGroup);
    const ruleset = rulesetBySource.get(id) ?? "2014";

    const source = createCatalogSource({
      id: createSourceId(id.toLowerCase()),
      name: book.name ?? id,
      abbreviation: id.toLowerCase(),
      ruleset,
      category,
    });
    sources.push(source);
  }

  diagnostics.push(`Loaded ${sources.length} sources from books.json`);
  return sources;
}
