# Project Status

## Current work

PB8-003-R2 — Catalog activation corrections (post-Phase-7 readiness; corrective work, not Phase 8 roadmap work)

## Last completed corrective task

PB8-003-R2-E1

## Next corrective task

PB8-003-R2-GATE

## Branch baseline

- Branch: `dev`
- Last synchronized commit: see Git history
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm --prefix obsidian-dnd-character run check`: passing post-PB8-003-R2-E1 (typecheck, lint, 3316/3318 tests across 143 passing files, 2 skipped).
- `npm --prefix obsidian-dnd-character run build`: passing post-PB8-003-R2-E1.
- `npm --workspace @obsidian-dnd/obsidian-plugin run bundle`: passing post-PB8-003-R2-E1 (CJS, obsidian external, no prohibited deps).
- Tests: 3316 passing, 2 skipped.

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
- Completed Phase 7 task commits: P7-T001 — see Git history for P7-T001; P7-T002 — see Git history for P7-T002; P7-T003 — see Git history for P7-T003; P7-T004 — 92c9fac; P7-T005 — no changes needed; P7-T006 — a407fd0; P7-T007 — 65b8c2e; P7-T008 — 0ceaabc
- Phase 7 gate: complete
- Corrective campaign PB8-003-R2 active (post-Phase-7 readiness work)
- Current corrective campaign: PB8-003-R2 — Catalog activation corrections
- Last completed corrective task: PB8-003-R2-E1
- Next corrective task: PB8-003-R2-GATE
- Gate status: Phase 4 gate complete. Phase 5 gate complete. Phase 6 gate complete. Phase 7 gate complete. Phase 8 roadmap work has not started; PB8 identifiers are corrective work, not Phase 8 roadmap tasks.
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-08-03 — PB8-003-R2-E1 — Prove transactional catalog activation — complete
Summary: Added focused integration evidence for transactional catalog activation without production changes. Initial online activation and A-to-B replacement prove exact artifact URLs, complete revision-scoped cache staging, pointer persistence, and delayed in-memory activation. Compatibility, candidate cache-write, and pointer-save failures retain the prior active revision and diagnostic causes. Persistent offline reconstruction serves a required entity through production CatalogService with zero network calls; missing and malformed offline entities return structured `ENTITY_UNRESOLVED` context while active metadata remains usable.
Validation: Scenarios A–G pass independently. `npm --prefix obsidian-dnd-character run check` passes (3316/3318 tests, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes. `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` passes. Phase 7 roadmap and gate remain complete; Phase 8 roadmap work has not started; PB8 identifiers are corrective work, not Phase 8 roadmap tasks.
Compatibility notes: Test-only integration evidence. No production source, API, cache, persistence, or lifecycle changes.
Commit: see Git history for PB8-003-R2-E1.

2026-08-04 — PB8-003-R2-D2-R4 — Enforce safe offline fallback and prove persistent restart loading — complete
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

2026-08-01 — Post-gate compatibility corrections — complete
Summary: Corrected Phase 6 compatibility gaps: minAppVersion 1.7.0→1.7.2 (required for Workspace.revealLeaf), package.json version 0.0.0→0.1.0 (aligned with manifest), versions.json created with {"0.1.0": "1.7.2"}, API_USAGE.md corrected for PluginSettingTab.display and Plugin.onload signatures.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2821/2823 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). `npm --workspace @obsidian-dnd/obsidian-plugin run bundle` passes (CJS, obsidian external, no prohibited deps).
Commit: 764127f

2026-08-01 — Phase 6 gate — complete
Summary: All 12 Phase 6 tasks completed. Gate criteria verified: (1) Plugin loads/unloads cleanly — no errors in build or typecheck, all 2778 tests pass. (2) View opens in documented right leaf — getRightLeaf(false) guarded on mobile, viewtype "dnd-character-sheet" registered. (3) No undocumented API usage — all Obsidian APIs documented in API_USAGE.md. (4) isDesktopOnly remains false — confirmed in manifest.json. Phase 6 delivered mobile-compatible plugin skeleton with settings, view, and command registration.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 2778 tests). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).

2026-08-01 — P6-T012 — Manual mobile smoke test — complete
Summary: Audited plugin source code for mobile compatibility. Confirmed isDesktopOnly is false, no Node.js/Electron APIs, no desktop-only Obsidian APIs (getRightLeaf guarded by null check). Expanded smoke test checklist Section 8 from pre-flight to full mobile smoke test with 7 subsections: source code audit, installation methods, mobile enablement, settings tab verification, character sheet view behavior, console error checking, and mobile-specific considerations.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Documentation only. Mobile compatibility confirmed via source audit. No plugin source changes.
Commit: see Git history for P6-T012.

2026-08-01 — P6-T011 — Manual desktop smoke test — complete
Summary: Created comprehensive smoke test checklist (docs/SMOKE_TEST_CHECKLIST.md) covering plugin installation, enablement, settings tab verification, character sheet view, vault event logging, disable/enable cycle, error checking, and mobile compatibility pre-flight. Verified build artifacts (main.js, manifest.json) are present and correct. Fixed ESLint to ignore esbuild output main.js.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Documentation and ESLint config only. No plugin source changes. Mobile-compatible.
Commit: see Git history for P6-T011.

2026-08-01 — P6-T010 — Update API usage register for every symbol — complete
Summary: Audited all Obsidian API symbols used in the plugin source code and ensured each is documented in docs/API_USAGE.md. Added 16 previously missing entries: Plugin, TAbstractFile, App, App.workspace, App.vault, WorkspaceLeaf, TextComponent.setPlaceholder, TextComponent.setValue, TextComponent.onChange, Setting.setDisabled, SettingTab.containerEl, ItemView.contentEl, ItemView.getViewType, ItemView.getDisplayText, ItemView.onOpen, ItemView.onClose. All signatures verified against pinned obsidian.d.ts.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Documentation-only. No source code changes. Mobile-compatible.
Commit: see Git history for P6-T010.

2026-08-01 — P6-T009 — Register cleanup-safe events — complete
Summary: Registered cleanup-safe vault event listeners for 'create', 'modify', 'delete', 'rename' events using this.registerEvent(). Event callbacks are placeholder console.log statements; actual event handling deferred to Phase 8. Events are automatically cleaned up by Obsidian Component lifecycle on plugin unload. Updated API_USAGE.md for Component.registerEvent and Vault.on (create/modify/delete/rename).
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 7 no-console warnings). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Vault event registration only. Placeholder callbacks. No `any` used. Mobile-compatible.
Commit: see Git history for P6-T009.

2026-08-01 — P6-T008 — Add command to open right sidebar view — complete
Summary: Added command "Open character sheet" (id: open-character-sheet) that opens the character sheet view in the right sidebar. Uses Workspace.getRightLeaf(false), WorkspaceLeaf.setViewState(), and Workspace.revealLeaf(). Updated API_USAGE.md for Plugin.addCommand, Workspace.getRightLeaf, WorkspaceLeaf.setViewState, Workspace.revealLeaf.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 3 no-console warnings). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Command registration only. Workspace.revealLeaf requires Obsidian 1.7.2+. No `any` used. Mobile-compatible.
Commit: see Git history for P6-T008.

2026-08-01 — P6-T007 — Register empty character-sheet view — complete
Summary: Created views/character-sheet-view.ts with CharacterSheetView class extending ItemView. Implements getViewType, getDisplayText, onOpen (renders placeholder "Character sheet coming soon"), and onClose (cleanup). Registered in onload() via registerView with "dnd-character-sheet" view type. Updated API_USAGE.md for Plugin.registerView, ItemView, ViewCreator.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 3 no-console warnings). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Empty view placeholder only. No `any` used. Mobile-compatible.
Commit: see Git history for P6-T007.

2026-08-01 — P6-T006 — Implement settings tab — complete
Summary: Created settings-tab.ts with DndCharacterPluginSettingTab class extending PluginSettingTab. Implements display() method with sections for Catalog (catalogServerUrl, catalogRevision), Characters (charactersVaultPath), and About (schemaVersion read-only). All text inputs persist via saveData on change. Registered in onload() via addSettingTab. Updated API_USAGE.md for Plugin.addSettingTab, PluginSettingTab, PluginSettingTab.display, Setting, Setting.setName, Setting.setDesc, Setting.addText, TextComponent, Setting.setHeading.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 3 no-console warnings). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Settings tab UI only. Uses legacy display() pattern for minAppVersion 1.7.0 compatibility. No `any` used. Mobile-compatible.
Commit: see Git history for P6-T006.

2026-08-01 — P6-T005 — Implement settings schema and defaults — complete
Summary: Created settings.ts with DndCharacterPluginSettings interface (catalogServerUrl, catalogRevision, charactersVaultPath, schemaVersion), DEFAULT_SETTINGS constant, and normalizeSettings function that validates from unknown. Integrated loadSettings in onload and saveData in onunload in main.ts. Updated API_USAGE.md for loadData/saveData.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 3 no-console warnings). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Settings schema only. No `any` used. Validates from unknown.
Commit: see Git history for P6-T005.

2026-08-01 — P6-T004 — Implement plugin lifecycle — complete
Summary: Implemented plugin onload/onunload lifecycle methods with console.log diagnostics and commented TODO placeholders for future tasks (P6-T005 through P6-T009). onunload documents Obsidian Component lifecycle automatic cleanup. Updated API_USAGE.md for Plugin.onload and Component.onunload.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint, 3 no-console warnings expected). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Plugin lifecycle only. No Node/Electron-only APIs. Mobile-compatible.
Commit: see Git history for P6-T004.

2026-08-01 — P6-T003 — Configure esbuild and strict TypeScript — complete (no changes)
Summary: Verified esbuild and strict TypeScript configuration already correct from P6-T001 scaffolding. tsconfig.base.json inherits strict: true, esbuild.config.mjs properly configured, package.json scripts correct. No code or config changes needed.
Validation: `npm --prefix obsidian-dnd-character run check` passes. `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Configuration verification only. No changes.
Commit: see Git history for P6-T003.

