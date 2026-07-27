# Project Status

## Current phase

Phase 4 — Catalog normalization and publication

## Current task

P4-T005 — Implement species normalizer

## Last completed task

P4-T004 — Implement semantic mapping and projection infrastructure

## Branch baseline

- Branch: `dev`
- Last synchronized commit: see Git history
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm --prefix obsidian-dnd-character run check`: passing at final Phase 3 ingestion readiness verification (typecheck, lint, 1877/1877 tests across 53 files).
- `npm --prefix obsidian-dnd-character run build`: passing at final Phase 3 ingestion readiness verification.
- Readiness harness: `apps/catalog-builder/src/pinned-ingestion-readiness.test.ts` passing (7/7 tests).
- Tests: 1877 passing.

## Catalog baseline

- 5eTools source commit: `3c5d9d3175ca9637132011c75efd73aad7a2364d` pinned and verified clean.
- Pinned source inventory: 502 files, 404 collections, 25672 raw records, 2801 `_copy` records, 317 nested copy chains, 259 `_preserve` payloads, 127 records with `_versions`, 359 version entries, 7 abstract bundles, 50 abstract implementations, 187 copy template references, 21 version template references.
- Catalog schema version: 1.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: not selected.
- Plugin version: not initialized.

# Current phase ledger

- Phase starting commit: b3598ccf62be42eddff2eaf9302ca636762f686c
- Completed Phase 4 task commits: P4-T001 — see Git history for P4-T001; P4-T002 — see Git history for P4-T002; P4-T003 — see Git history for P4-T003; P4-T004 — see Git history for P4-T004
- Current task: P4-T005
- Current retry: 0
- Gate status: Phase 3 ingestion corrective verification complete; P4-T005 ready to begin but not started.
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-07-27 — Phase 3 ingestion corrective verification — complete
Summary: Added the pinned ingestion readiness harness and corrected final harness assumptions without production behavior changes. Verified pinned revision and clean source clone; source inventory; canonical copy selection and source-role filtering; nested materialization; `_preserve`; every observed `_mod` mode; `_versions`; abstract versions; template application; race/subrace materialization; output directive cleanup; structured diagnostics; and source/output immutability. Corrected `Vehicle (Air)|DMG` itemType expectations to preserve requested identity `abbreviation=SHP, source=DMG` while selecting terminal base `Vehicle (Water)|DMG`. Corrected `bestiary-bmt.json` count metric from an unexplained expected 10 to the total collection invariant: 41 raw monster records plus 2 version entries yields 43 expanded monster records. Corrected the legendary-group version expectation to pinned derived identity `Shadow Dragon (Amethyst Dragon)|FTD` with one applied `Shadow Dragon|FTD` template.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/pinned-ingestion-readiness.test.ts` passes (7/7 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1877/1877 tests across 53 files, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Harness and documentation only. No production code, copy identity rules, source roles, race/subrace materialization, `_mod` executors, version expansion, templates, normalized catalog schemas, canonical ID construction, or roadmap checkboxes changed. No consumed directives remain in successful materialized representative outputs, and raw 5eTools data remains confined to catalog-builder boundaries.
Next task: P4-T005 — ready to begin, not started.
Commit: see Git history for final ingestion readiness verification.

2026-07-26 — Prompt 3A-5 — Resolved-record debug fixture structured identity
Summary: Replaced name-and-source fallback in resolved-record debug fixture source record location with full structured identity matching using exported `getRecordIdentity` and `recordMatchesIdentity` from copy-resolver. Added `SOURCE_RECORD_AMBIGUOUS` diagnostic code with `candidates` array carrying complete structured identities for every matching record. Fixture construction now uses the located boundary record instead of the detached input record. Complete structured identities preserved in chain step identities, terminal base for direct records, and fixture root identity. Added 7 new focused tests covering ambiguity detection, discriminator field distinctions (raceName, className, level), sourcePath isolation, identity retention, and no-fallback behavior.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts` passes (19/19 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1686/1686 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Debug fixtures remain in-memory catalog-builder outputs only. No normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, semantic mappings, or entity normalizer behavior modified. Copy-resolver exports `getRecordIdentity` and `recordMatchesIdentity` for reuse.

2026-07-26 — Prompt 3A-4 — Resolved-record debug fixture location handling
Summary: Replaced loose first-match source path discovery in resolved-record debug fixtures with strict path-and-entity-kind location. `ResolvedRecordDebugFixtureOptions.sourcePath` and `sourceEntityKind` are now required. Lookup uses exact object identity first, then structured identity within the specified collection. Chain entries carry stored `CopyChainStep` values (`entityKind`, `sourcePath`, `identity`) directly without rediscovery from `RawBoundaryFile`. Terminal base trace sourced from `MaterializedResolvedRecord.terminalBase`. Diagnostic codes `SOURCE_ENTITY_KIND_REQUIRED`, `INVALID_SOURCE_ENTITY_KIND`, and `SOURCE_RECORD_NOT_FOUND` added. All 12 existing tests updated and passing.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts` passes (12/12 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1679/1679 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Debug fixtures remain in-memory catalog-builder outputs only. No normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, semantic mappings, or entity normalizer behavior modified.
