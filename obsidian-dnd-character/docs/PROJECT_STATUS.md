# Project Status

## Current phase

Phase 3 — Catalog builder ingestion foundation (IN PROGRESS)

## Last completed task

P3-T001 — Implement builder configuration

## Blockers

None recorded.

## Validation baseline

Not initialized.

## Catalog baseline

- 5eTools source commit: `3c5d9d3` pinned.
- Catalog schema version: not implemented.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: not selected.
- Plugin version: not initialized.

## Recent decisions

See `docs/08_DECISIONS_RISKS_REFERENCES.md`.

## Work log

2026-07-23 — P3-T001 — complete
Summary: Implemented builder configuration module for catalog-builder. Added BuilderConfig type with clonePath, outputPath, includedRulesets, contentPolicy (enabledSourceIds, includeCore), and buildMode. Added BuildMode type with BUILD_MODES constant and isBuildMode guard. Validator accepts unknown, narrows to BuilderConfig, validates all fields. Factory creates frozen immutable copy with immutable arrays. Default configuration provides both rulesets, core-only content, full build mode, and placeholder paths. 48 tests covering positive fixtures, negative input, factory immutability, round-trips, and defaults.
Validation: `npm run check` passes (typecheck + lint + 1188/1188 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P3-T001.
Notes: The BuilderConfig type is the foundation for all subsequent catalog-builder tasks. The contentPolicy sub-object mirrors the QueryContext structure from the domain package.

2026-07-23 — P3-T000 — complete
Summary: Extended semantic effect and sheet-projection contracts. Added AutomationStatus, SheetProjection, EffectPresentation, EffectOrigin, RuleEffectMetadata, RollType, RollMode, RollPredicate, ImmunityDefinition, and CapabilityDefinition types. Updated RuleEffect union to include metadata and two new effect variants (conditional-roll-mode, add-capability). Migrated AddImmunityEffect from damageType string to ImmunityDefinition. All 18 effect factories now accept RuleEffectMetadata. Added validators, factories, constants, guards, and 1140 tests (including 121 new tests for P3-T000). Updated normalized catalog fixture.
Validation: `npm run check` passes (typecheck + lint + 1140/1140 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P3-T000.
Notes: All effect factories now require RuleEffectMetadata as first argument. The catalog-contract package is the only consumer of these factories, so no cross-package breakage.

2026-07-23 — Phase 2 gate — complete
Summary: Verified both gate criteria. (1) Hand-authored normalized catalog fixture validates: fixture in commit c0506ed passes all catalog-contract validators (1086/1086 tests). (2) Contracts contain no raw 5eTools fields: comprehensive search of all 16 non-test source files in catalog-contract found zero raw 5eTools field names and zero imports from external/5etools-src.
Validation: `npm run check` passes (typecheck + lint + 1086/1086 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for Phase 2 gate.
Notes: Phase 2 complete. Phase 3 (Catalog builder ingestion foundation) is now open.

2026-07-23 — P2-T013 — complete
Summary: Added round-trip tests verifying factory outputs pass validators for all 6 entity/progression modules. Added invalid-input rejection tests for class-progression, entity-background, entity-feat, entity-item, entity-species, and entity-spell. 121 new tests across 6 files (819 lines). Total test count: 1086.
Validation: `npm run check` passes (typecheck + lint + 1086/1086 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P2-T013.
Notes: Round-trip tests ensure factory-produced entities always pass their own validators. Invalid-input tests cover every field in each entity type with negative values, wrong types, and boundary conditions.

2026-07-23 — P2-T012 — complete
Summary: Added CATALOG_API_VERSION and CATALOG_SCHEMA_VERSION constants in schema-version.ts. Added CatalogApiVersion branded type, isSupportedApiVersion and isSupportedSchemaVersion guard functions. Updated CatalogManifest to use CATALOG_API_VERSION constant instead of hardcoded 1. All exports added to index.ts. 22 tests covering constants, guards, and manifest integration. Total test count: 1086.
Validation: `npm run check` passes (typecheck + lint + 1086/1086 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P2-T012.
Notes: Constants are centralized for easy bumping when catalog contract evolves.

2026-07-23 — P2-T011 — complete
Summary: Implemented SpeciesRule (size, speed, darkvision, darkvisionRange, languageIds, traitDefs), BackgroundRule (skillProficiencies, featureId), FeatRule (abilityScorePrerequisite, abilityMinScore), SpellRule (school, level, castingTime, range, duration, concentration, ritual, higherLevelEffects), and ItemRule (category, rarity, cost, weight, bodySlot, properties, requiresAttunement). All extend RuleEntity base fields. Supporting types: TraitDefinition, ItemCost. Each has validator accepting unknown, factory function, and tests. 188 new tests (49+29+29+34+47). Total test count: 879.
Validation: `npm run check` passes (typecheck + lint + 879/879 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P2-T011.
Notes: SpeciesRule uses TraitDefinition for species-specific traits not fully normalized into RuleEffect. ItemRule imports EquipmentCategory, EquipmentRarity, EquipmentBodySlot from query module.

2026-07-23 — P2-T010 — complete
Summary: Implemented ClassRule, LevelDefinition, LevelGrant discriminated union (6 variants: feature, choice, subclass-choice, ability-score-improvement, spell-progression, resource-progression), SpellLevelGrant, SpellcastingProgression, and SlotsPerRest. All validators accept unknown, enforce non-negative integers, valid branded IDs, and nested array validation. Factories create immutable copies of arrays. 89 new tests covering positive fixtures for all variants, negative input for every field, type boundaries, factory immutability, and round-trips. Total test count: 686.
Validation: `npm run check` passes (typecheck + lint + 686/686 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P2-T010.
Notes: ClassRule includes all RuleEntity fields plus class-specific fields (hitDie, primaryAbilities, savingThrowProficiencies, startingChoices, levels, subclassIds, spellcasting). SpellLevelGrant includes optional slotsPerRest for pact magic and similar mechanics.

2026-07-22 — P2-T009 — complete
Summary: Implemented RuleEffect discriminated union with 16 variants (add-ability, set-ability, add-proficiency, add-expertise, add-language, set-movement, add-movement, add-sense, add-resistance, add-immunity, set-ac-formula, add-ac, grant-spell, grant-resource, grant-attack, grant-feature). Supporting types: ProficiencyRef (5 kinds), MovementMode (5 modes), SenseDefinition (5 types), ArmorClassFormula (6 types), EffectCondition (3 types), SpellGrant (4 types), ResourceDefinition with ValueFormula (4 types) and ResourceRecovery (4 types), AttackDefinition with DamageDefinition, DiceExpression, AttackRange (3 types), AttackProperty (10 strings + custom). All validators accept unknown, enforce finite numbers, non-empty strings, valid enums. Factories produce valid effects. 132 new tests covering positive fixtures for all variants, negative input for every field, type boundaries, factory immutability, and round-trips. Total test count: 597.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 597/597 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0).
Commit: Commit: see Git history for the task or gate ID.
Notes: RuleEffect is used by RuleEntity.effects. The supporting types (ProficiencyRef, SenseDefinition, ArmorClassFormula, etc.) are used by the respective effect variants. MovementMode enum is exported with constant array and guard function. The add-immunity effect uses damageType (string) rather than immunityType to match the data contract.

2026-07-22 — P2-T008 — complete
Summary: Implemented ChoiceDefinition interface with ChoiceDefinitionType enum (8 values: entity, ability, skill-proficiency, tool-proficiency, language, equipment, spell, feature). Validator accepts unknown, enforces valid ChoiceDefinitionId, non-empty label, valid type, non-negative finite minimum >= 0, finite maximum >= 1, minimum <= maximum, boolean repeatable, valid CatalogQuery for optionQuery, and array of valid RulePrerequisite. Factory creates immutable copy of prerequisites array. 51 new tests covering positive fixtures for all types, negative input for every field, type boundaries, factory immutability, and round-trips. Total test count: 465.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 465/465 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0).
Commit: Commit: see Git history for the task or gate ID.
Notes: ChoiceDefinition is used by RuleEntity.choices and ClassRule.startingChoices. The optionQuery field uses CatalogQuery from P2-T007. The prerequisites field uses RulePrerequisite from P2-T007.

2026-07-22 — P2-T007 — complete
Summary: Implemented RulePrerequisite discriminated union with 3 variants (ability-score, level, entity-selection). Validator accepts unknown, enforces non-negative finite numbers, minimum value >= 1 for ability-score and level, and valid EntityId for entity-selection. Implemented CatalogQuery discriminated union with 4 variants (entity, spell, proficiency, equipment) and supporting enums: SpellAcquisitionMode (4 values), ProficiencyQueryKind (4 values), EquipmentCategory (6 values), EquipmentRarity (6 values), EquipmentBodySlot (13 values). All enums have guard functions, constant arrays, and are exported. Factories create immutable copies of arrays. 104 new tests covering positive fixtures for all variants, negative input for every field, type boundaries, enum guards, factory immutability, and round-trips. Total test count: 414.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 414/414 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: Commit: see Git history for the task or gate ID.
Notes: The RulePrerequisite type is used by RuleEntity.prerequisites and ChoiceDefinition.prerequisites. CatalogQuery variants are used by ChoiceDefinition.optionQuery. QueryContext was already implemented in P2-T002 in the domain package.

2026-07-22 — Phase 1 gate — complete
Summary: Verified both gate criteria. (1) One root command: `npm run check` now runs typecheck, lint, and test sequentially (EXIT 0). (2) Strict compilation: tsconfig.base.json enforces strict, noImplicitReturns, noFallthroughCasesInSwitch, noUncheckedIndexedAccess, isolatedModules, forceConsistentCasingInFileNames across all 8 workspace packages.
Validation: `npm run check` passes (typecheck 8 packages + lint + 6/6 tests, EXIT 0). `npx tsc --showConfig` confirms all strict options active.
Commit: Commit: see Git history for the task or gate ID.
Notes: Phase 1 complete. Phase 2 (Domain and normalized catalog contracts) is now open.

2026-07-22 — P1-T006 — complete
Summary: Created package manifests and dependency constraints for all 8 workspace packages: packages/domain, packages/catalog-contract, packages/character-contract, packages/rules-engine, packages/testing, apps/catalog-builder, apps/obsidian-plugin, apps/catalog-server. Each package has package.json with correct dependency declarations matching 02_SYSTEM_ARCHITECTURE.md section 2, tsconfig.json extending tsconfig.base.json, and src/index.ts entry point. npm workspaces resolve the dependency graph correctly with no cycles. Forbidden dependency direction is documented in architecture doc and enforced by TypeScript module resolution (undeclared imports fail compilation).
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 6/6 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: Commit: see Git history for the task or gate ID.
Notes: The testing package depends on all other shared packages to provide builders and fixtures. The catalog-server package has no internal dependencies (Docker service, implementation deferred to Phase 5).

2026-07-22 — P1-T005 — complete
Summary: Created .github/workflows/ci.yml with GitHub Actions workflow triggered on push to main/dev and pull requests. Workflow uses ubuntu-latest, Node.js 22, npm cache, and runs npm ci, typecheck, lint, test, and build from the obsidian-dnd-character workspace directory. All five steps verified passing locally.
Validation: `npm run typecheck` passes (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes (6/6 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: Commit: see Git history for the task or gate ID.
Notes: CI will run on the next push to dev. Matrix strategy includes Node 22 only, matching the pinned engine. Docker steps and manual mobile tests are deferred to later phases.

2026-07-22 — P1-T004 — complete
Summary: Added Vitest 4.1.10 as the unit test framework with v8 coverage reporting. Created root vitest.config.ts with workspace-aware include patterns (apps/**/*.test.ts, packages/**/*.test.ts, test/**/*.test.ts). Created sample test suite (test/root.test.ts) with 6 passing tests covering basic assertions, objects, arrays, strings, and errors. Updated root package.json with test, test:watch, and test:coverage scripts. Added coverage/ and *.config.ts to ESLint ignores.
Validation: `npm run test` passes (6/6 tests, EXIT 0). `npm run test:coverage` passes (coverage enabled with v8, EXIT 0). `npm run check` passes (EXIT 0). `npm run lint` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: Root framework is ready for workspace packages. When P1-T006 creates packages, they can place .test.ts files alongside source files and inherit the root vitest config.

2026-07-22 — P1-T003 — complete
Summary: Created root ESLint configuration (eslint.config.js) using ESLint 10.7.0 flat config with typescript-eslint 8.65.0. Enabled type-aware parsing via projectService. Configured strict rules: no-explicit-any (error), no-unused-vars with _ ignore pattern (error), consistent-type-imports (error), no-floating-promises (error), no-misused-promises (error), no-console (warn). Created root tsconfig.json extending tsconfig.base.json with workspace include patterns. Updated lint script to use eslint directly with --no-error-on-unmatched-pattern for graceful empty-workspace handling. Note: eslint-plugin-obsidianmd is deferred to Phase 6 when the plugin package is scaffolded (requires manifest.json).
Validation: `npm run lint` passes (EXIT 0). `npm run check` passes (EXIT 0). End-to-end test with temporary workspace package confirmed type-aware rules detect violations.
Commit: see Git history for the task or gate ID.
Notes: Root config provides shared baseline. Workspace packages extend via projectService. The obsidianmd plugin will be added per-package in P6-T001 when the plugin scaffold is created.

2026-07-22 — P1-T002 — complete
Summary: Created tsconfig.base.json with shared strict compiler options: strict, noImplicitReturns, noFallthroughCasesInSwitch, noUncheckedIndexedAccess, isolatedModules, forceConsistentCasingInFileNames, ESNext module, ES2021 target, DOM+ES2021 lib. Added TypeScript 5.9.3 as root devDependency. Config validated via --showConfig — all strict options active and inherited correctly.
Validation: `npx tsc --showConfig` confirmed all strict options inherited. `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: Base config has no `include` field; each workspace package extends it and provides its own `include`/`files`.

2026-07-22 — P1-T001 — complete
Summary: Created root package.json with npm workspaces config (apps/*, packages/*), engine pin (Node >=22), and shared scripts (check, typecheck, lint, test, build, dev:plugin, build:catalog, docker:catalog). Created scripts/run-workspaces.mjs helper that discovers workspace directories, skips missing packages, and runs named scripts in each workspace that defines them. All root scripts exit 0 with no workspace packages present.
Validation: `npm install` completes from clean state (EXIT 0). `npm run check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass with no workspaces (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: Scripts use custom helper to avoid npm's "No workspaces found" error when workspace directories lack package.json. The helper will be replaced or simplified once P1-T006 creates package manifests.

2026-07-22 — Phase 0 gate — complete
Summary: Verified both gate criteria. (1) All source revisions reproducible: Obsidian API SHA-256 ed358aa…, sample plugin commit 23c165f with 5 file hashes, D&D Beyond fixture SHA-256 c26017d…, 5eTools commit 3c5d9d3 in SOURCE_COMMIT.txt, 17 API symbols verified in docs/API_USAGE.md. (2) No licensing ambiguity: ADR-001 through ADR-008 accepted, risk register R-001 through R-010 populated, D&D Beyond restrictions explicit, non-free content bundling prohibited, raw 5eTools isolated to catalog-builder.
Validation: manual review of all SOURCE.md files, hashes, commits, ADRs, and risk register.
Commit: see Git history for the task or gate ID.
Notes: Phase 0 complete. Phase 1 (Monorepo and quality baseline) is now open.

2026-07-22 — P0-T007 — complete
Summary: Created docs/API_USAGE.md with template header and 17 verified Obsidian API symbols extracted from pinned references/obsidian/obsidian.d.ts. Signatures include requestUrl, Plugin.registerView, Workspace.getRightLeaf, WorkspaceLeaf.setViewState, Plugin.loadData, Plugin.saveData, Vault.cachedRead, Vault.process, Plugin.addCommand, Plugin.addSettingTab, Component.onunload, Component.register, Component.registerEvent, ItemView, ViewCreator, Vault.create, and Vault.createFolder. Each entry records verified signature, @since version, purpose, and placeholder for usage file and manual test.
Validation: manual grep of pinned obsidian.d.ts confirmed all signatures and @since values.
Commit: see Git history for the task or gate ID.
Notes: requestUrl and WorkspaceLeaf.setViewState have no @since in pinned file. Vault.process requires 1.1.0+.

2026-07-22 — P0-T006 — complete
Summary: Reviewed ADR-001 through ADR-006 against AGENTS.md, PROJECT_CONTEXT.md, and data contracts. All six align with controlling documents. Added "Status: accepted" and date to each. Risk register (R-001 through R-010) already populated.
Validation: manual review of each ADR against governing documents.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P0-T005 — complete
Summary: Verified 5eTools clone at external/5etools-src. Commit 3c5d9d3 matches SOURCE.md. Created SOURCE_COMMIT.txt for builder reference.
Validation: git rev-parse HEAD matches recorded commit. diff confirms match.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P0-T004 — complete
Summary: Verified D&D Beyond fixture `character-156579226.json` exists, SHA-256 matches recorded hash. SOURCE.md documents restrictions (behavioral reference only, no production calls).
Validation: sha256sum verified fixture against recorded hash `c26017d…`.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P0-T003 — complete
Summary: Verified obsidian.d.ts SHA-256 matches recorded hash. Computed and recorded SHA-256 hashes for all 5 sample-plugin reference files. Added retrieval date to SOURCE.md.
Validation: sha256sum -c verified all 6 files against recorded hashes.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P0-T002 — complete
Summary: Added branch policy (main/release, dev/integration, P#-T### feature branches) and commit policy (Conventional Commits with scope) to Engineering SOP sections 1-2. Added policy summary to project README. Renumbered existing SOP sections.
Validation: `git branch -a` confirms `main` and `dev` exist locally and remotely.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P0-T001 — complete
Summary: Created missing `scripts/` and `fixtures/` directories with `.gitkeep`. Remaining skeleton (`apps/`, `packages/`, `docs/`, `references/`, root documents) already in place.
Validation: directory listing confirms all required top-level directories present.
Commit: see Git history for the task or gate ID.
Notes:

2026-07-22 — P2-T002 — complete
Summary: Implemented CharacterContentPolicy with ruleset, enabledSourceIds, mode (snapshot), and optional sourceProfileOrigin. Implemented QueryContext with ruleset, enabledSourceIds, requiredSourceIds, and includeCore. Both types have runtime validators accepting unknown, factory functions creating immutable copies of arrays, and helper functions (policyContainsSource, queryContextContainsSource). SourceProfileOrigin validated with non-negative finite profileRevision. 42 new tests covering factories, validators, negative inputs, helper functions, and round-trips. Total test count: 133.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 133/133 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: Ruleset type was already implemented in P2-T001. This task adds the source-policy layer built on top of the branded IDs and enum types.

2026-07-22 — P2-T001 — complete
Summary: Implemented branded ID types (EntityId, SourceId, CharacterId, CatalogRevision, ChoiceDefinitionId, ChoiceInstanceId, ClassInstanceId, ItemInstanceId, ResourceId) with factory functions, string accessors, runtime type guards, and assertion helpers. Implemented common enums (Ruleset, RuleEntityKind, Ability, ContentAccess, SourceCategory, DiagnosticSeverity) with guard functions and constant arrays. All types use strict TypeScript with no `any`. Validators accept `unknown` and narrow to branded types. 91 tests pass covering factories, accessors, validators, assertions, negative inputs, and round-trips.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 91/91 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: Branded types are structurally `string` at runtime; type safety is enforced at compile time. Runtime validators accept any non-empty string, which is correct for the initial design — canonical ID format validation will be added in later tasks when ID construction rules are finalized.

```text
YYYY-MM-DD — P#-T### — status
Summary:
Validation:
Commit:
Notes:
```

2026-07-22 — P2-T006 — complete
Summary: Implemented RenderNode discriminated union with 7 variants (paragraph, heading, list, table, reference, dice, note). Validator accepts unknown and recursively validates nested list items. Factories create immutable copies of arrays in list and table nodes. 66 tests covering positive fixtures for all variants, negative input for every field, type boundaries, and round-trip validation including deeply nested structures. Total test count: 310.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 310/310 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: The list items type is RenderNode[][] where each inner array represents one list item that may contain multiple nodes (text, nested lists, etc.). The validator rejects arbitrary HTML types — only the 7 defined variants are accepted.

2026-07-22 — P2-T005 — complete
Summary: Implemented CatalogEntitySummary type with runtime validator accepting unknown, factory function creating immutable copy of tags array, and 36 tests covering positive fixtures (all entity kinds, both rulesets, both access levels, legacy/non-legacy, empty/non-empty tags), negative input for every field, type boundaries, and round-trip validation. Reuses EntityId, SourceId, Ruleset, RuleEntityKind, and ContentAccess from domain package.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 244/244 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: The CatalogEntitySummary type follows data contract section 4 exactly. Tags must be non-empty strings (empty strings rejected). The factory creates an immutable copy of the tags array to prevent external mutation.

2026-07-22 — P2-T004 — complete
Summary: Implemented CatalogSource type with runtime validator accepting unknown, factory function, and 32 tests covering positive fixtures (all categories, both rulesets, with/without published), negative input for every field, type boundaries, and round-trip validation. Reuses SourceId, Ruleset, and SourceCategory from domain package.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 208/208 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: The CatalogSource type follows data contract section 3 exactly. The published field is optional (string | undefined). The validator rejects empty strings for published when present, allowing undefined. SourceCategory is imported from domain rather than duplicated.

2026-07-22 — P2-T003 — complete
Summary: Implemented CatalogManifest type with runtime validator accepting unknown, factory function creating immutable copies, and 43 tests covering positive fixtures, negative input for every field, type boundaries, and round-trip validation. Added declaration: true to tsconfig.base.json so workspace packages can resolve each other's types. Added varsIgnorePattern to ESLint no-unused-vars to support _prefixed destructured variables in tests.
Validation: `npm run typecheck` passes all 8 packages (EXIT 0). `npm run lint` passes (EXIT 0). `npm run test` passes 176/176 (EXIT 0). `npm run build` passes all 8 packages (EXIT 0). `npm run check` passes (EXIT 0).
Commit: see Git history for the task or gate ID.
Notes: The CatalogManifest type follows the data contract section 2 exactly. The validator enforces apiVersion === 1, schemaVersion >= 1 (integer), non-empty strings for revision/version fields, non-empty arrays for rulesets and entityKinds, and a non-null object for checksums with non-empty string keys and values.