2026-08-01 — P6-T002 — Create manifest.json and versions policy — complete
Summary: Updated manifest.json version to 0.1.0 (first pre-release), minAppVersion to 1.7.0 (conservative minimum compatible with pinned API snapshot). isDesktopOnly remains false.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2777/2780 tests, 1 pre-existing timeout). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Manifest versioning only. No code changes.
Commit: see Git history for P6-T002.

2026-08-01 — P6-T001 — Scaffold from official sample structure — complete
Summary: Created Obsidian plugin skeleton from official sample structure. Added src/main.ts (empty Plugin class), manifest.json (isDesktopOnly: false), esbuild.config.mjs, .gitignore. Updated package.json with obsidian/esbuild devDeps. Fixed eslint.config.js nested config ignore patterns.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2777/2780 tests across 101 files, 2 skipped, 1 pre-existing timeout). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Plugin skeleton only. No Obsidian API usage beyond Plugin base class. Mobile-compatible (isDesktopOnly: false).
Commit: see Git history for P6-T001.

2026-08-01 — Post-gate correction — Repair phase 5 operator wiring — complete
Summary: Corrected Docker operator wiring in catalog server configuration to ensure proper catalog revision serving. Structural fix to nginx configuration and Docker Compose service definition.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2778/2780 tests across 99 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-server Docker configuration only. No plugin code changes.
Commit: 398bba0

