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

- `npm run check`: passing at Phase 3 corrective follow-up
- `npm run build`: passing at Phase 3 corrective follow-up
- Tests: 1615 passing

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

- Phase starting commit: b3598ccf62be42eddff2eaf9302ca636762f686c
- Completed Phase 4 task commits: P4-T001 — see Git history for P4-T001; P4-T002 — see Git history for P4-T002; P4-T003 — see Git history for P4-T003; P4-T004 — see Git history for P4-T004
- Current task: P4-T005
- Current retry: 0
- Gate status: not evaluated
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

2026-07-25 — Phase 3 multi-collection corrective follow-up
Summary: Repaired two defects in the Phase 3 multi-collection raw-boundary implementation. (1) `expandVersions` previously merged all expanded records into the first collection, destroying logical collection separation. Fixed by introducing per-collection expansion via `expandCollection`, so each collection's expanded records remain in their original entityKind. Version expansion now preserves collection separation, original ordering, physical filePath, non-versioned records, and input envelope immutability. Record counts are recalculated per collection and per file. (2) `INVALID_RECORD_ENVELOPE` and `NON_OBJECT_RECORD` diagnostics previously omitted logical collection identity. Fixed by adding structured `entityKind`, `recordIndex`, and optional `recordName` fields to `RawBoundaryDiagnostic`. An invalid record in one collection no longer removes or invalidates valid sibling collections.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/versions-expander.test.ts apps/catalog-builder/src/raw-boundary.test.ts` passes (104/104 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1615/1615 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Physical-file/logical-collection contract confirmed: a single physical JSON file may contain multiple logical collections (race/subrace, class/subclass/classFeature/subclassFeature). Each collection is identified by its entityKind key and validated, expanded, and diagnosed independently. No records cross collection boundaries during version expansion. No normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, structured _copy identity matching, _preserve behavior, semantic mappings, or entity normalizers were modified.
Commit: see Git history for Phase 3 ingestion corrective follow-up.

2026-07-25 — P4-T004 — Implement semantic mapping and projection infrastructure
Summary: Added catalog-builder semantic mapping and projection infrastructure with versioned, runtime-validated reviewed semantic mappings keyed by canonical entity ID and ruleset, default projections by normalized mechanic type (covering all 18 RuleEffectType values), detection helpers for display-name branching and executable content, registry validation with duplicate and schema-version checks, single and batch resolution with diagnostics, and frozen output types.
Validation: `npm --prefix obsidian-dnd-character run test -- apps/catalog-builder/src/semantic-mapping.test.ts apps/catalog-builder/src/semantic-mapping-resolution.test.ts apps/catalog-builder/src/projection-defaults.test.ts` passes (1591/1591 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1591/1591 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Semantic mapping and projection infrastructure remains inside the catalog-builder boundary and does not change normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, or entity normalizer behavior. Shared foundation for downstream Phase 4 entity normalizers.
Commit: see Git history for P4-T004.

2026-07-25 — P4-T003 — Implement source metadata normalizer
Summary: Added a catalog-builder source metadata normalizer that consumes ruleset and record-access classifications, emits deterministic frozen metadata grouped by ruleset/source/access, records manifest and record provenance, and reports upstream ruleset exclusions or invalid source metadata as explicit diagnostics.
Validation: `npm --prefix obsidian-dnd-character run test -- source-metadata-normalizer.test.ts` passes (3/3 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1522/1522 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Source metadata normalization remains inside the catalog-builder boundary and does not change normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, semantic mapping infrastructure, or entity normalizer behavior.
Commit: see Git history for P4-T003.

2026-07-25 — P4-T002 — Implement record-level core/source classifier
Summary: Added a catalog-builder record access classifier that derives record-level core versus source access from ruleset-specific structured core markers after ruleset classification, preserves source/ruleset/record provenance, and keeps unsupported or cross-ruleset markers from granting core access.
Validation: `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/record-access-classifier.test.ts` passes (7/7 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1519/1519 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Record access classification remains inside the catalog-builder boundary and does not change normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, or later Phase 4 normalizer behavior. The classifier is not wired into catalog publication yet; later Phase 4 tasks will consume the exported foundation.
Commit: see Git history for P4-T002.

2026-07-25 — P4-T001 — Implement ruleset classifier
Summary: Added a catalog-builder ruleset classifier foundation with reviewed source-to-ruleset mappings for 2014 and 2024 core source abbreviations, deterministic batch classification, represented-ruleset reporting, included-ruleset filtering, and explicit diagnostics for invalid, unknown, or excluded sources.
Validation: `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/ruleset-classifier.test.ts` passes (7/7 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1512/1512 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Ruleset classification remains inside the catalog-builder boundary and does not change normalized catalog schemas, canonical ID construction, source-policy semantics, Obsidian API use, or later Phase 4 normalizer behavior. The reviewed source map is intentionally limited to PHB/DMG/MM and XPHB/XDMG/XMM until later source metadata work expands classification.
Commit: see Git history for P4-T001.

2026-07-25 — Phase 3 gate — complete
Summary: Verified all Phase 3 gate criteria. Representative race, background, and class preserve records resolve without name exceptions; unknown `_mod` mechanics report source path, entity, field target, and mode; unclaimed candidate mechanical fields are reported before normalization without narrative auto-classification; and raw 5eTools-shaped fields remain confined to catalog-builder diagnostics/fixtures.
Validation: `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/copy-preserve-resolver.test.ts apps/catalog-builder/src/mod-copy-resolver.test.ts apps/catalog-builder/src/ingestion-diagnostic-report.test.ts apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts apps/catalog-builder/src/raw-boundary.test.ts` passes (97/97 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1505/1505 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Limitations: Phase 3 intentionally stops at ingestion, inheritance resolution, debug fixtures, and diagnostics. Catalog normalization and publication begin in Phase 4.
Next phase: Phase 4 — Catalog normalization and publication.
Commit: see Git history for Phase 3 gate.

2026-07-25 — P3-T012 — Produce ingestion diagnostic report
Summary: Added a catalog-builder ingestion diagnostic report for JSON parse failures, copy and `_mod` resolution failures, field inventory by entity type, future-importer claimed fields, and unclaimed candidate mechanical fields without automatically classifying unclaimed fields as narrative.
Validation: `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/ingestion-diagnostic-report.test.ts` passes (7/7 tests, EXIT 0). `npm --prefix obsidian-dnd-character exec vitest run apps/catalog-builder/src/mod-copy-resolver.test.ts apps/catalog-builder/src/resolved-record-debug-fixtures.test.ts apps/catalog-builder/src/copy-resolver.test.ts apps/catalog-builder/src/versions-expander.test.ts` passes (53/53 tests, EXIT 0). `npm --prefix obsidian-dnd-character run check` passes (typecheck + lint + 1505/1505 tests, EXIT 0). `npm --prefix obsidian-dnd-character run build` passes (EXIT 0).
Compatibility notes: Diagnostic reporting remains inside the catalog-builder boundary. Future-importer claims are report-local and do not change normalized catalog contracts, raw-boundary policy, source redistribution, or Obsidian API use.
Commit: see Git history for P3-T012.

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
