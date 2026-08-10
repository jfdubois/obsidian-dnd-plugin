# 02 — System Architecture

## 1. System boundaries

```text
Monorepo
├── apps/catalog-builder
├── apps/catalog-server
├── apps/obsidian-plugin
├── packages/domain
├── packages/catalog-contract
├── packages/character-contract
├── packages/rules-engine
├── packages/testing
├── docs
└── references
```

### `apps/catalog-builder`

Owns raw 5eTools ingestion. It may read the pinned Git clone from a configured filesystem path during build execution.

### `apps/catalog-server`

Serves generated files only. The first implementation should be a minimal static server, preferably Nginx in Docker. It must never normalize data at request time.

### `apps/obsidian-plugin`

Owns Obsidian lifecycle, settings, repository integration, modal and sidebar rendering, catalog client, local cache, commands, and application services.

### Shared packages

- `domain`: branded IDs, common value types, rulesets, source policy.
- `catalog-contract`: runtime schemas and TypeScript types for published catalog artifacts.
- `character-contract`: persisted character schema and migrations.
- `rules-engine`: pure calculations, validation, progression planning.
- `testing`: builders, fixtures, golden helpers.

## 2. Dependency direction

```text
catalog-builder ---> catalog-contract ---> domain
obsidian-plugin ---> catalog-contract ---> domain
obsidian-plugin ---> character-contract -> domain
obsidian-plugin ---> rules-engine -------> domain
rules-engine -----> catalog-contract
rules-engine -----> character-contract
```

Forbidden dependencies:

- `domain` importing Obsidian.
- `rules-engine` importing Obsidian or network/filesystem libraries.
- `obsidian-plugin` importing raw 5eTools DTOs.
- `catalog-contract` importing catalog-builder internals.

## 3. Catalog generation flow

```text
Raw source record
    |
    v
Raw DTO validation
    |
    v
Copy/version resolution
    |
    v
Reference parsing
    |
    v
Entity-type normalizer
    |
    v
Normalized entity validation
    |
    v
Global reference resolution
    |
    v
Indexes and relations
    |
    v
Catalog validation report
    |
    v
Atomic publication of a new revision
```

The builder must generate to a temporary directory and publish only after all validation passes.

## 4. Catalog file layout

```text
catalog/v1/
├── current.json
└── revisions/
    └── <catalog-revision>/
        ├── manifest.json
        ├── sources.json
        ├── indexes/
        │   ├── species.json
        │   ├── backgrounds.json
        │   ├── classes.json
        │   ├── subclasses.json
        │   ├── feats.json
        │   ├── spells.json
        │   ├── items.json
        │   ├── optional-features.json
        │   ├── skills.json
        │   └── languages.json
        ├── relations/
        │   ├── class-spells/
        │   ├── subclass-spells/
        │   ├── class-subclasses/
        │   └── entity-dependencies/
        ├── entities/
        │   ├── species/
        │   ├── backgrounds/
        │   ├── classes/
        │   ├── subclasses/
        │   ├── features/
        │   ├── feats/
        │   ├── spells/
        │   ├── items/
        │   └── optional-features/
        └── reports/
            ├── validation.json
            └── inventory.json
```

`current.json` contains only the active revision identifier and publication metadata. The plugin then requests immutable revision paths.

## 5. Catalog compatibility

The manifest must distinguish:

- API path version, such as `v1`;
- normalized schema version;
- catalog revision;
- source Git revision;
- builder version.

The plugin shall:

1. Fetch `current.json`.
2. Fetch the immutable revision manifest.
3. Runtime-validate it.
4. Reject unsupported schema versions.
5. Download compact indexes.
6. Validate referenced entities before activating the revision for existing characters.

## 6. Canonical IDs

IDs must be deterministic, source-aware, ruleset-aware, and type-aware.

Recommended canonical key input:

```ts
interface CanonicalEntityKey {
  kind: RuleEntityKind;
  ruleset: Ruleset;
  source: SourceId;
  name: string;
  parent?: EntityId;
  level?: number;
}
```