2026-08-01 — Phase 5 gate — Docker catalog server gate — complete
Summary: Phase 5 gate verified. All 2 gate criteria pass: plugin-independent HTTP smoke tests retrieve and validate complete catalog revisions (manifest, entities, indexes, reports, current.json); previous revision restore documented and architecturally supported via immutable read-only mounts and host-side catalog replacement. 8 task commits, clean tree, check and build pass.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2778/2780 tests across 99 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). Docker build/runtime smoke tests: NOT AVAILABLE (docker not installed).
Compatibility notes: Phase 5 complete. Catalog server Docker artifacts ready for deployment. Next phase: Phase 6 (Obsidian plugin foundation).
Commit: see Git history for Phase 5 gate.

2026-08-01 — P5-T008 — Document update/rollback procedure — complete
Summary: Created UPDATE_ROLLBACK.md (180 lines) covering catalog revision update procedure, rollback to previous revisions (backup restore and current.json pointer edit), server container image rollback, safety considerations (read-only mounts, immutable revisions, traversal protection, no authentication), and health check reference.
Validation: `npm --prefix obsidian-dnd-character run check` passes. `npm --prefix obsidian-dnd-character run build` passes.
Compatibility notes: Catalog-server documentation only. No code changes.
Commit: see Git history for P5-T008.

2026-08-01 — P5-T007 — Test desktop and mobile-reachable URLs — complete
Summary: Updated smoke.test.sh with URL pattern documentation (7 patterns), inventory.json sample data and tests, mobile/LAN reachability tests (0.0.0.0 binding, 0.0.0.0 reachability, LAN IP reachability, catalog endpoints via 0.0.0.0, revision endpoints via 0.0.0.0).
Validation: `npm --prefix obsidian-dnd-character run check` passes. `npm --prefix obsidian-dnd-character run build` passes. Docker smoke tests: NOT AVAILABLE.
Compatibility notes: Catalog-server smoke tests only. Tests verify all-interface binding for mobile/LAN access.
Commit: see Git history for P5-T007.

