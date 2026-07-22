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

- [ ] One root command runs all static checks and tests.
- [ ] No application code exists without strict compilation.

---

# Phase 2 — Domain and normalized catalog contracts

## Goal

Define stable project-owned schemas before importing source data.

- [ ] **P2-T001 — Implement branded IDs and common enums**
- [ ] **P2-T002 — Implement ruleset and source-policy types**
- [ ] **P2-T003 — Implement catalog manifest runtime schema**
- [ ] **P2-T004 — Implement source metadata schema**
- [ ] **P2-T005 — Implement entity summary schema**
- [ ] **P2-T006 — Implement safe render-node schema**
- [ ] **P2-T007 — Implement prerequisites and query schema**
- [ ] **P2-T008 — Implement choice-definition schema**
- [ ] **P2-T009 — Implement effect discriminated union**
- [ ] **P2-T010 — Implement class progression/grant schema**
- [ ] **P2-T011 — Implement species/background/feat/spell/item schemas**
- [ ] **P2-T012 — Add schema version constants**
- [ ] **P2-T013 — Add round-trip and invalid-input tests**

For each task:

- Output: TypeScript type, runtime validator, positive fixture, negative fixture.
- Accept: no `any`; exhaustive unions; documented compatibility behavior.

### Phase 2 gate

- [ ] A hand-authored normalized catalog fixture validates.
- [ ] Contracts contain no raw 5eTools-specific fields.

---

# Phase 3 — Catalog builder ingestion foundation

## Goal

Read and resolve raw source generically without generating final entities yet.

- [ ] **P3-T001 — Implement builder configuration**
  - Clone path, output path, included rulesets, content policy, build mode.

- [ ] **P3-T002 — Implement source manifest reader**
  - Verify Git repository and capture commit.

- [ ] **P3-T003 — Implement raw JSON loader**
  - Safe path handling, parse diagnostics, file inventory.

- [ ] **P3-T004 — Implement raw boundary validation**
  - Use `unknown`; retain only fields required by importers.

- [ ] **P3-T005 — Implement canonical reference parser**
  - Parse pipe-delimited entity references into structured keys.

- [ ] **P3-T006 — Implement `_copy` resolver**
  - Resolve base entity by structured identity.

- [ ] **P3-T007 — Implement `_mod` operations used by included data**
  - Each supported operation requires fixtures and tests.
  - Unknown operations fail the build.

- [ ] **P3-T008 — Implement `_preserve` behavior**
- [ ] **P3-T009 — Implement `_versions` expansion**
- [ ] **P3-T010 — Detect inheritance cycles**
- [ ] **P3-T011 — Emit resolved-record debug fixtures**
- [ ] **P3-T012 — Produce ingestion diagnostic report**

### Phase 3 gate

- [ ] Representative race/background/class records resolve without name exceptions.
- [ ] Unknown source mechanics fail with actionable diagnostics.

---

# Phase 4 — Catalog normalization and publication

## Goal

Generate a valid versioned catalog using stable contracts.

- [ ] **P4-T001 — Implement ruleset classifier**
- [ ] **P4-T002 — Implement record-level core/source classifier**
- [ ] **P4-T003 — Implement source metadata normalizer**
- [ ] **P4-T004 — Implement species normalizer**
- [ ] **P4-T005 — Implement background normalizer**
- [ ] **P4-T006 — Implement class index loader**
- [ ] **P4-T007 — Implement class normalizer**
- [ ] **P4-T008 — Implement subclass normalizer**
- [ ] **P4-T009 — Implement class-feature normalizer**
- [ ] **P4-T010 — Implement subclass-feature normalizer**
- [ ] **P4-T011 — Implement feat normalizer**
- [ ] **P4-T012 — Implement optional-feature normalizer**
- [ ] **P4-T013 — Implement spell normalizer**
- [ ] **P4-T014 — Implement spell relation builder**
- [ ] **P4-T015 — Implement item/base-item normalizer**
- [ ] **P4-T016 — Implement skills and languages normalizers**
- [ ] **P4-T017 — Implement canonical ID generator**
- [ ] **P4-T018 — Implement global reference resolver**
- [ ] **P4-T019 — Implement compact indexes**
- [ ] **P4-T020 — Implement checksums and manifest generation**
- [ ] **P4-T021 — Implement validation/inventory reports**
- [ ] **P4-T022 — Implement atomic revision publication**
- [ ] **P4-T023 — Add golden catalog build tests**