Readable canonical form:

```text
class:2024:xphb:fighter
class-feature:2024:xphb:fighter:1:second-wind
subclass:2014:phb:fighter:battle-master
spell:2024:xphb:fireball
```

Filesystem names may use a stable digest derived from the canonical ID to avoid path-character issues. The canonical ID remains inside the entity document.

Changing ID construction is a breaking architecture decision.

## 7. Content access classification

Every entity summary must contain:

```ts
type ContentAccess = "core" | "source";
```

The builder assigns `core` only from explicit structured source markers after inheritance/version resolution. Book category alone is insufficient.

Eligibility is:

```text
entity.ruleset matches character.ruleset
AND
(entity.access is core OR entity.sourceId is enabled/required)
```

## 8. Character runtime flow

```text
Character JSON
    +
Catalog entities and relations
    +
Current mutable state
    |
    v
Effect/grant collection
    |
    v
Deterministic derivation pipeline
    |
    v
DerivedCharacterSnapshot
    |
    v
Sidebar view
```

The derived snapshot must be reproducible and contain diagnostics and contribution traces.

## 8.0 Creator consequence architecture

The plugin/application service derives a disposable **Selection Consequence Model** from normalized catalog entities and the current creator draft. It is not a published catalog entity and is not persisted character state. For each selected origin it may expose the selected origin, automatic grants, choice definitions, resolved and unresolved selections, candidate results, diagnostics, dependencies, contextual render content, and provenance.

The normalized catalog remains authoritative for descriptions, traits/features, grants, choices, mechanics, prerequisites, dependencies, and provenance. The consequence model resolves and groups that data for creator use; it neither parses raw 5eTools data nor infers mechanics from narrative text. A missing normalized structured field is a catalog-normalization coverage defect with an actionable diagnostic, not a reason for a plugin exception or a global-step assumption.

Choice ownership follows the normalized entity, grant, and choice definition that originated it. Reusable controls render the supplied normalized choice type; they do not branch on entity names or assume that ability, language, skill, equipment, spell, or feat choices always belong to one visual step or one kind of origin. Species, Background, and starting Class may therefore produce different 2014 and 2024 consequence structures.

Changing Species, Background, or Class invalidates that origin's selections and downstream dependents; changing ruleset invalidates all incompatible selections; changing source policy invalidates selections that are no longer eligible. Independent selections remain intact. Exact dependency evaluation and transactional behavior are implementation and test responsibilities of P10-CORRECTIVE-J and P10-CORRECTIVE-M.

The existing global creator capabilities—base ability generation, proficiency/language controls, equipment controls, and spell controls—remain reusable capabilities. They are not a claim of global data ownership.

The persistence boundary is explicit:

- **Catalog authority, never copied to a character:** descriptions, traits, grant definitions, choice definitions, candidate lists, equipment-package definitions, eligible abilities, source metadata, render content, dependencies, and provenance.
- **Derived/disposable creator state:** consequence view models, candidate results, unresolved-choice summaries, UI grouping, review presentation, and consequence panels.
- **Authoritative persisted character state:** selected Species and Background IDs, selected Class state, base ability state, typed resolved choices with origin identity, materialized inventory/resources where applicable, mutable character state, and catalog compatibility metadata.

Species, Background, and Class details actions use normalized summary, safe content/render nodes, traits/features, effects/grants, choices, automation status, provenance, source, ruleset, and page where available. They do not require raw-source access. External 5eTools target identity/routing remains a separate supplemental architecture decision.

## 8.1 Semantic rule and character-sheet projection flow

Resolved source record
    |
    v
Entity-type normalizer
    |
    +--> Generic structured-field normalization
    |
    +--> Reviewed semantic mapping lookup
    |
    +--> Safe narrative render content
    |
    v
Normalized rule entity
  - effects
  - automation status
  - provenance
  - display projection
    |
    v
Rules-engine effect collection
    |
    v