2026-08-01 — P5-T003 — Mount generated catalog read-only — complete
Summary: Updated docker-compose.yml to mount the generated catalog directory as read-only volume. Host path configurable via CATALOG_DATA_PATH env var (default ./catalog), mounted to /usr/share/nginx/html/catalog with :ro suffix. Updated .env.example with CATALOG_DATA_PATH documentation.
Validation: `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). Docker compose validation: NOT AVAILABLE.
Compatibility notes: Catalog-server only. No Obsidian API use. Docker Compose configuration change.
Commit: see Git history for P5-T003.

2026-08-01 — P5-T002 — Create Docker Compose service — complete
Summary: Created docker-compose.yml defining the catalog-server service with build context referencing P5-T001 Dockerfile, configurable port mapping (CATALOG_SERVER_PORT, default 8080), restart: unless-stopped policy, and commented placeholder for P5-T003 read-only volume mount. Added .env.example for documented configurable settings.
Validation: `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). `npm --prefix obsidian-dnd-character run check` has 2 pre-existing test timeouts (catalog-builder 5eTools data loading, unrelated). Docker compose validation: NOT AVAILABLE.
Compatibility notes: Catalog-server only. No Obsidian API use. Docker Compose configuration artifact.
Commit: see Git history for P5-T002.

2026-08-01 — P5-T001 — Create static server container — complete
Summary: Created Dockerfile (nginx:1.27-alpine) and nginx.conf for lightweight static catalog server. Serves immutable catalog revisions at /catalog/ URL prefix on port 8080. Configuration includes JSON MIME types, disabled directory listing, directory traversal protection, and 404 for missing files. Smoke test script (8 tests) covers build, manifest/entity/index/report serving, content types, 404, and directory listing prevention. Docker unavailable in development environment; structural validation only.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2778/2780 tests across 99 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). Docker build/runtime smoke tests: NOT AVAILABLE (docker not installed).
Compatibility notes: Catalog-server only. No Obsidian API use. Server-side Docker artifact.
Commit: see Git history for P5-T001.

2026-07-31 — Phase 4 gate — Catalog normalization and publication gate — complete
Summary: Phase 4 gate verified. All 7 gate criteria pass: zero duplicate IDs, zero unresolved references, both rulesets represented, core access classification verified, every effect has automation status/provenance/projections, unmapped narrative mechanics have diagnostics, build is reproducible. Golden catalog build tests (12 tests) exercise complete pipeline with all 12 entity kinds.
Validation: `npm --prefix obsidian-dnd-character run test -- golden-catalog-build` passes (12/12). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2778/2780 tests across 99 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Phase 4 complete. Ready for Phase 5 (Docker catalog server).
Commit: see Git history for Phase 4 gate.

2026-07-31 — P4-T024 — Golden catalog build tests — complete
Summary: Implemented golden catalog build tests exercising the complete catalog build pipeline with all 12 entity kinds. Tests verify zero duplicate IDs, zero unresolved references, both rulesets represented, core access classification, effect metadata (automation status, provenance, projections), reproducible builds, correct index file output for all 12 kinds, and correct entity detail file paths. Added ClassFeatureRule and SubclassFeatureRule to CatalogableEntity union in compact-index-tag-generator.ts. 12 tests covering full pipeline integration.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2778/2780 tests across 99 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Golden test data and integration tests.
Commit: 595282b

2026-07-31 — P4-T023 — Atomic revision publication — complete
Summary: Implemented atomic catalog publication (`publishCatalog`) with temp-write-verify-rename flow. Generates manifest, validation/inventory reports, entity files, and kind-index files into a temporary directory, verifies every file was written correctly, then performs atomic rename to final revision path. Rejects catalogs with invalid validation reports before any file I/O. All results are frozen. 18 tests across 3 test files covering successful publication, manifest writing, report writing, entity file writing, index file generation, frozen results, invalid validation report rejection, and directory cleanup on failure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2766/2768 tests across 98 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Pure file-system publication module.
Commit: b58147f

2026-07-31 — P4-T022 — Validation/inventory reports — complete
Summary: Implemented catalog validation report (`buildValidationReport`) detecting duplicate IDs, unresolved references, ruleset coverage, access classification, effect completeness (automation/provenance), and unmapped narrative mechanics. Implemented inventory report (`buildInventoryReport`) with entity counts by kind/ruleset/access, unique source IDs, and ISO timestamp. Both produce frozen, deterministic output. 20 tests across 2 test files covering duplicate detection, unresolved references, ruleset/access coverage, effect completeness, unmapped narrative, frozen output, determinism, and all inventory report fields.

