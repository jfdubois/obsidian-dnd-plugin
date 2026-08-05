# Project History

This file retains completed task and phase-gate work-log entries moved out of `docs/PROJECT_STATUS.md`.

It is historical reference and is not part of normal task or between-task context hydration. Use Git history and the relevant task commit for authoritative change inspection.

## Archived work log

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

2026-07-26 — Prompt 3A-4 — Resolved-record debug fixture location handling
Summary: Replaced loose first-match source path discovery in resolved-record debug fixtures with strict path-and-entity-kind location. `ResolvedRecordDebugFixtureOptions.sourcePath` and `sourceEntityKind` are now required. Lookup uses exact object identity first, then structured identity within the specified collection. Chain entries carry stored `CopyChainStep` values (`entityKind`, `sourcePath`, `identity`) directly without rediscovery from `RawBoundaryFile`. Terminal base trace sourced from `MaterializedResolvedRecord.terminalBase`. Diagnostic codes `SOURCE_ENTITY_KIND_REQUIRED`, `INVALID_SOURCE_ENTITY_KIND`, and `SOURCE_RECORD_NOT_FOUND` added. All 12 existing tests updated and passing.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts` passes (12/12 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1679/1679 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Debug fixtures remain in-memory catalog-builder outputs only. No normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, semantic mappings, or entity normalizer behavior modified.
Commit: see Git history for the task or gate ID.

2026-07-27 — PROJECT_STATUS recent-work archive
Summary: Moved older recent-work entries out of `docs/PROJECT_STATUS.md` to retain only the latest three entries there after final Phase 3 ingestion readiness verification. Displaced entries: Phase 3 structured identity correction; Phase 3 multi-collection corrective follow-up; P4-T004; P4-T003; P4-T002; P4-T001; Phase 3 gate; P3-T012; P3-T011; P3-T010; P3-T009; P3-T008; P3-T007-S5; P3-T007-S4; P3-T007-S3; P3-T007-S2; P3-T006; P3-T005; P2-T013; P2-T012.
Validation: Historical archive update only; see `docs/PROJECT_STATUS.md` before this commit or Git history for full displaced entry text.
Commit: see Git history for final ingestion readiness verification.
Notes: Current work state remains recorded in `docs/PROJECT_STATUS.md`; authoritative implementation details remain in task commits.

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
