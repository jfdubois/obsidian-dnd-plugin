# 01 — Product Requirements

## 1. Purpose

Provide an Obsidian-native D&D character creation and management experience optimized for a narrow right sidebar and mobile use. The product must support evolving catalog content without rebuilding the plugin when new entities use already-supported normalized mechanics.

## 2. User roles

### Player

- Creates and edits characters.
- Chooses ruleset and allowed source books per character.
- Levels characters.
- Uses the character sheet during play.
- Changes HP, temporary HP, conditions, resources, spells, and equipment.

### Catalog administrator

- Maintains the local 5eTools clone.
- Runs catalog builds.
- Reviews validation reports.
- Publishes a compatible catalog revision to the Docker server.

### Developer

- Maintains catalog schema, rule engine, plugin, tests, and migrations.
- Adds support for new normalized mechanics when needed.

## 3. Functional requirements

### FR-001 Catalog connection

The plugin shall provide settings for:

- catalog base URL;
- connection test;
- manual refresh;
- refresh policy;
- cache location/limits where configurable;
- displayed catalog revision and schema compatibility status.

A successful connection test must validate the manifest shape, API version, catalog schema version, rulesets, and required entity indexes.

### FR-002 Catalog updates

The catalog administrator shall be able to update the local source clone and generate a new versioned catalog without rebuilding the plugin.

A new class, species, background, feat, spell, or item shall appear automatically when:

- the importer supports its source structure;
- it normalizes into an existing project entity schema;
- all references resolve;
- the catalog build passes;
- the plugin supports the catalog schema version.

### FR-003 Character source policy

Each character shall store:

- ruleset;
- explicitly enabled optional source IDs;
- policy mode, initially `snapshot`;
- required source dependencies derived from selected content;
- catalog revision metadata.

Core-free records shall always be eligible and shall not require selecting their containing book.

### FR-004 Character creation

The creation workflow shall use modal steps:

1. Ruleset.
2. Source profile and source books.
3. Identity.
4. Species.
5. Background.
6. Starting class.
7. Ability scores.
8. Proficiencies and languages.
9. Starting equipment.
10. Spells when applicable.
11. Review and save.

The modal shall:

- filter options by ruleset and character source policy;
- generate reusable controls from normalized, origin-owned choices and grants, rather than from step position or entity display-name exceptions;
- expose a visible `(?)` details action for each selected Species, Background, and starting Class using normalized catalog content only;
- invalidate only the changed origin's selections and their actual downstream dependents when upstream values change;
- prevent save while required choices are unresolved;
- preview derived values before save.

The visual flow may present an origin-owned choice next to its Species, Background, or Class, in a consolidated capability page, or in both places. Visual placement does not change the normalized origin, persistence identity, or invalidation behavior. External 5eTools links are supplemental and are not required for creator correctness.

### FR-005 Ability generation

Support:

- standard array;
- point buy;
- manual values;
- rolled values entered by the user.

Validation rules shall be explicit and ruleset-aware.

Base ability generation is distinct from normalized origin-derived ability effects. A player's standard-array, point-buy, manual, or entered rolled values establish authoritative base scores. A Species, Background, Class, Feat, or other normalized origin may separately grant fixed increases or an allocation choice; the derived character calculation combines the two without treating an origin allocation as another base-generation method.

### FR-006 Character persistence

Characters shall be stored as versioned JSON files in a configurable vault folder. The plugin shall list, read, create, update, rename/display, and safely remove characters.

External changes to character files shall refresh the active view through documented vault events.

### FR-007 Right-sidebar character sheet

The plugin shall register a custom `ItemView` and open it in the documented right sidebar leaf.

The view shall provide:

- identity, species, background, class, subclass, and levels;
- AC, initiative, movement, proficiency bonus, senses;
- current/max/temp HP;
- abilities, saves, skills, passive values;
- actions and attacks;
- spellcasting and spell-slot state;
- inventory/equipment;
- features and resources;
- conditions, death saves, hit dice, notes.

### FR-008 Interactive state

The sidebar shall allow commands for:

- damage and healing;
- temporary HP;
- death saves;
- feature-use consumption/restoration;
- spell-slot use/restoration;
- hit-dice use/restoration;
- conditions;
- short and long rests;
- equip/unequip and attune/unattune;
- inventory quantities and charges.

