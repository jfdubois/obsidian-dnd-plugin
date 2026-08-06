# 04 — Development Roadmap and Task Checklist

This file is the execution source of truth. Complete tasks sequentially unless an explicit dependency-safe change is approved.

## Status conventions

- `[ ]` Not started.
- `[-]` In progress. Only one task should normally be in progress.
- `[x]` Complete and validated.
- `[!]` Blocked. Record reason in `docs/PROJECT_STATUS.md`.

A phase is complete only when every task and the phase gate are complete.

---

# Phase 0 — Governance and pinned inputs

## Goal

Create a reproducible project foundation and prevent API/source ambiguity.

- [x] **P0-T001 — Create repository skeleton**
  - Create root documents, `apps/`, `packages/`, `docs/`, `references/`, `scripts/`, and `fixtures/`.
  - Output: committed directory structure and root README.
  - Accept: clean clone shows all controlling documents.

- [x] **P0-T002 — Establish branch and commit policy**
  - Configure `main` as release branch and `dev` as integration branch.
  - Document feature-branch and commit naming rules.
  - Accept: policy added to engineering SOP and repository README.

- [x] **P0-T003 — Pin Obsidian references**
  - Save the current official `obsidian.d.ts` and official sample-plugin reference files under `references/obsidian/`.
  - Record retrieval date and upstream commit or immutable URL.
  - Accept: hashes recorded in `references/obsidian/SOURCE.md`.

- [x] **P0-T004 — Pin D&D Beyond fixture**
  - Save the provided character JSON as an immutable test/reference fixture.
  - Record that it is a hydrated behavioral reference, not an API contract.
  - Accept: fixture checksum and source note recorded.

- [x] **P0-T005 — Pin 5eTools clone**
  - Clone the configured source repository locally.
  - Record exact Git commit.
  - Do not copy the full source into the project repository unless explicitly intended.
  - Accept: builder configuration can locate a clone and report the commit.

- [x] **P0-T006 — Create decision and risk register**
  - Initialize architecture decisions and current risks.
  - Accept: ADR-001 through ADR-006 from the supplied pack are reviewed and marked accepted or revised.

- [x] **P0-T007 — Create API usage register**
  - Create `docs/API_USAGE.md` with template and initial verified symbols.
  - Accept: no implementation API may be used without an entry.

### Phase 0 gate

- [x] Exact source revisions and API contract are reproducible.
- [x] No code work begins while source or licensing policy is ambiguous.

---

# Phase 1 — Monorepo and quality baseline

## Goal

Create a strict TypeScript workspace with independent build/test targets.

- [x] **P1-T001 — Initialize npm workspace**
  - Add root `package.json`, lockfile, workspace configuration, and shared scripts.
  - Accept: `npm install` completes from clean clone.

- [x] **P1-T002 — Add shared TypeScript configuration**
  - Enable strict mode, no implicit returns, no fallthrough, unchecked indexed access, isolated modules, and consistent casing.
  - Accept: empty packages compile.

- [x] **P1-T003 — Add ESLint and formatting checks**
  - Include Obsidian-specific lint plugin for the plugin package.
  - Accept: root lint command passes.

- [x] **P1-T004 — Add unit test framework**
  - Configure a TypeScript unit test runner and coverage reporting.
  - Accept: sample test passes in every shared package.

- [x] **P1-T005 — Add CI workflow**
  - Run install, typecheck, lint, unit tests, and builds.
  - Accept: CI passes on `dev`.

- [x] **P1-T006 — Add package boundaries**
  - Create package manifests and dependency constraints for domain, catalog contract, character contract, rules engine, builder, server, and plugin.
  - Accept: forbidden dependency direction is documented and linted where practical.

### Phase 1 gate

- [x] One root command runs all static checks and tests.
- [x] No application code exists without strict compilation.

---

# Phase 2 — Domain and normalized catalog contracts

## Goal

Define stable project-owned schemas before importing source data.