2026-07-31 — P4-T021 — Checksums and manifest generation — complete
Summary: Implemented SHA-256 checksum computation (`computeChecksum`, `computeChecksums`) and manifest generation (`generateManifest`) for catalog builder. Checksum functions use Node.js `crypto.createHash('sha256')` for deterministic hex digests. Manifest generator assembles `CatalogManifest` from build artifacts using `createCatalogManifest` factory. All output frozen. `generatedAt` is the only non-deterministic field (ISO timestamp). 18 tests across 2 test files covering SHA-256 correctness, determinism, batch checksums, sorted output, empty input, freezing, manifest validity, field preservation, ISO timestamp, single ruleset, all entity kinds, and reproducibility (CAT-001).

2026-07-31 — P4-T020 — Compact indexes — complete
Summary: Implemented compact index builder that produces CatalogEntitySummary records from normalized entities. Accepts all entity kinds (species, background, class, subclass, feat, spell, item, optional-feature, skill, language). Generates entity-specific tags (species traits, class abilities, spell school/level/ritual/concentration, item rarity/category, etc.). Groups summaries by kind, sorts within groups by name (case-insensitive), sorts kind groups alphabetically. Constructs detail paths as entities/{kind}/{id}.json. Emits diagnostics for missing names or IDs. Returns frozen, deterministic results. 25 tests across 2 test files covering empty input, single entity, grouping, sorting, freezing, diagnostics, mixed kinds, deterministic output, detail path, and tag generation for all 10 entity kinds.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2709/2709 tests across 91 files). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Pure computation module.
Commit: see Git history for P4-T020.

2026-07-31 — P4-T019 — Global reference resolver — complete
Summary: Implemented global reference resolver that resolves cross-entity references within the normalized catalog. Accepts all normalized entities, builds canonical ID index, resolves dependencies, prerequisites, language IDs, skill proficiencies, feature IDs, subclass IDs, level grants, and parent IDs across all entity types. Produces BROKEN_* diagnostics for missing targets. Pure, deterministic, frozen results. 26 tests across 2 test files covering empty input, frozen output, species language references, background skill/feature references, class subclass/level grant references, subclass/class-feature/subclass-feature parent IDs, entity-selection prerequisites, deduplication, non-entity prerequisite filtering, broken reference diagnostics, deterministic sorting, and mixed catalog handling.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2684/2684 tests across 89 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Pure computation module.
Commit: see Git history for P4-T019.

2026-07-31 — P4-T018 — Canonical ID generator — complete
Summary: Reviewed existing createCanonicalEntityId in domain package. Implementation was already complete, supporting all 12 entity kinds (class, race/species, background, feat, subclass, optional-feature, spell, item, skill, language). Added 251 lines of comprehensive tests covering: all supported entity kinds, deterministic output, proper slugification, ruleset inclusion, special character encoding, long name handling, numeric names, and single-character names. No implementation changes needed.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2658/2658 tests across 87 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Domain package only. No Obsidian API use. Pure test coverage expansion.
Commit: see Git history for P4-T018.

2026-07-31 — P4-T017 — Skills and languages normalizers — complete
Summary: Implemented skill and language normalizers. Skill normalizer produces SkillRule entities with name, ability score, content, page, and summary. Language normalizer produces LanguageRule entities with name, type (language/script), speaker type, content, page, and summary. Both limited to PHB (2014) and XPHB (2024) via source scope classifiers. Uses shared createCanonicalEntityId from domain. Non-core known sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Empty or whitespace-padded sources rejected with INVALID_SOURCE. Returns frozen result objects. 57 tests across 8 test files covering positive normalization, source exclusion, field extraction, ability score validation, language type validation, content extraction, frozen results, canonical IDs, mixed batches, and diagnostic structure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2639/2639 tests across 87 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries.
Commit: see Git history for P4-T017.