Each entity normalizer must:

- accept a resolved raw record;
- produce one normalized entity or an explicit exclusion diagnostic;
- never branch by entity name;
- preserve narrative content as safe render nodes;
- produce structured effects/choices only from structured source fields;
- record unsupported structured mechanics as build diagnostics.

### Phase 4 gate

- [ ] Zero duplicate IDs.
- [ ] Zero unresolved references for included entities.
- [ ] Both rulesets represented.
- [ ] Core access classification verified against fixtures.
- [ ] Build is reproducible for the same source commit/configuration.

---

# Phase 5 — Docker catalog server

## Goal

Serve immutable catalog revisions safely and simply.

- [ ] **P5-T001 — Create static server container**
- [ ] **P5-T002 — Create Docker Compose service**
- [ ] **P5-T003 — Mount generated catalog read-only**
- [ ] **P5-T004 — Configure cache headers**
  - Short/no-cache for `current.json`; immutable long cache for revision files.

- [ ] **P5-T005 — Add health check**
- [ ] **P5-T006 — Add local HTTPS/VPN deployment notes**
- [ ] **P5-T007 — Test desktop and mobile-reachable URLs**
- [ ] **P5-T008 — Document update/rollback procedure**

### Phase 5 gate

- [ ] Plugin-independent HTTP test can retrieve and validate a complete revision.
- [ ] Previous revision can be restored without rebuilding plugin.

---

# Phase 6 — Obsidian plugin foundation

## Goal

Create the mobile-compatible plugin skeleton using verified public APIs.

- [ ] **P6-T001 — Scaffold from official sample structure**
- [ ] **P6-T002 — Create `manifest.json` and versions policy**
- [ ] **P6-T003 — Configure esbuild and strict TypeScript**
- [ ] **P6-T004 — Implement plugin lifecycle**
- [ ] **P6-T005 — Implement settings schema and defaults**
- [ ] **P6-T006 — Implement settings tab**
- [ ] **P6-T007 — Register empty character-sheet view**
- [ ] **P6-T008 — Add command to open right sidebar view**
- [ ] **P6-T009 — Register cleanup-safe events**
- [ ] **P6-T010 — Update API usage register for every symbol**
- [ ] **P6-T011 — Manual desktop smoke test**
- [ ] **P6-T012 — Manual mobile smoke test**

### Phase 6 gate

- [ ] Plugin loads/unloads cleanly.
- [ ] View opens in documented right leaf.
- [ ] No undocumented API usage.
- [ ] `isDesktopOnly` remains false.

---

# Phase 7 — Catalog client and runtime cache

## Goal

Connect the plugin to compatible catalog revisions and support offline cached use.

- [ ] **P7-T001 — Implement catalog client interface**
- [ ] **P7-T002 — Implement `requestUrl` transport**
- [ ] **P7-T003 — Implement connection test**
- [ ] **P7-T004 — Validate `current.json` and manifest**
- [ ] **P7-T005 — Implement supported-schema negotiation**
- [ ] **P7-T006 — Download and validate source metadata**
- [ ] **P7-T007 — Download and validate indexes**
- [ ] **P7-T008 — Lazy-load entity details**
- [ ] **P7-T009 — Implement cache envelopes**
- [ ] **P7-T010 — Implement cache invalidation**
- [ ] **P7-T011 — Implement offline fallback**
- [ ] **P7-T012 — Implement revision activation validation**
- [ ] **P7-T013 — Display catalog status in settings**
- [ ] **P7-T014 — Add transport/cache tests with mocked responses**

### Phase 7 gate

- [ ] A compatible catalog activates.
- [ ] An incompatible catalog is rejected without losing current cache.
- [ ] Cached entity can be loaded with server stopped.

---

# Phase 8 — Character contract, migration, and repository

## Goal

Persist authoritative character state safely in the vault.