Derived values, defenses, capabilities,
conditional roll effects, and contribution traces
    |
    v
Character-sheet projection index
    |
    v
Sidebar sections

The catalog builder owns semantic normalization.

The rules engine and Obsidian plugin shall not parse narrative rule text to discover mechanics.

Reviewed semantic mappings shall:

- be project-owned versioned data;
- be keyed by canonical entity or feature ID;
- be runtime-validated;
- identify their source ruleset and extraction method;
- contain normalized data only;
- never contain executable code;
- never use display-name conditionals.

An unmapped narrative rule remains available as safe render content.

A normalized effect may be projected into multiple sheet sections. Projection does not duplicate the effect, its activation state, or its contribution trace.

Sheet projections are derived data and are not persisted in the authoritative character document.

## 9. Command flow

```text
UI event
  -> typed command
  -> application service
  -> load and validate character
  -> domain validation/calculation
  -> atomic repository mutation
  -> cache invalidation
  -> recalculate snapshot
  -> publish internal event
  -> rerender active view
```

UI code must never write files or mutate persisted character state directly.

## 10. Level-up architecture

The level-up planner compares current and proposed class state and produces a non-persisted plan:

```ts
interface LevelChangePlan {
  catalogRevision: CatalogRevision;
  inputHash: string;
  characterId: CharacterId;
  classInstanceId: ClassInstanceId;
  fromLevel: number;
  toLevel: number;
  gainedGrants: ResolvedGrant[];
  lostGrants: ResolvedGrant[];
  requiredChoices: ResolvedChoiceRequest[];
  invalidSelections: InvalidSelection[];
  hpChoice?: HitPointIncreaseRequest;
  spellChanges?: SpellSelectionPlan;
  diagnostics: Diagnostic[];
}
```

The plan may be cached but is not authoritative. Saving applies the completed plan as one character transaction.

## 11. Spell eligibility architecture

Spell selection uses relations and normalized metadata, not text parsing.

Query inputs include:

- ruleset;
- class and subclass IDs;
- class and total levels;
- spellcasting progression;
- acquisition mode;
- max spell level;
- source policy;
- existing selections;
- replacement/known/prepared constraints.

The result is a list of candidate IDs plus diagnostics. Spell details are lazy-loaded.

## 12. Obsidian integration

Allowed architectural surfaces include, after verification in the pinned API definition:

- `Plugin.loadData()` and `Plugin.saveData()` for settings;
- `Plugin.registerView()`;
- `Plugin.addSettingTab()`;
- `Plugin.addCommand()`;
- `Plugin.registerEvent()`;
- `requestUrl()` for HTTP/HTTPS catalog calls;
- `ItemView` and `Modal`;
- `Workspace.getRightLeaf()` and `WorkspaceLeaf.setViewState()`;
- `Vault.createFolder()`, `create()`, `read()`, `cachedRead()`, `modify()`, `process()`, `trash()` or `delete()` as explicitly chosen;
- documented vault create/modify/delete/rename events.

Every used member must be recorded in `docs/API_USAGE.md`.

## 13. Local caches

Prefer device-local plugin cache for generated/downloaded data so vault synchronization is not polluted. The exact storage method must use documented APIs and be validated for mobile compatibility.

Cache namespaces:

```text
catalog-manifest/<revision>
catalog-index/<revision>/<kind>
entity/<revision>/<entity-id>
character-snapshot/<revision>/<character-id>/<state-hash>
eligibility/<revision>/<character-id>/<policy-hash>/<query-hash>
level-plan/<revision>/<character-id>/<state-hash>/<target>
```

## 14. Failure behavior

- Catalog unavailable: use compatible cache and show stale/offline status.
- Manifest invalid: do not activate revision.
- Schema unsupported: preserve current compatible revision and display upgrade-required status.
- Entity missing: keep character file unchanged; display unresolved reference diagnostics.
- Character invalid: isolate the file, report errors, do not crash other characters.
- Calculation unsupported: show narrative feature and an explicit automation limitation.