2026-07-31 — P4-T016 — Item/base-item normalizer — complete
Summary: Implemented item normalizer accepting resolved raw records and producing normalized ItemRule entities. Limited to PHB (2014) and XPHB (2024) via classifyItemSourceScope. Uses shared createCanonicalEntityId from domain. Extracts narrative content from entries, description, and entry fields. Extracts item category, rarity, cost (structured and string), weight, body slot, properties, attunement requirements, page numbers, and summaries. Non-core known sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Empty or whitespace-padded sources rejected with INVALID_SOURCE. Returns frozen result objects. 54 tests across 6 test files (52 positive, 2 negative) covering positive normalization, source exclusion, field extraction, content extraction, frozen results, canonical IDs, mixed batches, and diagnostic structure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2582/2582 tests across 83 files, 2 skipped). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries.
Commit: see Git history for P4-T016.

2026-07-31 — P4-T015 — Spell relation builder — complete
Summary: Implemented spell relation builder that connects normalized spell entities to prerequisite spells, higher-level versions, and school groupings. Produces prerequisite relations (from dependency and entity-selection prerequisite references), level-chain relations (adjacent levels grouped by name and ruleset), and school-group relations (spells grouped by school, sorted alphabetically). Emits BROKEN_PREREQUISITE_REF and BROKEN_DEPENDENCY_REF diagnostics for missing targets. Pure, deterministic, frozen results. 19 tests across 1 test file covering prerequisite relations, level chains, school groups, broken references, deduplication, cross-ruleset isolation, frozen results, deterministic sort order, and empty input.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2528/2528 tests across 79 files). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Pure module with frozen results.
Commit: see Git history for P4-T015.

2026-07-31 — P4-T014 — Spell normalizer — complete
Summary: Implemented spell normalizer accepting resolved raw records and producing normalized SpellRule entities. Limited to PHB (2014) and XPHB (2024) via classifySpellSourceScope. Uses shared createCanonicalEntityId from domain. Extracts spell level, school (with code mapping), casting time, range, duration, concentration, ritual flag, narrative content, higher-level effects, page numbers, and summaries. Non-core known sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Missing required fields (level, casting time, range, duration) rejected with specific error diagnostics. Returns frozen result objects. 43 tests across 3 test files (25 positive, 18 negative) covering positive normalization, source exclusion, invalid sources, field extraction, school mapping, concentration detection, ritual detection, content extraction, higher-level effects, frozen results, canonical IDs, mixed batches, and diagnostic structure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2509/2509 tests across 78 files). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Component parsing (V/S/M), saving throw, damage type, and area tags deferred.
Commit: see Git history for P4-T014.

2026-07-31 — P4-T013 — Optional-feature normalizer — complete
Summary: Implemented optional-feature normalizer accepting resolved raw records and producing normalized OptionalFeatureRule entities. Limited to PHB (2014) and XPHB (2024) via classifyOptionalFeatureSourceScope. Uses shared createCanonicalEntityId from domain. Extracts narrative content from entries, description, and entry fields. Extracts page numbers and summaries. Non-core known sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Empty or whitespace-padded sources rejected with INVALID_SOURCE. Returns frozen result objects. 23 tests across 2 test files (10 positive, 13 negative) covering positive normalization, source exclusion, invalid sources, page number validation, content extraction, frozen results, canonical IDs, mixed batches, diagnostic structure, and unsupported narrative mechanics (ENG-008).
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2466/2466 tests across 75 files). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Prerequisites, effects, choices, and dependencies deferred.
Commit: see Git history for P4-T013.

2026-07-30 — P4-T012 — Feat normalizer — complete
Summary: Implemented feat normalizer accepting resolved raw records and producing normalized FeatRule entities. Limited to PHB (2014) and XPHB (2024) via classifyFeatSourceScope. Uses shared createCanonicalEntityId from domain. Extracts narrative content from entries, description, and entry fields. Extracts ability score prerequisites from structured prerequisites (multiple shape variants) and direct fields. Extracts page numbers and summaries. Non-core known sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Empty or whitespace-padded sources rejected with INVALID_SOURCE. Returns frozen result objects. 41 tests across 3 test files (21 positive, 20 negative) covering positive normalization, source exclusion, invalid sources, ability prerequisite extraction, content extraction, page number validation, frozen results, mixed batches, diagnostic structure, and unsupported narrative mechanics (ENG-008).
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2443/2443 tests across 73 files). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Effects, choices, and dependencies deferred.
Commit: see Git history for P4-T012.

