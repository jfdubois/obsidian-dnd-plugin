# Project Status

## Current phase

Phase 3 — Catalog builder ingestion foundation

## Current task

P3-T012 — Produce ingestion diagnostic report

## Last completed task

P3-T011 — Emit resolved-record debug fixtures

## Branch baseline

- Branch: `dev`
- Last synchronized commit: see Git history
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm run check`: passing at Phase 2 gate
- `npm run build`: passing at Phase 2 gate
- Tests: 1498 passing

## Catalog baseline

- 5eTools source commit: `3c5d9d3` pinned.
- Catalog schema version: 1.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: not selected.
- Plugin version: not initialized.

# Current phase ledger

- Phase starting commit: 6dcc189
- Completed Phase 3 task commits: P3-T006, P3-T007-S1, P3-T007-S2, P3-T007-S3, P3-T007-S4, P3-T007-S5, P3-T008, P3-T009, P3-T010, P3-T011
- Current task: P3-T012
- P3-T007 execution mode: five committed slices; one `/phase 3` invocation per slice.
- Current retry: 1
- Gate status: not evaluated
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-07-25 — P3-T011 — Emit resolved-record debug fixtures
Summary: Added in-memory catalog-builder resolved-record debug fixtures with source path, structured identity, inheritance chain, resolved field inventory, cloned resolved raw payloads, and diagnostic-only cycle handling. Exported fixture types/functions from the catalog-builder boundary.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts` passes (6/6 tests, EXIT 0). `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/copy-resolver.test.ts apps/catalog-builder/src/mod-copy-resolver.test.ts apps/catalog-builder/src/versions-expander.test.ts` passes (47/47 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1498/1498 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Debug fixtures are in-memory catalog-builder outputs only; no filesystem writing or P3-T012 diagnostic-report generation was added. No Obsidian API use, normalized catalog contract changes, raw-source leakage, or dependency updates introduced.
Commit: see Git history for P3-T011.

2026-07-25 — P3-T010 — Detect inheritance cycles
Summary: Updated `_copy` cycle diagnostics to include the closing repeated identity in direct and nested inheritance cycle chains, satisfying CAT-005 cycle-chain evidence while preserving ordinary `_copy`, `_preserve`, and `_versions` behavior.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/copy-resolver.test.ts apps/catalog-builder/src/copy-preserve-resolver.test.ts apps/catalog-builder/src/versions-expander.test.ts` passes (50/50 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1492/1492 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future Phase 3 task implementation introduced.
Commit: see Git history for P3-T010.

2026-07-25 — P3-T009 — Implement _versions expansion
Summary: Added catalog-builder `_versions` expansion for validated raw envelopes, emitting concrete base and variant records, stripping `_versions`, applying version `_mod` operations through the existing copy/mod resolver, and classifying `_versions` as a known builder-boundary raw field.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/versions-expander.test.ts apps/catalog-builder/src/mod-copy-resolver.test.ts apps/catalog-builder/src/copy-resolver.test.ts` passes (46/46 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1491/1491 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future Phase 3 task implementation introduced. Broader normalization pipeline wiring remains outside this foundation task.
Commit: see Git history for P3-T009.

2026-07-25 — P3-T008 — Implement _preserve behavior
Summary: Added `_preserve: true` handling for self-referential `_copy` records, stripping raw `_copy`/`_preserve` directives from preserve-resolved output while preserving ordinary `_copy` behavior. Added malformed `_preserve` diagnostics and representative race/background/class preserve-resolution coverage.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/copy-preserve-resolver.test.ts apps/catalog-builder/src/copy-resolver.test.ts apps/catalog-builder/src/mod-copy-resolver.test.ts` passes (47/47 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1486/1486 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: `_preserve` support is intentionally limited to literal `true`; other payloads fail with `INVALID_PRESERVE_VALUE`. No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future Phase 3 task implementation introduced.
Commit: see Git history for P3-T008.

2026-07-25 — P3-T007-S5 — Dispatcher, cloning, diagnostics, and _copy integration
Summary: Completed `_mod` dispatcher integration across supported array, scalar/text, root, and spell operation families after `_copy` resolution. Added CAT-003/CAT-003A/CAT-003B/CAT-004 integration coverage for cloned resolved-record application, base/input preservation, malformed diagnostics, unknown-mode diagnostics, and inventoried single-object `renameArr` payloads.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/mod-copy-resolver.test.ts apps/catalog-builder/src/mod-array-operations.test.ts apps/catalog-builder/src/mod-array-executors.test.ts apps/catalog-builder/src/mod-root-operations.test.ts apps/catalog-builder/src/mod-root-add-spells.test.ts apps/catalog-builder/src/mod-root-remove-spells.test.ts apps/catalog-builder/src/mod-root-replace-spells.test.ts apps/catalog-builder/src/mod-scalar-text-operations.test.ts` passes (63/63 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1480/1480 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future Phase 3 task implementation introduced.
Commit: see Git history for P3-T007-S5.

2026-07-25 — P3-T007-S4 — Spell operations
Summary: Added `_mod` execution for `addSpells`, `removeSpells`, and `replaceSpells`, split spell validation/execution into focused modules, and covered exact resulting spellcasting state, malformed payload diagnostics, and original base/input preservation for each spell mode.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/mod-root-add-spells.test.ts apps/catalog-builder/src/mod-root-remove-spells.test.ts apps/catalog-builder/src/mod-root-replace-spells.test.ts apps/catalog-builder/src/mod-root-operations.test.ts` passes (11/11 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1476/1476 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future Phase 3 task implementation introduced. S4 required two review repairs: module split to keep final files under 300 lines and exact input-record preservation assertions.
Commit: see Git history for P3-T007-S4.

2026-07-25 — P3-T007-S3 — Senses and skills operations
Summary: Added root-level `_mod` execution for `addSenses` and `addSkills`, including payload validation, contextual malformed-payload diagnostics, cloned resolved-record application, original base/input preservation tests, and unknown-mode diagnostic coverage.
Validation: `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/mod-root-operations.test.ts` passes (5/5 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1470/1470 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future P3-T007 spell/dispatcher slice implementation introduced.
Commit: see Git history for P3-T007-S3.

2026-07-25 — P3-T007-S2 — Scalar, property, text, and size operations
Summary: Added scalar, property, text, and size `_mod` execution for `maxSize`, `prefixSuffixStringProp`, `replaceTxt`, `scalarAddDc`, `scalarAddHit`, `scalarAddProp`, `scalarMultProp`, `scalarMultXp`, and `setProp`. Added resulting-state tests, malformed-payload diagnostics, unknown-mode diagnostics, and clone-preservation coverage. Repaired the source-manifest non-Git directory test to use an isolated temp directory instead of assuming `/tmp` is not a Git mount.
Validation: `npm --prefix obsidian-dnd-character run test -- mod-scalar-text-operations.test.ts` passes (4/4 tests, EXIT 0). `npm --prefix obsidian-dnd-character run test -- source-manifest.test.ts` passes (34/34 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1465/1465 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: No Obsidian API use, normalized catalog contract changes, raw-source leakage, dependency updates, or future P3-T007 slice implementation introduced.
Commit: see Git history for P3-T007-S2.

2026-07-24 — P3-T006 — Implement _copy resolver
Summary: Created copy-resolver.ts (441 lines) and copy-resolver.test.ts (616 lines, 331 new tests). Resolves _copy field using canonical reference parser, locates base entity by name+source, handles nested _copy chains with cycle detection and depth limit (20). Provides resolveCopy (discriminated result), resolveCopyOrThrow (throw API), resolveCopies (batch), and collectCopyFailures utilities.
Validation: `npm run check` passes (typecheck + lint + 1417/1417 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P3-T006.

2026-07-23 — P3-T005 — Implement canonical reference parser
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
