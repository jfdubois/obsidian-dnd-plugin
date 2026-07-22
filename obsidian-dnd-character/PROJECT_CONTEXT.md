# Project Context

## Project name

Obsidian D&D Character Manager

## Product idea

Build a TypeScript Obsidian plugin that provides a guided D&D character builder and a mobile-oriented character sheet in the right sidebar. The user can create and maintain 2014- or 2024-rules characters, select permitted source books per character, level characters, manage spells and features, and interactively modify hit points, temporary hit points, resources, conditions, and equipment.

The workflow may use D&D Beyond as a behavioral and data-organization reference, but the project must use an original interface and an independent implementation. D&D Beyond data is not an API dependency.

## Product components

The project consists of three separately testable components:

1. **Catalog builder**
   - TypeScript command-line application.
   - Reads a pinned local clone of the 5eTools source repository.
   - Resolves 5eTools inheritance and references.
   - Normalizes source records into a stable project-owned schema.
   - Generates versioned static catalog artifacts and validation reports.

2. **Catalog server**
   - Local/private Docker service.
   - Serves generated versioned JSON over HTTP or HTTPS.
   - Does not expose the raw repository as the plugin contract.
   - May initially be a static Nginx container.

3. **Obsidian plugin**
   - TypeScript plugin based on the official sample structure.
   - Uses the documented Obsidian API only.
   - Connects to the catalog through a configurable URL.
   - Stores character source-of-truth files in the vault.
   - Stores plugin settings with `loadData` and `saveData`.
   - Stores disposable catalog and query caches separately from character files.

## Principal architecture

```text
5eTools local Git clone
        |
        v
Catalog builder
  - resolve copies and versions
  - normalize entities
  - build relations and indexes
  - validate all references
        |
        v
Versioned catalog files
        |
        v
Docker catalog server
        |
        | HTTP/HTTPS
        v
Obsidian plugin
  - per-character source policy
  - character repository
  - deterministic rule engine
  - creator and level-up modals
  - right-sidebar character sheet
```

## Primary architectural rule

The 5eTools source format is an ingestion format, not the application domain model.

The catalog builder is the only component allowed to understand raw 5eTools structures such as `_copy`, `_mod`, `_versions`, pipe-delimited references, generated relationships, or entity-specific source files.

The plugin understands only the normalized catalog contract.

## Character data rule

The character document stores:

- identity and portrait reference;
- ruleset;
- per-character content-source policy;
- classes, levels, subclass selections, and originating grants;
- selected species, background, feats, optional features, proficiencies, languages, and spells;
- inventory instances;
- mutable resources and conditions;
- explicit user overrides;
- catalog revision metadata.

The character document does not store:

- the complete class progression definition;
- every available future leveling option;
- every eligible spell;
- copied catalog entities;
- authoritative derived totals such as AC, skill totals, spell DC, or proficiency bonus.

## Cache rule

Disposable caches may store:

- catalog indexes;
- fetched entity details;
- a derived character snapshot;
- level-up plans;
- candidate option IDs;
- spell eligibility results.

Every cache entry must include the catalog revision and an input fingerprint. A cache must be safely deletable without losing character data.

## Source-book policy

Source access is character-specific.

- Free core records are always available and cannot be disabled.
- Optional source books are selected during character creation.
- Plugin settings may define reusable source profiles, but the default behavior copies the selected sources into the character as a snapshot.
- Level-up and character editing use the source policy stored in that character.
- A source currently required by a selected class, subclass, species, background, feat, spell, or item cannot be removed until dependencies are replaced or removed.

## Supported rulesets

- D&D 2014 rules.
- D&D 2024 rules.
- A character belongs to one ruleset.
- Mixed-rules characters are outside the initial scope unless a future explicit migration/design phase adds them.

## Initial release scope

The initial release must support:

- configurable catalog endpoint;
- catalog compatibility and health checks;
- per-character ruleset and source selection;
- level-one character creation;
- species, background, class, ability scores, core proficiencies, starting equipment, and basic spells where supported;
- persistent character files;
- right-sidebar character sheet;
- HP, temporary HP, conditions, equipment, and basic resources;
- level increase with newly available choices;
- deterministic recalculation of derived values;
- mobile-compatible rendering.

## Explicit non-goals for the first release

- Exact visual duplication of D&D Beyond.
- Use of D&D Beyond private APIs.
- Automatic semantic interpretation of all narrative rule text.
- Full automation of every unusual or future mechanic.
- Public redistribution of non-free source content.
- Multiplayer synchronization or campaign management.
- A general-purpose 5eTools browser.