- [x] **P2-T001 — Implement branded IDs and common enums**
- [x] **P2-T002 — Implement ruleset and source-policy types**
- [x] **P2-T003 — Implement catalog manifest runtime schema**
- [x] **P2-T004 — Implement source metadata schema**
- [x] **P2-T005 — Implement entity summary schema**
- [x] **P2-T006 — Implement safe render-node schema**
- [x] **P2-T007 — Implement prerequisites and query schema**
- [x] **P2-T008 — Implement choice-definition schema**
- [x] **P2-T009 — Implement effect discriminated union**
- [x] **P2-T010 — Implement class progression/grant schema**
- [x] **P2-T011 — Implement species/background/feat/spell/item schemas**
- [x] **P2-T012 — Add schema version constants**
- [x] **P2-T013 — Add round-trip and invalid-input tests**

For each task:

- Output: TypeScript type, runtime validator, positive fixture, negative fixture.
- Accept: no `any`; exhaustive unions; documented compatibility behavior.

### Phase 2 gate

- [x] A hand-authored normalized catalog fixture validates.
- [x] Contracts contain no raw 5eTools-specific fields.

---

# Phase 3 — Catalog builder ingestion foundation

## Goal

Read and resolve raw source generically without generating final entities yet.

- [X] **P3-T000 — Extend semantic effect and sheet-projection contracts**
  - Add automation-status types.
  - Add sheet-projection types.
  - Add effect provenance.
  - Add conditional-roll effects.
  - Add explicit immunity definitions.
  - Add capability effects.
  - Update runtime validators, factories, exports, fixtures, and tests.
  - Update architecture, requirements, SOP, decision register, and acceptance matrix.
  - Accept: npm run check and npm run build pass; existing effects are migrated; representative synthetic fixtures validate conditional saving-throw, defense, capability, and feature projections.

- [X] **P3-T001 — Implement builder configuration**
  - Clone path, output path, included rulesets, content policy, build mode.

- [X] **P3-T002 — Implement source manifest reader**
  - Verify Git repository and capture commit.

- [X] **P3-T003 — Implement raw JSON loader**
  - Safe path handling, parse diagnostics, file inventory.

- [X] **P3-T004 — Implement raw boundary validation**
  - Accept raw values as unknown.
  - Validate file and record envelopes before use.
  - Preserve builder-only resolved data required by later importers.
  - Prevent raw fields from crossing into normalized catalog contracts.
  - Record unclaimed structured fields instead of silently discarding them.

- [X] **P3-T005 — Implement canonical reference parser**
  - Parse pipe-delimited entity references into structured keys.

- [X] **P3-T006 — Implement _copy resolver**
  - Resolve base entity by structured identity.

- [X] **P3-T007 — Implement _mod operations used by included data**
  - [X] **P3-T007-S1 — Shared contracts and array operations**
    - Modes: appendArr, appendIfNotExistsArr, insertArr, prependArr, removeArr, renameArr, replaceArr.
  - [X] **P3-T007-S2 — Scalar, property, text, and size operations**
    - Modes: maxSize, prefixSuffixStringProp, replaceTxt, scalarAddDc, scalarAddHit, scalarAddProp, scalarMultProp, scalarMultXp, setProp.
  - [X] **P3-T007-S3 — Senses and skills operations**
    - Modes: addSenses, addSkills.
  - [X] **P3-T007-S4 — Spell operations**
    - Modes: addSpells, removeSpells, replaceSpells.
  - [X] **P3-T007-S5 — Dispatcher, cloning, diagnostics, and _copy integration**
    - Apply every supported operation after _copy resolution.
    - Preserve the original base/input record.
    - Unknown and malformed operations fail with actionable diagnostics.
  - Each slice requires resulting-state and malformed-payload tests.
  - P3-T007 is complete only after all five slices and CAT-003, CAT-003A, CAT-003B, and CAT-004 pass.

- [X] **P3-T008 — Implement _preserve behavior**

- [X] **P3-T009 — Implement _versions expansion**

- [X] **P3-T010 — Detect inheritance cycles**

- [X] **P3-T011 — Emit resolved-record debug fixtures**
  - Include source path, structured identity, inheritance chain, and resolved field inventory.
  - Confirm that raw fields remain confined to catalog-builder fixtures.

- [X] **P3-T012 — Produce ingestion diagnostic report**
  - Report parse and resolution failures.
  - Inventory observed structured fields by entity type.
  - Identify fields claimed by a future importer.
  - Identify unclaimed candidate mechanical fields.
  - Never classify unclaimed fields as narrative automatically.