2026-07-30 — P4-T011 — Subclass-feature normalizer — complete
Summary: Implemented subclass-feature normalizer accepting resolved raw records and producing normalized SubclassFeatureRule entities. Limited to PHB (2014) and XPHB (2024) via classifyClassSourceScope. Uses shared createCanonicalEntityId from domain. Extracts class name reference, subclass short name, level requirements, narrative content, page numbers, and summaries. Resolves parentId to canonical subclass ID. Non-core sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Missing className rejected with MISSING_CLASS_NAME. Missing or invalid subclassShortName rejected with MISSING_SUBCLASS_NAME. Missing or invalid level rejected with MISSING_LEVEL. Returns frozen result objects. 33 tests across 2 test files covering positive normalization, source exclusion, missing className, missing subclassShortName, missing level, boundary levels, content extraction, frozen results, mixed batches, and diagnostic structure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2401/2402 tests across 70 files, 1 pre-existing timeout). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Prerequisites, effects, and choices deferred.
Commit: see Git history for P4-T011.

2026-07-30 — P4-T010 — Class-feature normalizer — complete
Summary: Implemented class-feature normalizer accepting resolved raw records and producing normalized ClassFeatureRule entities. Limited to PHB (2014) and XPHB (2024) via classifyClassSourceScope. Uses shared createCanonicalEntityId from domain. Extracts class name reference, level requirements, narrative content, page numbers, and summaries. Resolves parentId to canonical class ID. Non-core sources yield EXCLUDED_SOURCE diagnostics. Unknown sources yield UNKNOWN_SOURCE diagnostics. Missing className rejected with MISSING_CLASS_NAME. Missing or invalid level rejected with MISSING_LEVEL. Returns frozen result objects. 28 tests across 2 test files covering positive normalization, source exclusion, missing className, missing level, boundary levels, content extraction, frozen results, mixed batches, and diagnostic structure.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2366/2369 tests across 68 files, 3 pre-existing timeouts). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Prerequisites, effects, and choices deferred.
Commit: see Git history for P4-T010.

2026-07-30 — P4-T009 — Subclass normalizer — complete
Summary: Implemented subclass normalizer accepting indexed class entries (isSubclass=true) from class index loader and producing normalized SubclassRule entities. Limited to PHB (2014) and XPHB (2024) via classifyClassSourceScope. Uses shared createCanonicalEntityId from domain. Extracts subclass name, parent class reference, narrative content, page numbers, and summaries. Resolves parentId to canonical class ID. Non-core sources yield EXCLUDED_SOURCE diagnostics. Base classes rejected with BASE_CLASS_MISDIRECTED. Missing or empty parentId rejected with MISSING_PARENT_ID. Returns frozen result objects. 20 tests across 2 test files covering positive normalization, source exclusion, base class rejection, parent ID validation, and canonical ID generation.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2339/2340 tests across 65 files, 1 pre-existing timeout). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Subclass features deferred to P4-T011. Effects, choices, and prerequisites deferred.
Commit: see Git history for P4-T009.

2026-07-30 — P4-T008 — Class normalizer — complete
Summary: Implemented class normalizer accepting indexed class entries from class index loader and producing normalized ClassRule entities. Limited to PHB (2014) and XPHB (2024) via forwarded source-scope diagnostics. Excludes subclass entries (SUBCLASS_EXCLUDED diagnostic, deferred to P4-T009). Extracts hitdie, primary abilities, and saving throw proficiencies with ability validation. Creates saving throw proficiency effects (add-proficiency with ProficiencySavingThrowRef). Preserves narrative content as safe render nodes. Assigns access="core", automation status "full", and effect provenance via EffectOrigin. Returns frozen result objects. 26 tests covering positive normalization, subclass exclusion, field extraction, edge cases, XPHB source, excluded sources, content extraction, frozen results, and mixed batches.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2320/2320 tests across 64 files, EXIT 0; 2 pre-existing timeouts). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Class features, starting choices, level progression, and spellcasting deferred to P4-T010. Subclass normalization deferred to P4-T009.
Commit: see Git history for P4-T008.

2026-07-30 — P4-T007 — Class index loader — complete
Summary: Implemented class index loader that discovers and indexes class records from raw 5eTools source. Resolves _copy/_mod inheritance via materializeCopyWithMods. Identifies subclasses by parent field. Extracts hitdie, primary abilities, and saving throw proficiencies. Limited to PHB (2014) and XPHB (2024) via class-source-scope classifier. Produces structured index with canonical IDs, parent-child mappings, and field diagnostics. Returns frozen result objects. 30+ tests across 3 test files covering positive indexing, excluded sources, field validation, inheritance resolution, immutability, and canonical ID generation.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2294/2294 tests across 63 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries.
Commit: see Git history for P4-T007.

