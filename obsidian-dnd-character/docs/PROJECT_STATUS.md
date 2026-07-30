# Project Status

## Current phase

Phase 4 — Catalog normalization and publication

## Current task

P4-T008 — Implement class normalizer

## Last completed task

P4-T007 — Implement class index loader

## Branch baseline

- Branch: `dev`
- Last synchronized commit: see Git history
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm --prefix obsidian-dnd-character run check`: passing post-P4-T007 (typecheck, lint, 2294/2294 tests across 63 files).
- `npm --prefix obsidian-dnd-character run build`: passing post-P4-T007.
- Tests: 2294 passing.

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
- Completed Phase 4 task commits: P4-T001 — see Git history for P4-T001; P4-T002 — see Git history for P4-T002; P4-T003 — see Git history for P4-T003; P4-T004 — see Git history for P4-T004; P4-T005 — see Git history for P4-T005; P4-T006 — see Git history for P4-T006; P4-T007 — see Git history for P4-T007
- Current task: P4-T008
- Current retry: 0
- Gate status: P4-T007 complete; P4-T008 ready to begin.
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

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