- [ ] **P8-T001 — Implement character runtime schema**
- [ ] **P8-T002 — Implement character serializer**
- [ ] **P8-T003 — Implement schema migration framework**
- [ ] **P8-T004 — Implement configurable character folder creation**
- [ ] **P8-T005 — Implement character create**
- [ ] **P8-T006 — Implement character read/list**
- [ ] **P8-T007 — Implement atomic character mutation using `Vault.process`**
- [ ] **P8-T008 — Implement trash/delete policy**
- [ ] **P8-T009 — Implement in-memory character index**
- [ ] **P8-T010 — Register vault create/modify/delete/rename events**
- [ ] **P8-T011 — Implement corrupt-file diagnostics**
- [ ] **P8-T012 — Add persistence and migration tests**

### Phase 8 gate

- [ ] Characters survive restart and external file edits.
- [ ] Invalid data cannot silently enter domain state.
- [ ] Atomic update test passes.

---

# Phase 9 — Deterministic rules engine

## Goal

Calculate the initial character sheet with explanation traces.

- [ ] **P9-T001 — Implement effect collection order**
- [ ] **P9-T002 — Implement total level and proficiency bonus**
- [ ] **P9-T003 — Implement ability scores/modifiers**
- [ ] **P9-T004 — Implement proficiencies and expertise**
- [ ] **P9-T005 — Implement saving throws**
- [ ] **P9-T006 — Implement skills and passive values**
- [ ] **P9-T007 — Implement movement and senses**
- [ ] **P9-T008 — Implement maximum HP**
- [ ] **P9-T009 — Implement armor class**
- [ ] **P9-T010 — Implement initiative**
- [ ] **P9-T011 — Implement attacks**
- [ ] **P9-T012 — Implement defenses**
- [ ] **P9-T013 — Implement spellcasting totals and slot maxima**
- [ ] **P9-T014 — Implement feature resources**
- [ ] **P9-T015 — Implement contribution traces**
- [ ] **P9-T016 — Implement unsupported-mechanic diagnostics**
- [ ] **P9-T017 — Add 2014 and 2024 golden-character tests**

### Phase 9 gate

- [ ] Same inputs always produce identical snapshot.
- [ ] Important totals explain their contributors.
- [ ] No derived total is required in persisted character JSON.

---

# Phase 10 — Character creator

## Goal

Create valid level-one characters through a dependency-aware modal.

- [ ] **P10-T001 — Implement draft state model**
- [ ] **P10-T002 — Implement step controller**
- [ ] **P10-T003 — Implement ruleset step**
- [ ] **P10-T004 — Implement source profile/source selection step**
- [ ] **P10-T005 — Implement identity step**
- [ ] **P10-T006 — Implement species search and selection**
- [ ] **P10-T007 — Implement species choices**
- [ ] **P10-T008 — Implement background selection and choices**
- [ ] **P10-T009 — Implement class selection and starting grants**
- [ ] **P10-T010 — Implement ability-score methods**
- [ ] **P10-T011 — Implement proficiency/language choices**
- [ ] **P10-T012 — Implement starting equipment choices**
- [ ] **P10-T013 — Implement spell eligibility query**
- [ ] **P10-T014 — Implement spell selection controls**
- [ ] **P10-T015 — Implement dependency invalidation**
- [ ] **P10-T016 — Implement unresolved-choice diagnostics**
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
- [ ] **P11-T005 — Implement abilities/saves/skills sections**
- [ ] **P11-T006 — Implement actions/attacks section**
- [ ] **P11-T007 — Implement spells and slot controls**
- [ ] **P11-T008 — Implement features/resources section**
- [ ] **P11-T009 — Implement conditions/death saves/hit dice**
- [ ] **P11-T010 — Implement short-rest command**
- [ ] **P11-T011 — Implement long-rest command**
- [ ] **P11-T012 — Implement rerender event flow**
- [ ] **P11-T013 — Add accessible labels and keyboard behavior**
- [ ] **P11-T014 — Add narrow-sidebar CSS tests/manual checklist**

### Phase 11 gate

- [ ] All interactive state persists immediately and safely.
- [ ] View updates without reopen.
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
- [ ] **P12-T007 — Implement armor calculation integration**
- [ ] **P12-T008 — Implement weapon attack integration**
- [ ] **P12-T009 — Implement item contribution traces**
- [ ] **P12-T010 — Add multiple-instance regression tests**

### Phase 12 gate

- [ ] Equipping/unequipping changes only effects from that item instance.
- [ ] Invalid equipment conflicts are explained.

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