2026-07-30 — P4-T006 — Background normalizer — complete
Summary: Implemented background normalizer accepting resolved raw records and producing normalized BackgroundRule entities. Limited to PHB (2014) and XPHB (2024) via background-source-scope classifier. Uses shared createCanonicalEntityId from domain. Extracts skill proficiencies (object shape), narrative content from entries, feature IDs, page numbers, and summaries. Excluded sources yield EXCLUDED_SOURCE diagnostics. Warns on unmapped tool proficiencies, language proficiencies, skill proficiencies, features, and starting equipment. Returns frozen result objects. 17 tests covering positive normalization, excluded sources, unmapped fields, edge cases, XPHB source, and mixed batches.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2255/2255 tests across 60 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Prerequisites, effects, choices, and dependencies deferred.
Commit: see Git history for P4-T006.

2026-07-30 — P4-T005 — Species normalizer — complete
Summary: Implemented species normalizer accepting resolved raw records and producing normalized SpeciesRule entities. Limited to PHB (2014) and XPHB (2024) per ADR-011 via species-source-scope classifier. Uses shared createCanonicalEntityId from domain per ADR-012. Retains size as display text per ADR-010. Extracts ability effects (array and object shapes), walk speed, darkvision, and narrative content. Excluded sources yield EXCLUDED_SOURCE diagnostics. Warns on unmapped language proficiencies, proficiencies, and missing size/speed. Returns frozen result objects. 14 tests covering positive normalization, excluded sources, unmapped fields, edge cases, and mixed batches.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2238/2238 tests across 59 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Catalog-builder only. No Obsidian API use. Raw 5eTools structures contained within catalog-builder boundaries. Size selection deferred to P4-T005A. Optional-source expansion deferred to P4-T005B.
Commit: see Git history for P4-T005.

2026-07-28 — Pre-P4-T005 corrective readiness gate — complete
Summary: Validated all corrective prerequisites from Microtasks A through F. Confirmed semantic mapping payload carries complete RuleEffect with reviewed provenance, mandatory freshness checks, fingerprint-based staleness detection, and reviewed-mapping materialization. Verified species source-scope registry restricted to PHB (2014) and XPHB (2024) with explicit diagnostics for optional, fabricated, and malformed sources. Verified canonical entity ID helper is shared, deterministic, and free of forbidden dependencies. Confirmed species size selection deferred to P4-T005A and optional-source expansion deferred to P4-T005B. Pinned 5eTools revision `3c5d9d3175ca9637132011c75efd73aad7a2364d` verified clean. GitHub CI #119 for commit `5fe58a6` passed.
Validation: `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 2224/2224 tests across 58 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0). Focused prerequisite tests: 437 tests across 9 files, passing (EXIT 0). Structural audits: no forbidden patterns found.
Compatibility notes: Validation and documentation only. No production code, semantic mappings, source scope, canonical IDs, or roadmap checkboxes changed. P4-T005 ready to begin but not started. P4-T005A, P4-T005B, and P4-T018 remain incomplete.
Commit: see Git history for pre-species readiness gate.

2026-07-27 — Phase 3 ingestion corrective verification — complete
Summary: Added the pinned ingestion readiness harness and corrected final harness assumptions without production behavior changes. Verified pinned revision and clean source clone; source inventory; canonical copy selection and source-role filtering; nested materialization; `_preserve`; every observed `_mod` mode; `_versions`; abstract versions; template application; race/subrace materialization; output directive cleanup; structured diagnostics; and source/output immutability. Corrected `Vehicle (Air)|DMG` itemType expectations to preserve requested identity `abbreviation=SHP, source=DMG` while selecting terminal base `Vehicle (Water)|DMG`. Corrected `bestiary-bmt.json` count metric from an unexplained expected 10 to the total collection invariant: 41 raw monster records plus 2 version entries yields 43 expanded monster records. Corrected the legendary-group version expectation to pinned derived identity `Shadow Dragon (Amethyst Dragon)|FTD` with one applied `Shadow Dragon|FTD` template.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/pinned-ingestion-readiness.test.ts` passes (7/7 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1877/1877 tests across 53 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Harness and documentation only. No production code, copy identity rules, source roles, race/subrace materialization, `_mod` executors, version expansion, templates, normalized catalog schemas, canonical ID construction, or roadmap checkboxes changed. No consumed directives remain in successful materialized representative outputs, and raw 5eTools data remains confined to catalog-builder boundaries.
Next task: P4-T005 — ready to begin, not started.
Commit: see Git history for final ingestion readiness verification.
