# Project Status

## Current phase

Phase 1 — Monorepo and quality baseline

## Current task

None selected.

## Last completed task

P1-T003 — Add ESLint and formatting checks

## Blockers

None recorded.

## Validation baseline

Not initialized.

## Catalog baseline

- 5eTools source commit: `3c5d9d3` pinned.
- Catalog schema version: not implemented.
- Active catalog revision: none.

## Plugin baseline

- Obsidian API snapshot: pinned (SHA-256 `ed358aa…`).
- Sample plugin: pinned at commit `23c165f`.
- Minimum app version: not selected.
- Plugin version: not initialized.

## Recent decisions

See `docs/08_DECISIONS_RISKS_REFERENCES.md`.

## Work log

2026-07-22 — P1-T003 — complete
Summary: Created root ESLint configuration (eslint.config.js) using ESLint 10.7.0 flat config with typescript-eslint 8.65.0. Enabled type-aware parsing via projectService. Configured strict rules: no-explicit-any (error), no-unused-vars with _ ignore pattern (error), consistent-type-imports (error), no-floating-promises (error), no-misused-promises (error), no-console (warn). Created root tsconfig.json extending tsconfig.base.json with workspace include patterns. Updated lint script to use eslint directly with --no-error-on-unmatched-pattern for graceful empty-workspace handling. Note: eslint-plugin-obsidianmd is deferred to Phase 6 when the plugin package is scaffolded (requires manifest.json).
Validation: `npm run lint` passes (EXIT 0). `npm run check` passes (EXIT 0). End-to-end test with temporary workspace package confirmed type-aware rules detect violations.
Commit: not committed.
Notes: Root config provides shared baseline. Workspace packages extend via projectService. The obsidianmd plugin will be added per-package in P6-T001 when the plugin scaffold is created.

2026-07-22 — P1-T002 — complete
Summary: Created tsconfig.base.json with shared strict compiler options: strict, noImplicitReturns, noFallthroughCasesInSwitch, noUncheckedIndexedAccess, isolatedModules, forceConsistentCasingInFileNames, ESNext module, ES2021 target, DOM+ES2021 lib. Added TypeScript 5.9.3 as root devDependency. Config validated via --showConfig — all strict options active and inherited correctly.
Validation: `npx tsc --showConfig` confirmed all strict options inherited. `npm run check` passes (EXIT 0).
Commit: not committed.
Notes: Base config has no `include` field; each workspace package extends it and provides its own `include`/`files`.

2026-07-22 — P1-T001 — complete
Summary: Created root package.json with npm workspaces config (apps/*, packages/*), engine pin (Node >=22), and shared scripts (check, typecheck, lint, test, build, dev:plugin, build:catalog, docker:catalog). Created scripts/run-workspaces.mjs helper that discovers workspace directories, skips missing packages, and runs named scripts in each workspace that defines them. All root scripts exit 0 with no workspace packages present.
Validation: `npm install` completes from clean state (EXIT 0). `npm run check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass with no workspaces (EXIT 0).
Commit: not committed.
Notes: Scripts use custom helper to avoid npm's "No workspaces found" error when workspace directories lack package.json. The helper will be replaced or simplified once P1-T006 creates package manifests.

2026-07-22 — Phase 0 gate — complete
Summary: Verified both gate criteria. (1) All source revisions reproducible: Obsidian API SHA-256 ed358aa…, sample plugin commit 23c165f with 5 file hashes, D&D Beyond fixture SHA-256 c26017d…, 5eTools commit 3c5d9d3 in SOURCE_COMMIT.txt, 17 API symbols verified in docs/API_USAGE.md. (2) No licensing ambiguity: ADR-001 through ADR-008 accepted, risk register R-001 through R-010 populated, D&D Beyond restrictions explicit, non-free content bundling prohibited, raw 5eTools isolated to catalog-builder.
Validation: manual review of all SOURCE.md files, hashes, commits, ADRs, and risk register.
Commit: not committed.
Notes: Phase 0 complete. Phase 1 (Monorepo and quality baseline) is now open.

2026-07-22 — P0-T007 — complete
Summary: Created docs/API_USAGE.md with template header and 17 verified Obsidian API symbols extracted from pinned references/obsidian/obsidian.d.ts. Signatures include requestUrl, Plugin.registerView, Workspace.getRightLeaf, WorkspaceLeaf.setViewState, Plugin.loadData, Plugin.saveData, Vault.cachedRead, Vault.process, Plugin.addCommand, Plugin.addSettingTab, Component.onunload, Component.register, Component.registerEvent, ItemView, ViewCreator, Vault.create, and Vault.createFolder. Each entry records verified signature, @since version, purpose, and placeholder for usage file and manual test.
Validation: manual grep of pinned obsidian.d.ts confirmed all signatures and @since values.
Commit: not committed.
Notes: requestUrl and WorkspaceLeaf.setViewState have no @since in pinned file. Vault.process requires 1.1.0+.

2026-07-22 — P0-T006 — complete
Summary: Reviewed ADR-001 through ADR-006 against AGENTS.md, PROJECT_CONTEXT.md, and data contracts. All six align with controlling documents. Added "Status: accepted" and date to each. Risk register (R-001 through R-010) already populated.
Validation: manual review of each ADR against governing documents.
Commit: not committed.
Notes:

2026-07-22 — P0-T005 — complete
Summary: Verified 5eTools clone at external/5etools-src. Commit 3c5d9d3 matches SOURCE.md. Created SOURCE_COMMIT.txt for builder reference.
Validation: git rev-parse HEAD matches recorded commit. diff confirms match.
Commit: not committed.
Notes:

2026-07-22 — P0-T004 — complete
Summary: Verified D&D Beyond fixture `character-156579226.json` exists, SHA-256 matches recorded hash. SOURCE.md documents restrictions (behavioral reference only, no production calls).
Validation: sha256sum verified fixture against recorded hash `c26017d…`.
Commit: not committed.
Notes:

2026-07-22 — P0-T003 — complete
Summary: Verified obsidian.d.ts SHA-256 matches recorded hash. Computed and recorded SHA-256 hashes for all 5 sample-plugin reference files. Added retrieval date to SOURCE.md.
Validation: sha256sum -c verified all 6 files against recorded hashes.
Commit: not committed.
Notes:

2026-07-22 — P0-T002 — complete
Summary: Added branch policy (main/release, dev/integration, P#-T### feature branches) and commit policy (Conventional Commits with scope) to Engineering SOP sections 1-2. Added policy summary to project README. Renumbered existing SOP sections.
Validation: `git branch -a` confirms `main` and `dev` exist locally and remotely.
Commit: not committed.
Notes:

2026-07-22 — P0-T001 — complete
Summary: Created missing `scripts/` and `fixtures/` directories with `.gitkeep`. Remaining skeleton (`apps/`, `packages/`, `docs/`, `references/`, root documents) already in place.
Validation: directory listing confirms all required top-level directories present.
Commit: not committed.
Notes:

```text
YYYY-MM-DD — P#-T### — status
Summary:
Validation:
Commit:
Notes:
```
