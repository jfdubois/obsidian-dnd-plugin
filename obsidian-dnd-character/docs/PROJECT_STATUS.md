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

- `npm --prefix obsidian-dnd-character run check`: passing at pre-P4-T005 corrective readiness gate (typecheck, lint, 2224/2224 tests across 58 files).
- `npm --prefix obsidian-dnd-character run build`: passing at pre-P4-T005 corrective readiness gate.
- Focused prerequisite tests: 437 tests across 9 files, passing.
- Tests: 2224 passing.

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
- Gate status: Pre-P4-T005 corrective readiness gate complete; P4-T005 ready to begin but not started.
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

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

2026-07-26 — Prompt 3A-5 — Resolved-record debug fixture structured identity
Summary: Replaced name-and-source fallback in resolved-record debug fixture source record location with full structured identity matching using exported `getRecordIdentity` and `recordMatchesIdentity` from copy-resolver. Added `SOURCE_RECORD_AMBIGUOUS` diagnostic code with `candidates` array carrying complete structured identities for every matching record. Fixture construction now uses the located boundary record instead of the detached input record. Complete structured identities preserved in chain step identities, terminal base for direct records, and fixture root identity. Added 7 new focused tests covering ambiguity detection, discriminator field distinctions (raceName, className, level), sourcePath isolation, identity retention, and no-fallback behavior.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts` passes (19/19 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1686/1686 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Debug fixtures remain in-memory catalog-builder outputs only. No normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, semantic mappings, or entity normalizer behavior modified. Copy-resolver exports `getRecordIdentity` and `recordMatchesIdentity` for reuse.