### Phase 3 gate

- [X] Representative race/background/class records resolve without name exceptions.
- [X] Unknown source mechanics fail with actionable diagnostics.
- [X] No candidate structured mechanic is silently discarded before normalization or explicitly classified as unsupported.
- [X] Raw 5eTools fields remain confined to the catalog-builder boundary.

---

# Phase 4 — Catalog normalization and publication

## Goal

Generate a valid versioned catalog using stable contracts.

- [x] **P4-T001 — Implement ruleset classifier**

- [x] **P4-T002 — Implement record-level core/source classifier**

- [x] **P4-T003 — Implement source metadata normalizer**

- [x] **P4-T004 — Implement semantic mapping and projection infrastructure**
  - Implement versioned, runtime-validated reviewed semantic mappings.
  - Key mappings by canonical entity or feature ID and ruleset.
  - Record structured or reviewed-mapping provenance.
  - Implement default projections by normalized mechanic type.
  - Reject executable content and display-name branches.
  - Emit diagnostics for unmatched, invalid, or stale mappings.

- [x] **P4-T005 — Implement species normalizer**
  - Core species from PHB and XPHB only (see ADR-011).
  - Retain source size information as display text or metadata; no structured size-selection mechanic (see ADR-010).
  - Use shared deterministic ID helper; no private species-only algorithm (see ADR-012).
  - Excluded sources produce explicit diagnostics.

- [ ] **P4-T005A — Implement structured species size selection**
  - Follow-up to P4-T005 (deferred by ADR-010).
  - Add structured size-selection mechanic for species that offer multiple descriptive size possibilities.
  - Character-selected size becomes a persisted choice rather than display-only text.

- [ ] **P4-T005B — Implement reviewed optional-source ruleset registry**
  - Follow-up to P4-T005 (deferred by ADR-011).
  - Create a reviewed registry mapping optional sources to their supported rulesets.
  - Expand species normalizer (and subsequent normalizers) to process registered optional sources.
  - Excluded sources continue to produce explicit diagnostics until registered.

- [x] **P4-T006 — Implement background normalizer**

- [x] **P4-T007 — Implement class index loader**

- [x] **P4-T008 — Implement class normalizer**

- [x] **P4-T009 — Implement subclass normalizer**

- [x] **P4-T010 — Implement class-feature normalizer**

- [x] **P4-T011 — Implement subclass-feature normalizer**

- [x] **P4-T012 — Implement feat normalizer**

- [x] **P4-T013 — Implement optional-feature normalizer**

- [x] **P4-T014 — Implement spell normalizer**

- [x] **P4-T015 — Implement spell relation builder**

- [x] **P4-T016 — Implement item/base-item normalizer**

- [x] **P4-T017 — Implement skills and languages normalizers**

- [x] **P4-T018 — Implement canonical ID generator**

- [x] **P4-T019 — Implement global reference resolver**

- [x] **P4-T020 — Implement compact indexes**

- [x] **P4-T021 — Implement checksums and manifest generation**

- [x] **P4-T022 — Implement validation/inventory reports**

- [x] **P4-T023 — Implement atomic revision publication**

- [x] **P4-T024 — Add golden catalog build tests**

Each entity normalizer must:
  - accept a resolved raw record;
  - produce one normalized entity or an explicit exclusion diagnostic;
  - never branch by entity name or display feature name;
  - preserve narrative content as safe render nodes;
  - produce structured effects and choices from supported structured source fields;
  - apply only runtime-validated reviewed semantic mappings;
  - assign automation status;
  - assign primary and optional secondary projections;
  - record effect provenance;
  - record unsupported structured mechanics as build diagnostics;
  - retain unmapped narrative mechanics as display content;
  - never claim full automation when unsupported narrative remains.

### Phase 4 gate

- [x] Zero duplicate IDs.
- [x] Zero unresolved references for included entities.
- [x] Both rulesets represented.
- [x] Core access classification verified against fixtures.
- [x] Every emitted effect has automation status, provenance, and projection metadata.
- [x] Unmapped narrative mechanics remain visible with diagnostics.
- [x] Build is reproducible for the same source commit/configuration.

---

# Phase 5 — Docker catalog server

## Goal

Serve immutable catalog revisions safely and simply.

