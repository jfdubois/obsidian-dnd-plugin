# AGENTS.md — Mandatory development rules

These rules apply to every agent working in `obsidian-dnd-character/`.

## 1. Execution modes

### 1.1 Single-task mode

Use when one roadmap task is explicitly assigned.

- Read the current task, current project status, and only task-specific documents.
- Implement exactly one task.
- Run focused validation, `npm run check`, and `npm run build`.
- Update roadmap/status only after acceptance passes.
- Stop after the task report.

### 1.2 Calibration manager mode

Use only through `/calibrate-manager`.

- Read the supplied scenario file.
- Make read-only manager decisions.
- Do not inspect implementation files.
- Do not delegate, edit, run shell commands, stage, commit, push, or update project state.
- Report the expected action for every scenario.

### 1.3 Calibration phase mode

Use through `/phase <phase>` while calibration is active.

- Complete at most one roadmap task per invocation.
- Use one fresh `dnd-task-worker`; allow at most one fresh repair worker.
- The parent reviews, validates, documents, commits, pushes, and stops.
- Do not select the next task after a successful commit.
- Full multi-task phase execution is disabled until the promotion gate passes.

## 2. Permanent product guardrails

- Use only Obsidian APIs present in `references/obsidian/obsidian.d.ts`.
- Record new Obsidian symbols in `docs/API_USAGE.md` before implementation.
- Keep plugin runtime mobile-compatible.
- Raw 5eTools structures remain inside catalog-builder boundaries.
- The plugin, normalized catalog, and character files never contain raw 5eTools records.
- Included unresolved references are build failures.
- Never branch on entity or feature display names.
- Never infer mechanics from narrative text in plugin or rules-engine runtime.
- Narrative automation requires a versioned, validated reviewed mapping targeting canonical identity.
- D&D Beyond is a behavioral fixture only and is never called by production code.
- Do not bundle or publicly redistribute non-free content.

## 3. Data and TypeScript rules

- Strict TypeScript is mandatory.
- No `any` in domain, catalog, persistence, or calculation modules.
- Validate external, downloaded, raw, and persisted values from `unknown`.
- Use discriminated unions for effects, grants, mutations, and queries.
- Use branded IDs or equivalent wrappers.
- Pure calculations remain deterministic and independent of Obsidian UI.
- Persist authoritative selections and mutable state, not catalog copies, candidate lists, or derived totals.
- Character changes are atomic transactions.
- Caches are disposable and include all correctness fingerprints.

## 4. Scope and Git safety

A task worker must not:

- select another task;
- modify roadmap or project status;
- stage, commit, push, or change branches;
- change Git configuration;
- reset, restore, clean, stash, or discard changes;
- invoke another agent;
- perform unrelated cleanup, dependency upgrades, or speculative refactors.

The parent must stop when preflight, commit, push, or synchronization fails.

## 5. Bounded editing

For any existing source or test file over 300 lines:

- determine line count first;
- locate exact symbols or test sections;
- read bounded ranges;
- state the targeted mutation plan before editing;
- never replace, regenerate, delete, or recreate the whole file;
- never transport a complete replacement through shell, Python, heredoc, base64, or temporary files;
- validate each logical slice with the narrowest useful check.

New files should remain at or below 300 lines. Split independent behavior into focused modules.

## 6. Completion standard

A behavior task is not complete because a type, parser, registry, discriminator, or guard exists.

Completion requires:

- an execution symbol that produces the required state or output;
- a positive behavior test asserting the resulting state or output;
- malformed or negative coverage;
- focused validation;
- `npm run check` passing;
- `npm run build` passing;
- parent review confirming task scope and acceptance behavior.

Do not claim an unexecuted command passed.

## 7. Change control

Stop for an architecture decision before changing:

- published catalog schema outside an accepted task;
- canonical ID construction;
- ruleset-mixing policy;
- character source-policy semantics;
- effect or grant categories not already approved;
- authoritative persistence of derived values;
- use of an Obsidian API absent from the pinned reference;
- public distribution requirements for non-free content.
