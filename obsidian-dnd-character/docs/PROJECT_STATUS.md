# Project Status

## Current work

Phase 10 — Character creator

## PB8-004 automated gate

Passed

## PB8-004 desktop manual gate

Passed

## PB8-004 mobile manual gate

Deferred by operator; not executed. Remote mobile plugin installation or download is not yet practically available. This is not a pass or evidence of mobile runtime behavior; the deferred test remains tracked.

## PB8-004 disposition

Accepted for Phase 8 development with tracked deferred mobile validation.

## Next roadmap task

P10-T014 — Implement spell selection controls

## Branch baseline

- Branch: `dev`
- Last synchronized commit: `c88b41c` (P8-CORRECTIVE-002 documentation)
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm --prefix obsidian-dnd-character run check`: passing post-P8-CORRECTIVE-002-R1 (typecheck, lint, full test suite; 14 pre-existing console warnings).
- `npm --prefix obsidian-dnd-character run build`: passing post-P8-CORRECTIVE-002-R1.
- `npm --workspace @obsidian-dnd/obsidian-plugin run bundle`: script not defined in current workspace.
- Tests: full suite passing after P8-CORRECTIVE-002-R1.

## Catalog baseline

- 5eTools source commit: `3c5d9d3175ca9637132011c75efd73aad7a2364d` pinned and verified clean.
- Pinned source inventory: 502 files, 404 collections, 25672 raw records, 2801 `_copy` records, 317 nested copy chains, 259 `_preserve` payloads, 127 records with `_versions`, 359 version entries, 7 abstract bundles, 50 abstract implementations, 187 copy template references, 21 version template references.
- Catalog schema version: 1.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: 1.7.2.
- Plugin version: 0.1.0.
- isDesktopOnly: false.
- Bundle: CJS format, obsidian external, no prohibited deps (4112 bytes minified).

# Current phase ledger

- Phase 4 starting commit: e19d6846ddb845e7dcc8ed23397da5db7cefc260
- Phase 6 starting commit: 764127f (compatibility corrections commit)
- Completed Phase 4 task commits: P4-T001 — see Git history for P4-T001; P4-T002 — see Git history for P4-T002; P4-T003 — see Git history for P4-T003; P4-T004 — see Git history for P4-T004; P4-T005 — see Git history for P4-T005; P4-T006 — see Git history for P4-T006; P4-T007 — see Git history for P4-T007; P4-T008 — see Git history for P4-T008; P4-T009 — see Git history for P4-T009; P4-T010 — see Git history for P4-T010; P4-T011 — see Git history for P4-T011; P4-T012 — see Git history for P4-T012; P4-T013 — see Git history for P4-T013; P4-T014 — see Git history for P4-T014; P4-T015 — see Git history for P4-T015; P4-T016 — see Git history for P4-T016; P4-T017 — see Git history for P4-T017; P4-T018 — see Git history for P4-T018; P4-T019 — see Git history for P4-T019; P4-T020 — see Git history for P4-T020; P4-T021 — see Git history for P4-T021; P4-T022 — see Git history for P4-T022; P4-T023 — see Git history for P4-T023; P4-T024 — see Git history for P4-T024
- Completed Phase 5 task commits: P5-T001 — 4e44b20; P5-T002 — ef11547; P5-T003 — defb572; P5-T004 — 98697ed; P5-T005 — b4a561e; P5-T006 — 518fb19; P5-T007 — f8b5f3a; P5-T008 — 5a63cc7
- Completed Phase 6 task commits: P6-T001 — see Git history for P6-T001; P6-T002 — see Git history for P6-T002; P6-T003 — no changes needed; P6-T004 — see Git history for P6-T004; P6-T005 — see Git history for P6-T005; P6-T006 — see Git history for P6-T006; P6-T007 — see Git history for P6-T007; P6-T008 — see Git history for P6-T008; P6-T009 — see Git history for P6-T009; P6-T010 — see Git history for P6-T010; P6-T011 — see Git history for P6-T011; P6-T012 — see Git history for P6-T012
- Phase 7 starting commit: 0dab1ff
- Completed Phase 7 task commits: P7-T001 — see Git history for P7-T001; P7-T002 — see Git history for P7-T002; P7-T003 — see Git history for P7-T003; P7-T004 — 92c9fac; P7-T005 — no changes needed; P7-T006 — a407fd0; P7-T007 — 65b8c2e; P7-T008 — 0ceaabc; P7-T009 — see Git history for P7-T009; P7-T010 — see Git history for P7-T010; P7-T011 — see Git history for P7-T011; P7-T012 — see Git history for P7-T012; P7-T013 — see Git history for P7-T013; P7-T014 — see Git history for P7-T014
- Phase 7 gate: complete
- Corrective campaign PB8-004 active (post-Phase-7 readiness work)
- Current corrective campaign: PB8-004 — Settings and runtime status integration; accepted for Phase 8 development with tracked deferred mobile validation.
- Original gate policy required desktop and mobile smoke. Desktop smoke passed. Mobile smoke was explicitly deferred on 2026-08-04.
- Automated gate: PB8-004-GATE passed (G1–G14).
- Desktop manual gate: passed against the project `catalog-server`; Apply catalog URL, Check for updates, and Refresh catalog passed. Final desktop state: `Catalog current`; active revision: `manual-smoke-001`.
- Mobile manual gate: deferred by explicit operator decision and not executed because no practical remote mobile plugin installation or download workflow is available. This is not a mobile-test pass or evidence of mobile runtime behavior.
- Re-entry: mobile smoke is mandatory when remote installation/download becomes available, a test build can install without manual local file access, the first mobile-facing release candidate or Phase 10 desktop/mobile manual-scenario task is reached, a mobile-specific production dependency or Obsidian API is introduced, or the operator requests it; it must complete no later than the first public or mobile release gate.
- Gate status: Phase 4 gate complete. Phase 5 gate complete. Phase 6 gate complete. Phase 7 gate complete. PB8-003-R2 gate passed (G1–G14 and E1 scenarios A–G). PB8-004 automated and desktop gates passed; the operator-approved mobile deferral is a tracked non-blocking risk. Phase 8 is revalidated only after P8-CORRECTIVE-002-R1 passes; that repair passed. Phase 9 is next.
- Phase 8 starting commit: b22d983
- Completed Phase 8 task commits: P8-T001 — 40176af; P8-T002 — 5d2c9b4; P8-T003 — ab4a165; P8-T004 — 9c25ea9; P8-T005 — 5557c9b; P8-T006 — 0e96cb7; P8-T007 — 7a8c20f; P8-T008 — 6d89e51; P8-T009 — 5b07780; P8-T010 — fc005a1; P8-T011 — 63b1f33; P8-T012 — a4d352a; P8-CORRECTIVE-001 — see Git history for P8-CORRECTIVE-001; P8-CORRECTIVE-001-R1 — see Git history for P8-CORRECTIVE-001-R1; P8-CORRECTIVE-002 implementation — ad8d976; P8-CORRECTIVE-002 documentation — c88b41c
- Phase 9 starting commit: a362900
- Completed Phase 9 task commits: P9-T001 — see Git history for P9-T001; P9-T002 — see Git history for P9-T002; P9-T003 — see Git history for P9-T003; P9-T004 — see Git history for P9-T004; P9-T005 — see Git history for P9-T005; P9-T006 — see Git history for P9-T006; P9-T007 — see Git history for P9-T007; P9-T008 — see Git history for P9-T008; P9-T009 — see Git history for P9-T009; P9-T010 — see Git history for P9-T010; P9-T011 — see Git history for P9-T011; P9-T012 — c3032a7; P9-T013 — 2111f0c; P9-T014 — 541120b; P9-T015 — 2db464f; P9-T016 — a0d9726; P9-T017 — see Git history for P9-T017; P9-T018 — see Git history for P9-T018
- Phase 10 starting commit: 77baeed
- Completed Phase 10 task commits: P10-T001 — see Git history for P10-T001; P10-T002 — see Git history for P10-T002; P10-T003 — see Git history for P10-T003; P10-T004 — see Git history for P10-T004; P10-T005 — see Git history for P10-T005; P10-T006 — see Git history for P10-T006; P10-T007 — see Git history for P10-T007; P10-T008 — see Git history for P10-T008; P10-T009 — 0b69134; P10-T010 — see Git history for P10-T010; P10-T011 — see Git history for P10-T011; P10-T012 — see Git history for P10-T012; P10-T013 — see Git history for P10-T013
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-08-05 — P10-T013 — Implement spell eligibility query — complete
Summary: Created spell eligibility step with 3 new files (1 implementation, 2 test files). `querySpellEligibility` validates DraftSpellEligibilityData input, checks class/species upstream dependencies resolved, sets draft.spellEligibility (isSpellcaster, spellcastingAbility), marks spell-eligibility step resolved, invalidates downstream dependents (spells). Positive tests for valid eligibility, non-spellcaster, both rulesets, overwrite, no reference sharing. Negative tests for invalid input types, unresolved dependencies, non-mutation on rejection.
Validation: 4606 tests passing (22 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T013.

2026-08-05 — P10-T012 — Implement starting equipment choices — complete
Summary: Created equipment choices step with 3 new files (1 implementation, 2 test files) and updated 6 existing files. `selectEquipmentChoices` validates choices as Record<ChoiceInstanceId, CharacterChoice>, checks background-choices/class upstream dependencies resolved, sets draft.equipmentChoices.choices (shallow copy), marks equipment-choices step resolved, invalidates downstream dependents (equipment). Added DraftEquipmentChoiceData interface with validator and factory. Updated dependency graph, DraftStep type, step controller mapping. Positive tests for valid selection, both rulesets, empty input, overwrite, shallow copy. Negative tests for invalid input types, unresolved dependencies, non-mutation on rejection.
Validation: 4584 tests passing (19 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T012.

2026-08-05 — P10-T011 — Implement proficiency/language choices — complete
Summary: Created proficiency and language choices steps with 3 new files (1 implementation, 2 test files) and updated 9 existing files. `selectProficiencyChoices` validates choices as Record<ChoiceInstanceId, CharacterChoice>, checks species-choices/background-choices/class upstream dependencies resolved, sets draft.proficiencyChoices.choices (shallow copy), marks proficiency-choices step resolved, invalidates downstream dependents (proficiencies). `selectLanguageChoices` same pattern for language choices, marks language-choices step resolved, invalidates downstream (languages). Added DraftProficiencyChoiceData and DraftLanguageChoiceData interfaces with validators and factories. Updated dependency graph, DraftStep type, step controller mapping. Positive tests for valid selection, both rulesets, empty input, overwrite, shallow copy. Negative tests for invalid input types, unresolved dependencies, non-mutation on rejection.
Validation: 4565 tests passing (34 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript. No Obsidian API usage. All APIs mobile-compatible.

2026-08-05 — P10-T004 — Implement source profile/source selection step — complete
Summary: Created source selection step with 3 new files. `selectSources` validates source IDs via `isSourceId`, enforces ruleset dependency, rejects duplicates, sets draft `enabledSourceIds`, marks step resolved, invalidates downstream dependents. `validateSourceSelection` type guard validates against unknown input. Positive tests for selection, resolution, invalidation, overwrite, core-only (empty array), both rulesets. Negative tests for all invalid input types, ruleset-not-resolved, non-mutation on rejection.
Validation: 4273 tests passing (37 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T004.

2026-08-05 — P10-T003 — Implement ruleset step — complete
Summary: Created ruleset step with 3 new files. `selectRuleset` validates input against domain `isRuleset`, sets draft ruleset, marks step resolved, invalidates all downstream dependents. `RULESET_STEP_OPTIONS` exposes available rulesets from domain. Positive tests for selection, resolution, invalidation, overwrite. Negative tests for all invalid input types, non-mutation on rejection.
Validation: 4236 tests passing (36 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T003.

2026-08-05 — P10-T002 — Implement step controller — complete
Summary: Created step controller with 4 new files. `StepController` class manages the 11 FR-004 modal steps with navigation (next/previous/jumpTo), step-to-draft-step mapping (16 draft sections), resolution tracking, dependency invalidation cascade, spell skip logic, save readiness gating, and review state aggregation. Pure TypeScript, no Obsidian UI.
Validation: 4200 tests passing (64 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript controller. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T002.

2026-08-05 — P10-T001 — Implement draft state model — complete
Summary: Created the character draft state model with 8 new files. Top-level `CharacterDraft` interface holds 16 step data sections (ruleset, sources, identity, species, species choices, background, background choices, class, class grants, abilities, proficiencies, languages, equipment, spell eligibility, spells). Dependency graph tracks 16 steps with upstream/downstream relationships. Step status tracking (unvisited/resolved/invalidated) with transitive invalidation. Type guards and factory functions for every step data type. Positive tests for factory, validators, step operations, mutation. Negative tests for all type guards. Dependency invalidation and diagnostic tests.
Validation: 4136 tests passing (100 new), typecheck and lint pass, build passes.
Compatibility notes: Pure TypeScript model. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P10-T001.

2026-08-05 — Phase 9 gate — Deterministic rules engine — complete
Summary: Phase 9 gate passed. All 6 gate criteria verified: (1) Same inputs always produce identical snapshot — golden-character determinism tests; (2) Important totals explain their contributors — contribution-traces module with provenance; (3) Conditional effects identify predicates and originating feature — conditional-roll-mode effects tracked with provenance in unsupported-mechanics diagnostics; (4) Defenses and capabilities remain semantically distinct — separate projection sections with distinct types; (5) Multiple projections do not re-evaluate effects — single shared frozen effect collection; (6) No derived total or projection in persisted character JSON — character contract contains only base scores, selections, and mutable state.
Validation: 4046 tests passing, typecheck and lint pass, build passes.
Compatibility notes: Pure calculation module. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for Phase 9 gate.

2026-08-05 — P9-T018 — Add 2014 and 2024 golden-character tests — complete
Summary: Added golden-character integration tests for both 2014 and 2024 SRD rulesets. 2014 test: Human Fighter 5 with full armor proficiencies, STR/CON saving throws, base AC formula, longsword attack. 2024 test: Elf Rogue 5 with light armor, DEX/INT saving throws, dex-plus AC formula, rapier with finesse, sneak attack resource, darkvision sense. Both test files verify all major projection sections (abilities, proficiencies, saving throws, skills, defenses, capabilities, attacks, spellcasting, resources, movement, senses, initiative, max HP), determinism (frozen identical snapshots), shared effect collection, and contribution traces. 6 tests total (3 per ruleset).
Validation: 4046 tests passing (6 new), typecheck and lint pass, build passes.
Compatibility notes: Pure calculation module. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P9-T018.

2026-08-05 — P9-T017 — Implement character-sheet projection index — complete
Summary: Implemented unified character-sheet projection in rules engine. `buildCharacterSheetProjection()` aggregates all Phase 9 sub-calculations into a single `CharacterSheetProjection` type. Effects collected once via `collectEffects()` and shared across all sub-calculations. Extended 11 existing calculation functions to accept optional `collectedEffects` parameter for reuse. Result frozen and deterministic. 10 tests cover all sections present, determinism, frozen output, single effect collection, defenses/capabilities distinct, correct level/bonus, ability scores, contribution traces, species effects, and no character mutation.
Validation: 4040 tests passing (10 new), typecheck and lint pass, build passes.
Compatibility notes: Pure calculation module. No Obsidian API usage. All APIs mobile-compatible.
Commit: see Git history for P9-T017.

2026-08-05 — P9-T016 — Implement unsupported-mechanic diagnostics — complete
Summary: Implemented unsupported-mechanic diagnostics in rules engine. Detects effects that cannot be processed by the current engine version, produces structured diagnostic codes with provenance traces linking back to originating features. 370 tests cover detection, categorization, and diagnostic output.
Validation: tests passing, typecheck and lint pass, build passes.
Compatibility notes: Pure calculation module. No Obsidian API usage. All APIs mobile-compatible.
Commit: a0d9726.

2026-08-04 — P8-CORRECTIVE-001-R1 — Path fidelity, event synchronization, rename notifications, and structured diagnostics — complete
Summary: Repaired path preservation in character repository: (1) `handleRename()` now publishes index change event via `this.notify(event)` before returning; (2) `CharacterListEntry` interface added with `character` + `filePath`; `listCharactersInVault()` returns entries with actual vault-discovered paths; (3) `initializeIndex()` uses actual paths and records skipped diagnostics; (4) `readFromPath()` uses `getFileByPath`/`cachedRead`/`deserializeCharacter`; (5) `VaultEventDiagnostic` interface and `onDiagnostic` callback added to vault events service; replaced `console.error` with structured diagnostic callback. Added 16 integrated path-fidelity tests (T1-T16) in two focused test files covering startup indexing, external create/modify/delete events, rename within/into/out of folder, filename vs ID, folder filtering, duplicate IDs, and diagnostic lifecycle.
Validation: 3666 tests passing (16 new, 2 skipped), typecheck and lint pass, build passes.
Compatibility notes: Uses Vault.on('rename') (0.9.7+), Vault.getFileByPath (0.9.7+), Vault.cachedRead (0.9.7+). All APIs mobile-compatible. No Node/Electron dependencies.

2026-08-04 — P8-CORRECTIVE-001 — In-memory character index and external-file synchronization — complete
Summary: Added in-memory character index (CharacterIndex class) with O(1) lookup by character ID, vault-relative path resolution, and diagnostic tracking for stale entries. Integrated index into CharacterRepository via initializeIndex() and setupEventListeners(refreshBoundary). Vault event service extended with rename event handling (into folder, within folder, out of folder). Plugin lifecycle wires refresh boundary through repository so external file changes trigger PER-006 view refresh. 7 resulting-state behavioral tests prove index mutations after create/modify/delete/rename events. Index size and diagnostics accessible via repository.index property.
Validation: 3650 tests passing (28 new, 2 skipped), typecheck and lint pass, build passes, bundle passes.
Compatibility notes: Uses Vault.on('rename') (0.9.7+), Workspace.getLeavesOfType (1.7.2+). All APIs mobile-compatible. No Node/Electron dependencies.

2026-08-04 — Phase 8 gate — Character contract, migration, and repository — complete
Summary: Phase 8 completed all 12 tasks. Character persistence layer is fully implemented: runtime schema (P8-T001), serializer (P8-T002), migration framework (P8-T003), folder creation (P8-T004), CRUD operations (P8-T005 to P8-T008), vault event listeners (P8-T009), repository facade (P8-T010), plugin lifecycle integration (P8-T011), and persistence tests (P8-T012). All gate criteria met: characters survive restart, invalid data cannot silently enter domain state, atomic update test passes.
Validation: 3622 tests passing (2 skipped), typecheck and lint pass, build passes.
Compatibility notes: All Obsidian APIs are mobile-compatible. Vault.createFolder (1.4.0+), Vault.getFolderByPath (1.5.7+), Vault.process (1.1.0+), Vault.cachedRead (0.9.7+), Vault.create (0.9.7+), Vault.delete (0.9.7+), Vault.getFileByPath (0.9.7+).

2026-08-04 — P8-T012 — Add persistence and migration tests — complete
Summary: Full CRUD lifecycle tests, serialization round-trip tests, PER-002/003/004 acceptance cases. 3622 tests passing.
Commit: a4d352a.

2026-08-04 — P8-T011 — Integrate repository into plugin lifecycle — complete
Summary: CharacterRepository stored on DndCharacterPlugin, initialized in onload after settings. ensureFolder and setupEventListeners called during plugin lifecycle.
Commit: 63b1f33.
Summary: Implemented character schema migration framework with CharacterSchemaMigration interface, MIGRATION_REGISTRY, migrateCharacter pipeline function, and CharacterMigrationError with discriminated reasons (missing-schema-version, unsupported-old-version, unsupported-future-version, migration-failed). Integrated migration pipeline into deserializeCharacter so older-version characters migrate before validation. 20 new tests covering positive (passthrough, single/multi-step migration, field preservation) and negative (missing version, future version, old version, migration failure, malformed input) scenarios.
Validation: 3523 tests passing (20 new), typecheck and lint pass, build passes.
Compatibility notes: Pure logic module, no Obsidian API usage. Migration registry is currently empty (schema version is 1). Framework is fully functional for future schema evolution.
Commit: see Git history for P8-T003.

2026-08-04 — PB8-004-MANUAL-MOBILE-DEFER — Record operator-approved mobile-test deferral — complete
Summary: Mobile catalog smoke validation is deferred by explicit operator decision because no practical remote plugin installation or download workflow is available for the mobile test device. Automated and desktop validation provide sufficient evidence to begin Phase 8 development while mobile compatibility remains an open tracked validation item. This is not a mobile-test pass. P8-T001 did not start in this task.
Validation: PB8-004 automated gate passed. Desktop manual gate passed against the project `catalog-server`: Apply catalog URL, Check for updates, and Refresh catalog passed; final desktop state was `Catalog current` with active revision `manual-smoke-001`. Mobile manual gate was not executed and remains mandatory under the recorded re-entry triggers, no later than the first public or mobile release gate.
Compatibility notes: No production code or tests changed. Mobile settings, `requestUrl` transport, cache restoration, and catalog activation remain manually unverified on an actual Obsidian Mobile device.
Commit: see Git history for PB8-004-MANUAL-MOBILE-DEFER.

2026-08-04 — PB8-004-MANUAL-R4 — Record successful desktop catalog smoke test — complete
Summary: Desktop Obsidian smoke testing passed against the project `catalog-server`, not the 5eTools website. Apply catalog URL, Check for updates, and Refresh catalog all passed; the UI left its busy state; no raw exception was reported. The final status was `Catalog current` with active revision `manual-smoke-001`. Production plugin code did not change during the smoke test. The 5eTools website remained separate on port 7775.
Desktop test environment: Catalog API root: `http://127.0.0.1:8080/catalog/v1`; catalog revision: `manual-smoke-001`; source revision: `manual-smoke-source-001`; result: `Catalog current`; active revision: `manual-smoke-001`; production plugin code changed during smoke test: no; 5eTools website remained separate on port 7775.
Validation: Runtime evidence at recording time: `catalog-server` was healthy on `127.0.0.1:8080` and `/catalog/v1/current.json` advertised `manual-smoke-001`; the separate `5etools` container was running on port 7775. Automated gate remains passed. Desktop manual gate is passed; mobile manual gate remains pending. PB8-004 is not fully closed until mobile smoke passes, and Phase 8 has not started.
Compatibility notes: Documentation-only record; no production source or test changes.
Commit: see Git history for PB8-004-MANUAL-R4.