- [x] **P5-T001 — Create static server container**
- [x] **P5-T002 — Create Docker Compose service**
- [x] **P5-T003 — Mount generated catalog read-only**
- [x] **P5-T004 — Configure cache headers**
  - Short/no-cache for `current.json`; immutable long cache for revision files.

- [x] **P5-T005 — Add health check**
- [x] **P5-T006 — Add local HTTPS/VPN deployment notes**
- [x] **P5-T007 — Test desktop and mobile-reachable URLs**
- [x] **P5-T008 — Document update/rollback procedure**

### Phase 5 gate

- [x] Plugin-independent HTTP test can retrieve and validate a complete revision.
- [x] Previous revision can be restored without rebuilding plugin.

---

# Phase 6 — Obsidian plugin foundation

## Goal

Create the mobile-compatible plugin skeleton using verified public APIs.

- [x] **P6-T001 — Scaffold from official sample structure**
- [x] **P6-T002 — Create `manifest.json` and versions policy**
- [x] **P6-T003 — Configure esbuild and strict TypeScript**
- [x] **P6-T004 — Implement plugin lifecycle**
- [x] **P6-T005 — Implement settings schema and defaults**
- [x] **P6-T006 — Implement settings tab**
- [x] **P6-T007 — Register empty character-sheet view**
- [x] **P6-T008 — Add command to open right sidebar view**
- [x] **P6-T009 — Register cleanup-safe events**
- [x] **P6-T010 — Update API usage register for every symbol**
- [x] **P6-T011 — Manual desktop smoke test**
- [x] **P6-T012 — Manual mobile smoke test**

### Phase 6 gate

- [x] Plugin loads/unloads cleanly.
- [x] View opens in documented right leaf.
- [x] No undocumented API usage.
- [x] `isDesktopOnly` remains false.

---

# Phase 7 — Catalog client and runtime cache

## Goal

Connect the plugin to compatible catalog revisions and support offline cached use.

- [x] **P7-T001 — Implement catalog client interface**
- [x] **P7-T002 — Implement `requestUrl` transport**
- [x] **P7-T003 — Implement connection test**
- [x] **P7-T004 — Validate `current.json` and manifest**
- [x] **P7-T005 — Implement supported-schema negotiation**
- [x] **P7-T006 — Download and validate source metadata**
- [x] **P7-T007 — Download and validate indexes**
- [x] **P7-T008 — Lazy-load entity details**
- [x] **P7-T009 — Implement cache envelopes**
- [x] **P7-T010 — Implement cache invalidation**
- [x] **P7-T011 — Implement offline fallback**
- [x] **P7-T012 — Implement revision activation validation**
- [x] **P7-T013 — Display catalog status in settings**
- [x] **P7-T014 — Add transport/cache tests with mocked responses**

### Phase 7 gate

- [x] A compatible catalog activates.
- [x] An incompatible catalog is rejected without losing current cache.
- [x] Cached entity can be loaded with server stopped.

---

# Phase 8 — Character contract, migration, and repository

## Goal

Persist authoritative character state safely in the vault.

- [x] **P8-T001 — Implement character runtime schema**
- [x] **P8-T002 — Implement character serializer**
- [x] **P8-T003 — Implement schema migration framework**
- [x] **P8-T004 — Implement configurable character folder creation**
- [x] **P8-T005 — Implement character create**
- [x] **P8-T006 — Implement character read/list**
- [x] **P8-T007 — Implement atomic character mutation using `Vault.process`**
- [x] **P8-T008 — Implement trash/delete policy**
- [x] **P8-T009 — Implement in-memory character index**
- [x] **P8-T010 — Register vault create/modify/delete/rename events**
- [x] **P8-T011 — Implement corrupt-file diagnostics**
- [x] **P8-T012 — Add persistence and migration tests**

### Phase 8 gate

- [x] Characters survive restart and external file edits.
- [x] Invalid data cannot silently enter domain state.
- [x] Atomic update test passes.

---

# Phase 9 — Deterministic rules engine

## Goal

Calculate the initial character sheet with explanation and provenance traces.