### FR-009 Derived calculations

The engine shall derive, not authoritatively store:

- ability modifiers;
- proficiency bonus;
- saving throws;
- skill totals;
- AC;
- initiative;
- max HP;
- movement;
- passive scores;
- attack rolls and damage;
- spell attack and save DC;
- maximum spell slots and feature uses.

Every important calculated total shall expose contribution traces.

### FR-010 Level-up

Level-up shall be a transaction:

1. Select class receiving a level.
2. Build a plan from catalog progression.
3. Discover newly active grants.
4. Query eligible choices using the character policy.
5. Resolve subclass, ASI/feat, proficiencies, optional features, resources, spells, and HP.
6. Preview resulting snapshot.
7. Validate.
8. Save atomically.

Only current selections are authoritative. Candidate lists and level-up plans are caches.

### FR-011 Level reduction

Level reduction shall identify and resolve:

- lost features;
- invalid choices;
- invalid spells;
- removed resources;
- subclass dependencies;
- feats or ability improvements from removed levels.

No destructive change shall be applied without a complete preview and confirmation.

### FR-012 Source policy editing

Adding a source shall expose future options but shall not automatically change the character.

Removing a source shall be blocked when selected content requires it, unless the user replaces/removes all dependencies in the same validated transaction.

### FR-013 Offline behavior

The plugin shall remain able to open existing characters when the server is unavailable if required entities are present in the local runtime cache.

The plugin shall clearly distinguish:

- online current catalog;
- cached catalog revision;
- unavailable references;
- incompatible schema.

### FR-014 Rule semantics and character-sheet projection

very normalized rule-bearing entity shall distinguish between:

- derived-value effects;
- conditional roll effects;
- defenses and immunities;
- capabilities;
- grants;
- actions;
- resources;
- display-only mechanics;
- narrative information.

Every normalized mechanical effect shall expose:

- automation status;
- source provenance;
- primary character-sheet projection;
- optional secondary character-sheet projections.

The character sheet shall project rules into the section where they are most useful during play.

Examples include:

- conditional advantage against being Poisoned in Saving Throws;
- disease immunity in Defenses;
- Sentry's Rest in Species Traits;
- armor contribution in Armor Class;
- armor-related Stealth disadvantage in Skills and Inventory.

A single effect may appear in more than one sheet section, but it shall remain one normalized effect and one derived result.

Narrative rules that are not mechanically normalized shall remain visible and shall be marked as non-automated.

## 4. Non-functional requirements

### NFR-001 Reliability

- No unresolved included catalog references.
- No partial character transactions.
- No silent selection replacement.
- Corrupt character files produce diagnostics rather than plugin failure.

### NFR-002 Performance

- Plugin startup shall not load the entire catalog.
- Initial catalog load shall use lightweight manifest/source/index files.
- Entity details shall be lazy-loaded and cached.
- Search/filtering shall operate on compact index records.

### NFR-003 Mobile compatibility

- `manifest.json` shall remain `isDesktopOnly: false` unless a formal decision changes scope.
- Plugin code shall avoid Node/Electron dependencies.
- Controls shall remain usable in a narrow sidebar and touch environment.

### NFR-004 Maintainability

- Strict TypeScript.
- Normalized schemas independent of raw source.
- Pure deterministic engine.
- Small modules and explicit service boundaries.
- Test fixtures for both rulesets.

### NFR-005 Security

- Treat the catalog response as untrusted input.
- Validate all downloaded JSON.
- Do not execute catalog-provided code or HTML.
- Sanitize/render rule text through safe rendering components.
- Do not store credentials in character files.
- Use HTTPS or a trusted VPN for remote catalog access.

### NFR-006 Content governance

- Core-free classification must be record-level.
- The local/private operator is responsible for lawful access to source content.
- The project shall not package or redistribute non-free content in plugin releases.

## 5. Product acceptance summary

The product is acceptable for initial release when a user can create a valid 2014 or 2024 level-one character, reopen it, interact with it in the right sidebar, level it while seeing only eligible source-filtered choices, and continue using it after catalog refreshes without plugin rebuilds when schemas remain compatible.
