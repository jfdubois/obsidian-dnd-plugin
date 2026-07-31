# Project Status

## Current phase

Phase 4 — Catalog normalization and publication

## Current task

Phase 4 gate — Catalog normalization and publication gate

## Last completed task

P4-T024 — Add golden catalog build tests

## Branch baseline

- Branch: `dev`
- Last synchronized commit: 595282b
- Working tree expected: clean

## Blockers

None recorded.

## Validation baseline

- `npm --prefix obsidian-dnd-character run check`: passing post-P4-T024 (typecheck, lint, 2778/2780 tests across 99 files, 2 skipped).
- `npm --prefix obsidian-dnd-character run build`: passing post-P4-T024.
- Tests: 2778 passing.

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
- Completed Phase 4 task commits: P4-T001 — see Git history for P4-T001; P4-T002 — see Git history for P4-T002; P4-T003 — see Git history for P4-T003; P4-T004 — see Git history for P4-T004; P4-T005 — see Git history for P4-T005; P4-T006 — see Git history for P4-T006; P4-T007 — see Git history for P4-T007; P4-T008 — see Git history for P4-T008; P4-T009 — see Git history for P4-T009; P4-T010 — see Git history for P4-T010; P4-T011 — see Git history for P4-T011; P4-T012 — see Git history for P4-T012; P4-T013 — see Git history for P4-T013; P4-T014 — see Git history for P4-T014; P4-T015 — see Git history for P4-T015; P4-T016 — see Git history for P4-T016; P4-T017 — see Git history for P4-T017; P4-T018 — see Git history for P4-T018; P4-T019 — see Git history for P4-T019; P4-T020 — see Git history for P4-T020; P4-T021 — see Git history for P4-T021; P4-T022 — see Git history for P4-T022; P4-T023 — see Git history for P4-T023; P4-T024 — see Git history for P4-T024
- Current task: Phase 4 gate
- Current retry: 0
- Gate status: P4-T024 complete; Phase 4 gate ready to begin.
- Blocking issue: none

## Recent work

Only the latest three task or gate entries are retained here. Older entries are stored in `docs/PROJECT_HISTORY.md`.

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