- [x] **P9-T001 — Implement effect collection order**
- [x] **P9-T002 — Implement total level and proficiency bonus**
- [x] **P9-T003 — Implement ability scores/modifiers**
- [x] **P9-T004 — Implement proficiencies and expertise**
- [x] **P9-T005 — Implement saving throws and conditional save effects**
- [x] **P9-T006 — Implement skills, passive values, and conditional skill effects**
- [x] **P9-T007 — Implement movement and senses**
- [x] **P9-T008 — Implement maximum HP**
- [x] **P9-T009 — Implement armor class**
- [x] **P9-T010 — Implement initiative**
- [x] **P9-T011 — Implement attacks**
- [x] **P9-T012 — Implement defenses, immunities, and capabilities**
- [x] **P9-T013 — Implement spellcasting totals and slot maxima**
- [x] **P9-T014 — Implement feature resources**
- [x] **P9-T015 — Implement contribution and provenance traces**
- [x] **P9-T016 — Implement unsupported-mechanic diagnostics**
- [x] **P9-T017 — Implement character-sheet projection index**
- [x] **P9-T018 — Add 2014 and 2024 golden-character tests**

### Phase 9 gate

- [x] Same inputs always produce identical snapshot.
- [x] Important totals explain their contributors.
- [x] Conditional effects identify their predicates and originating feature.
- [x] Defenses and capabilities remain semantically distinct.
- [x] Multiple projections do not cause an effect to be evaluated more than once.
- [x] No derived total or projection is required in persisted character JSON.

---

# Phase 10 — Character creator

## Goal

Create valid level-one characters through a dependency-aware modal.

- [x] **P10-T001 — Implement draft state model**
- [x] **P10-T002 — Implement step controller**
- [x] **P10-T003 — Implement ruleset step**
- [x] **P10-T004 — Implement source profile/source selection step**
- [x] **P10-T005 — Implement identity step**
- [x] **P10-T006 — Implement species search and selection**
- [x] **P10-T007 — Implement species choices**
- [x] **P10-T008 — Implement background selection and choices**
- [x] **P10-T009 — Implement proficiencies and languages step**
- [x] **P10-T010 — Implement ability-score methods**
- [x] **P10-T011 — Implement proficiency/language choices**
- [x] **P10-T012 — Implement starting equipment choices**
- [x] **P10-T013 — Implement spell eligibility query**
- [x] **P10-T014 — Implement spell selection controls**
- [x] **P10-T015 — Implement dependency invalidation**
- [x] **P10-T016 — Implement unresolved-choice diagnostics**
- [ ] **P10-T017 — Implement review snapshot**
- [ ] **P10-T018 — Implement atomic final save**
- [ ] **P10-T019 — Add creator state-machine tests**
- [ ] **P10-T020 — Complete desktop/mobile manual scenarios**

### Phase 10 gate

- [ ] Complete valid level-one character for each ruleset.
- [ ] Core content always appears.
- [ ] Non-selected source content does not appear.
- [ ] Upstream changes invalidate dependent selections explicitly.

---

# Phase 11 — Sidebar character sheet and commands

## Goal

Display and interact with a character during play.
- [ ] **P11-T001 — Implement active-character selector**
- [ ] **P11-T002 — Implement responsive header**
- [ ] **P11-T003 — Implement primary-stat cards**
- [ ] **P11-T004 — Implement HP controls**
- [ ] **P11-T005 — Implement abilities, saves, skills, and conditional roll sections**
- [ ] **P11-T006 — Implement defenses and capabilities section**
- [ ] **P11-T007 — Implement actions/attacks section**
- [ ] **P11-T008 — Implement spells and slot controls**
- [ ] **P11-T009 — Implement projected species traits, class features, feats, and resources**
- [ ] **P11-T010 — Implement conditions/death saves/hit dice**
- [ ] **P11-T011 — Implement short-rest command**
- [ ] **P11-T012 — Implement long-rest command**
- [ ] **P11-T013 — Implement rerender event flow**
- [ ] **P11-T014 — Add accessible labels and keyboard behavior**
- [ ] **P11-T015 — Add narrow-sidebar CSS tests/manual checklist**

### Phase 11 gate

- [ ] All interactive state persists immediately and safely.
- [ ] View updates without reopen.
- [ ] Conditional saving-throw effects appear in Saving Throws.
- [ ] Immunities and resistances appear in Defenses.
- [ ] Species capabilities and narrative traits appear in Species Traits.
- [ ] Display-only mechanics are marked non-automated.
- [ ] Every projected rule exposes its source feature.
- [ ] Mobile controls are usable.