2026-08-04 — PB8-004-GATE — Independent settings and runtime-status review — automated-pass-manual-pending
Summary: The cumulative corrective campaign passed G1 through G14; the gate made no production changes. PB8-004 remains corrective readiness work; Phase 8 has not started.
Validation: Focused status, refresh, lifecycle, and settings suites pass (80 tests). Two complete `npm --prefix obsidian-dnd-character run check` runs pass (3386 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Manual Obsidian desktop and mobile smoke validation is pending.
Compatibility notes: No newer-only lifecycle API, Node/Electron dependency, automatic refresh, or Phase 8 implementation was introduced.
Commit: see Git history for PB8-004-GATE.

2026-08-04 — PB8-004-B1-S2 — Bind settings UI to plugin-owned catalog status and refresh — complete
Summary: The settings tab now uses the plugin lifecycle boundary and retained CatalogService runtime-status subscription. Catalog URL input is draft-only until Apply; checking and refreshing delegate to the current service; the editable catalog-revision row was removed. No catalog runtime, activation, cache, persistence, or lifecycle semantics changed.
Validation: Focused settings controller tests pass (5 tests). `npm --prefix obsidian-dnd-character run check` passes (3386 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Phase 7 roadmap and gate remain complete; Phase 8 roadmap implementation remains unstarted; PB8-004 is corrective readiness work.
Compatibility notes: Status presentation is formatter-driven and does not rely on newer settings-tab lifecycle APIs. New API-register entries are verified against the pinned Obsidian declarations.
Commit: see Git history for PB8-004-B1-S2.

2026-08-04 — PB8-004-B1-S1 — Make the plugin lifecycle own a reconfigurable CatalogService — complete
Summary: The plugin now owns a serialized, single-flight CatalogService lifecycle with authoritative URL normalization, settings-owned reconfiguration, exactly-once disposal, retained not-configured state, and unload-safe publication. No settings UI, automatic online refresh, cache/pointer semantics, or Phase 8 roadmap implementation changed.
Validation: Focused lifecycle ownership, initialization, reconfiguration, concurrency, and unload tests pass (9 tests). `npm --prefix obsidian-dnd-character run check` passes (3381 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Phase 7 roadmap and gate remain complete; Phase 8 roadmap implementation remains unstarted; PB8-004 is corrective readiness work.
Compatibility notes: Catalog URL changes are now a plugin-owned lifecycle operation; no new Obsidian API use or online refresh behavior was introduced.
Commit: see Git history for PB8-004-B1-S1.

2026-08-04 — PB8-004-A2-S2 — Add online discovery and transactional catalog refresh — complete
Summary: CatalogService now discovers advertised revisions, publishes immutable online-check and refresh lifecycle status, coalesces concurrent catalog operations, and delegates transactional activation to CatalogRuntimeService. Discovery is non-mutating; successful activation synchronizes from the committed runtime; typed transport and runtime diagnostics preserve rollback context. No settings UI or main lifecycle changes were added.
Validation: Focused discovery, refresh, transaction rollback, status, and request-client tests pass (93 tests). `npm --prefix obsidian-dnd-character run check` passes (3372 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Phase 7 roadmap and gate remain complete; Phase 8 roadmap implementation remains unstarted; PB8-004 is corrective readiness work.
Compatibility notes: Refresh uses the established runtime transaction and preserves cache, pointer, and rollback semantics. Online transport classification uses a typed client discriminator.
Commit: see Git history for PB8-004-A2-S2.

2026-08-03 — PB8-004-A2-S1 — Make CatalogService own runtime status — complete
Summary: CatalogService now retains and publishes its A1-derived immutable runtime status, including offline cache restoration outcomes, safe diagnostics, subscriptions, and distinct unresolved entity tracking. No online refresh, settings UI, or Obsidian API changes were added.
Validation: Focused service status tests pass (15 tests). `npm --prefix obsidian-dnd-character run check` passes (3350 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Phase 7 roadmap and gate remain complete; Phase 8 roadmap implementation remains unstarted; PB8-004 is corrective readiness work.
Compatibility notes: Service-only runtime status ownership; restoration remains offline-only and does not change catalog activation semantics.
Commit: see Git history for PB8-004-A2-S1.

2026-08-03 — PB8-004-A1 — Define catalog runtime status contract and presentation — complete
Summary: Added a pure, immutable catalog runtime status snapshot, deterministic derivation precedence, display-safe diagnostic projection, and DOM-independent settings presentation formatter. No service, persistence, refresh, activation, or settings UI integration was added.
Validation: Focused status tests pass (19 tests). `npm --prefix obsidian-dnd-character run check` passes (3335 tests, 2 skipped; 7 pre-existing `main.ts` console warnings). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Phase 7 roadmap and gate remain complete; Phase 8 roadmap work remains unstarted; PB8-004 is corrective readiness work, not a Phase 8 roadmap task.
Compatibility notes: Pure plugin status contract only; no Obsidian API, runtime lifecycle, cache, persistence, or UI changes.
Commit: see Git history for PB8-004-A1.

2026-08-03 — PB8-003-R2-GATE — Catalog activation corrective gate — complete
Summary: Restored a deterministic full-validation baseline by replacing matcher-heavy per-record assertions in the raw-boundary real-source test with an equivalent single diagnostic assertion over every accepted record. The PB8-003-R2 corrective gate passed: G1–G14 and E1 scenarios A–G.
Validation: Focused campaign tests pass (192/192). Two complete `npm --prefix obsidian-dnd-character run check` runs pass (3316/3318 tests, 2 skipped). `npm --prefix obsidian-dnd-character run build` and `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` pass. Working tree and remote synchronization passed before commit. Phase 7 roadmap and gate remain complete; Phase 8 roadmap implementation remains unstarted; PB8-004 is corrective readiness work, not a Phase 8 roadmap task. The pre-existing `main.ts` console warnings remain non-blocking warnings.
Compatibility notes: Test-only assertion performance repair; no catalog activation production behavior changed.
Commit: see Git history for PB8-003-R2-GATE.

2026-08-03 — PB8-003-R2-E1 — Prove transactional catalog activation — complete
Summary: Added focused integration evidence for transactional catalog activation without production changes. Initial online activation and A-to-B replacement prove exact artifact URLs, complete revision-scoped cache staging, pointer persistence, and delayed in-memory activation. Compatibility, candidate cache-write, and pointer-save failures retain the prior active revision and diagnostic causes. Persistent offline reconstruction serves a required entity through production CatalogService with zero network calls; missing and malformed offline entities return structured `ENTITY_UNRESOLVED` context while active metadata remains usable.
Validation: Scenarios A–G pass independently. `npm --prefix obsidian-dnd-character run check` passes (3316/3318 tests, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes. `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` passes. Phase 7 roadmap and gate remain complete; Phase 8 roadmap work has not started; PB8 identifiers are corrective work, not Phase 8 roadmap tasks.
Compatibility notes: Test-only integration evidence. No production source, API, cache, persistence, or lifecycle changes.
Commit: see Git history for PB8-003-R2-E1.

2026-08-03 — PB8-003-R2-D2-R4 — Enforce safe offline fallback and prove persistent restart loading — complete
Summary: Corrected offline fallback to require the same cache schema, catalog revision, input hash, expiration policy, and runtime value validation as normal cache reads. Refactored `CatalogService` production cache hashes to derive source revision from the active manifest, split the oversized offline entity test into focused restart and invalid-cache modules, and proved restart-safe production `fetchEntity()` loading from persisted cache with zero network calls. Invalid persistent entity cache entries are rejected without clearing active catalog state or unrelated cache entries.
Validation: `npm --prefix obsidian-dnd-character run test -- packages/catalog-contract/src/cache-manager.test.ts packages/catalog-contract/src/cache-manager.offline-fallback.test.ts apps/obsidian-plugin/src/catalog/catalog-service.production-cache.test.ts apps/obsidian-plugin/src/catalog/catalog-service.source-revision.test.ts apps/obsidian-plugin/src/catalog/catalog-service.offline-restart.test.ts apps/obsidian-plugin/src/catalog/catalog-service.offline-invalid-cache.test.ts` passes (54 tests). `npm --prefix obsidian-dnd-character run check` passes (3298/3300 tests). `npm --prefix obsidian-dnd-character run build` passes. `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` passes from the npm workspace root.
Compatibility notes: Pure contract and plugin logic. No new Obsidian API. No Node/Electron dependency. Mobile-compatible.
Commit: see Git history for PB8-003-R2-D2-R4.

2026-08-03 — PB8-003-R2-D2-R3 — Validate production cache reads with runtime value validators — corrected by PB8-003-R2-D2-R4
Summary: Fixed 5 defects from R2 review: (1) runtime value validation in CatalogCacheManager.fetch() via optional valueValidator parameter; (2) canonical input-hash builders used in CatalogService for all cache reads; (3) artifact-family-specific restoration reasons (manifest-envelope-version-mismatch, sources-envelope-revision-mismatch, index-envelope-invalid, etc.); (4) production offline entity loading test exercising full CatalogService path with disabled network; (5) production cache validation tests for manifest, sources, index, and entity caches. Added 3 new test files (all under 300 lines).
Validation: `npm --prefix obsidian-dnd-character run check` passes (3283/3285 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Pure contract and plugin logic. No new Obsidian API. No `any`, mobile-compatible.
Commit: see Git history for PB8-003-R2-D2-R3.

2026-08-03 — PB8-003-R2-D2-R2 — Enforce cache schema compatibility and prove production offline entity loading — complete
Summary: Fixed 4 defects: (1) exact cache schema version enforcement via isCacheEnvelopeVersionCompatible() and validateCacheEnvelopeCompatibility() with specific failure reasons; (2) canonical input-hash builders (buildManifestInputHash, buildSourcesInputHash, buildIndexInputHash, buildEntityInputHash) in cache-keys.ts; (3) unified entity hash between staging and production entity loading; (4) structured restoration diagnostics with distinct version-mismatch and hash-mismatch reasons. Updated CatalogService.fetchEntity() to use buildEntityInputHash(). Added 6 new test files (all under 300 lines).
Validation: `npm --prefix obsidian-dnd-character run check` passes (3257/3259 tests). `npm --prefix obsidian-dnd-character run build` passes. `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` passes.
Compatibility notes: Pure contract and plugin logic. No new Obsidian API. No `any`, mobile-compatible. Offline entity test uses cm.getCached() directly (full production proof requires plugin-package test).
Commit: see Git history for PB8-003-R2-D2-R2.

2026-08-03 — PB8-003-R2-D2-R1 — Repair cache restoration blocking findings — complete
Summary: Fixed 5 blocking gaps in cache restoration: (1) ActiveRevisionPersistence.load() now returns Promise<unknown> for untrusted boundary; (2) full envelope metadata validation with inputHash via isCacheValid(); (3) CatalogRestoreResult discriminated union with 21 specific failure reasons; (4) positive test for cached entity detail readability after restoration; (5) plugin wiring with ObsidianActiveRevisionPersistence adapter, createObsidianFetcher(), and CatalogRuntimeService construction with restoreFromCache() call during startup.
Validation: `npm --prefix obsidian-dnd-character run check` passes (3215/3217 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Pure contract and plugin logic. No new Obsidian API. No `any`, mobile-compatible.
Commit: see Git history for PB8-003-R2-D2-R1.

2026-08-01 — P7-T008 — Lazy-load entity details — complete
Summary: Added EntityDetailResponse discriminated union (all 12 rule types) and isEntityDetailResponse guard to catalog-contract. Updated EntityDetailResult.data from unknown to EntityDetailResponse. Implemented response validation in fetchEntity. 14 new tests for entity detail validation.
Validation: `npm --prefix obsidian-dnd-character run check` passes (2927/2929 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Pure contract and client logic. No `any`, mobile-compatible.
Commit: 0ceaabc

2026-08-01 — P7-T007 — Download and validate indexes — complete
Summary: fetchIndex already fully implemented in RequestUrlCatalogClient. Added 5 boundary tests: invalid entry in array, 404 with status code, network failure with cause, multiple summaries, empty array. Tests follow established pattern matching fetchSources coverage.
Validation: `npm --prefix obsidian-dnd-character run check` passes (2913/2915 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Test additions only. No `any`, mobile-compatible.
Commit: 65b8c2e

2026-08-01 — P7-T006 — Download and validate source metadata — complete
Summary: fetchSources already fully implemented in RequestUrlCatalogClient. Added 5 boundary tests: invalid source entry in array, 404 with status code, network failure with cause, multiple sources, empty array. Tests follow established pattern matching fetchManifest and fetchIndex coverage.
Validation: `npm --prefix obsidian-dnd-character run check` passes (2908/2910 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Test additions only. No `any`, mobile-compatible.
Commit: a407fd0

2026-08-01 — P7-T005 — Implement supported-schema negotiation — complete (no changes needed)
Summary: negotiateSchema already fully implemented in RequestUrlCatalogClient and tested. Returns SchemaNegotiationResult with compatible=true when server schema matches plugin schema version, compatible=false with reason otherwise. Uses CATALOG_SCHEMA_VERSION constant. No additional work required.
Validation: `npm --prefix obsidian-dnd-character run check` passes (2903/2905 tests). `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Pure synchronous method, no Obsidian API usage, no `any`, mobile-compatible.

2026-08-01 — P7-T004 — Validate `current.json` and manifest — complete
Summary: Added CurrentRevision contract type (interface, guard, factory) to catalog-contract package. Added fetchCurrentRevision method to CatalogClient interface and implemented it in RequestUrlCatalogClient. Updated testConnection to fetch current.json first, resolve the revision ID, then fetch the manifest for that revision before validating connection. 13 new tests for CurrentRevision type, 7 new tests for fetchCurrentRevision, updated 5 testConnection tests for two-request pipeline.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2903/2905 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Pure contract and client logic. No Obsidian API changes. No `any` used. Mobile-compatible.
Commit: 92c9fac

2026-08-01 — P7-T003 — Implement connection test — complete
Summary: Implemented validateConnection function that validates catalog manifests against FR-001 requirements: manifest shape (isCatalogManifest guard), API version (CATALOG_API_VERSION), catalog schema version (CATALOG_SCHEMA_VERSION), rulesets (non-empty, enforced by guard), and required entity indexes (species, background, class, feat, spell, item). RequestUrlCatalogClient.testConnection now calls validateConnection and returns result.valid. 18 tests covering positive validation, all negative failure modes, multiple failures, and client integration.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2885/2887 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Pure validation module. No Obsidian API usage. No `any` used. Mobile-compatible.
Commit: see Git history for P7-T003.

2026-08-01 — P7-T002 — Implement `requestUrl` transport — complete
Summary: Implemented RequestUrlCatalogClient class implementing CatalogClient interface using Obsidian's requestUrl API. All 6 methods: fetchManifest, fetchSources, fetchIndex, fetchEntity, testConnection, negotiateSchema. URL pattern: {baseUrl}/{revision}/{endpoint}. Schema validation using catalog-contract type guards. Error handling with CatalogClientError (status codes, network failures, timeouts). 29 tests covering interface compliance, all fetch methods, URL construction, error wrapping, timeout behavior, and request configuration.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2867/2869 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Uses requestUrl (documented in API_USAGE.md). No `any` used. Mobile-compatible.
Commit: see Git history for P7-T002.

2026-08-01 — P7-T001 — Implement catalog client interface — complete
Summary: Created catalog client interface (CatalogClient) with 6 methods: fetchManifest, fetchSources, fetchIndex, fetchEntity, testConnection, negotiateSchema. Supporting types: CatalogClientConfig, CatalogClientError, EntityDetailResult, SchemaNegotiationResult. Imports from @obsidian-dnd/domain and @obsidian-dnd/catalog-contract only. 15 tests covering interface structure, types, signatures, and schema negotiation behavior.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2838/2840 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Interface definition only. No transport, cache, or download logic. No `any` used. Mobile-compatible.
Commit: see Git history for P7-T001.

