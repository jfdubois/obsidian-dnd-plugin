# Project Status

## Current phase

Phase 3 — Catalog builder ingestion foundation

## Current task

P3-T008 — Implement _preserve behavior

## Last completed task

P3-T007 — Implement _mod operations used by included data

## Branch baseline

- Branch: `dev`
- Last synchronized commit: see Git history
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm run check`: passing at P3-T007
- `npm run build`: passing at P3-T007
- Tests: 1465 passing

## Catalog baseline

- 5eTools source commit: `3c5d9d3` pinned.
- Catalog schema version: 1.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: not selected.
- Plugin version: not initialized.

## Current phase ledger

- Phase starting commit: 6dcc189
- Completed Phase 3 task commits: P3-T006, P3-T007
- Current task: P3-T008
- Current retry: 0
- Gate status: not evaluated
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-07-24 — P3-T007 — Implement _mod operations used by included data
Summary: Created mod-parser.ts (390 lines) and mod-parser.test.ts (524 lines, 48 new tests). Defines discriminated union of all 21 known _mod operation modes discovered in raw 5eTools data. Provides parseModOperation (single operation), parseModBlock (full block with field targets), type guards, and KNOWN_MOD_OPERATION_MODES registry. Unknown modes produce UNKNOWN_MOD_MODE diagnostics with severity error. Updated raw-boundary.ts with 5eTools internal resolution fields.
Validation: `npm run check` passes (typecheck + lint + 1465/1465 tests, EXIT 0). `npm run build` passes (EXIT 0).
Commit: see Git history for P3-T007.

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