---

# Phase 12 — Inventory and equipment engine

## Goal

Manage item instances and apply structured equipment effects.

- [ ] **P12-T001 — Implement item search/query**
- [ ] **P12-T002 — Implement add item instance**
- [ ] **P12-T003 — Implement quantity and removal**
- [ ] **P12-T004 — Implement equip/unequip validation**
- [ ] **P12-T005 — Implement attune/unattune validation**
- [ ] **P12-T006 — Implement containers and charges**
- [ ] **P12-T007 — Implement armor mechanical integration**
  - Activate armor effects only for the equipped item instance.
  - Resolve active body armor and shield composition.
  - Apply AC formulas and Dexterity rules.
  - Apply armor proficiency or training diagnostics.
  - Apply Strength requirements where defined by the active ruleset.
  - Apply conditional Stealth disadvantage.
  - Remove every contribution and conditional effect when unequipped.

- [ ] **P12-T008 — Implement weapon attack integration**
- [ ] **P12-T009 — Implement item contribution and projection traces**
  - Identify the originating item instance and catalog entity.
  - Project AC contributions to Armor Class.
  - Project conditional skill effects to Skills and Inventory.
  - Do not evaluate the same item effect more than once.

- [ ] **P12-T010 — Add multiple-instance regression tests**

### Phase 12 gate

- [ ] Adding an item without equipping it does not activate equipment effects.
- [ ] Equipping/unequipping changes only effects from that item instance.
- [ ] Unequipping armor removes its AC formula and all conditional penalties.
- [ ] Invalid equipment conflicts are explained.
- [ ] Item projections retain catalog and item-instance provenance.

---

# Phase 13 — Level-up, level reduction, and source management

## Goal

Safely alter progression using per-character content policy.

- [ ] **P13-T001 — Implement level-change plan builder**
- [ ] **P13-T002 — Implement gained/lost grant diff**
- [ ] **P13-T003 — Implement subclass-choice activation**
- [ ] **P13-T004 — Implement ASI/feat choice activation**
- [ ] **P13-T005 — Implement feature/optional-feature choices**
- [ ] **P13-T006 — Implement HP increase choice**
- [ ] **P13-T007 — Implement spell progression changes**
- [ ] **P13-T008 — Implement candidate cache and fingerprint**
- [ ] **P13-T009 — Implement level-up modal**
- [ ] **P13-T010 — Implement preview and atomic apply**
- [ ] **P13-T011 — Implement level reduction diagnostics**
- [ ] **P13-T012 — Implement safe level reduction transaction**
- [ ] **P13-T013 — Implement source-policy add operation**
- [ ] **P13-T014 — Derive required source dependencies**
- [ ] **P13-T015 — Implement blocked source removal**
- [ ] **P13-T016 — Implement replacement/removal transaction**
- [ ] **P13-T017 — Add multiclass baseline or formally defer it**
- [ ] **P13-T018 — Add progression/source-policy tests**

### Phase 13 gate

- [ ] Level-up exposes only eligible choices for that character.
- [ ] Deleting caches does not change authoritative progression.
- [ ] Source removal cannot orphan references.

---

# Phase 14 — Hardening and release

## Goal

Prepare a reliable initial release and operational process.

- [ ] **P14-T001 — Complete full acceptance matrix**
- [ ] **P14-T002 — Add performance measurements**
- [ ] **P14-T003 — Add error-report export**
- [ ] **P14-T004 — Verify catalog rollback**
- [ ] **P14-T005 — Verify character migrations**
- [ ] **P14-T006 — Security review of downloaded content rendering**
- [ ] **P14-T007 — Review Obsidian API usage register**
- [ ] **P14-T008 — Desktop compatibility test**
- [ ] **P14-T009 — Android/mobile compatibility test**
- [ ] **P14-T010 — Produce user/admin/developer documentation**
- [ ] **P14-T011 — Produce release files**
- [ ] **P14-T012 — Tag release and retain catalog revision**

### Phase 14 gate

- [ ] All P0-P14 phase gates pass.
- [ ] No critical/high open risk without explicit release acceptance.
