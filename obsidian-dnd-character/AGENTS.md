# AGENTS.md — Mandatory development rules

These rules apply to every agent working in `obsidian-dnd-character/`.

## 1. Authority and execution modes

Repository documentation is binding. When instructions conflict, use accepted ADRs and the authority order defined by the active phase skill. Do not resolve conflicts by guessing.

Two modes are allowed:

### Single-task mode

Use when one roadmap task is assigned.

- Read project context, context index, current status, the active roadmap task, and only task-specific documents.
- Inspect implementation and tests before editing.
- State task scope, expected files, exclusions, and validation.
- Implement exactly one task and stop after reporting.
- Update roadmap/status only after all acceptance criteria pass.

### Phase-orchestrator mode

Use only when the user explicitly assigns a complete phase through the repository-local `dnd-phase-execution` Codex skill.

- One fresh Codex custom agent named `dnd_task_worker` per task.
- Workers never update roadmap/status, stage, commit, push, switch branches, or invoke agents.
- The parent independently reviews, validates, documents, commits, and pushes each task.
- Reload durable repository state between tasks.
- Stop after the selected phase gate or a defined blocker.

## 2. Minimal context rule

Do not preload the entire project documentation set.

For a task, read:

- this file;
- current project status;
- the exact roadmap task and phase gate;
- only documents named for the task area in `CONTEXT_INDEX.md`;
- only relevant source symbols, bounded ranges, and tests.

Do not load complete D&D Beyond fixtures, the full raw 5eTools repository, historical status logs, or unrelated phase specifications.

Conversation history and compaction summaries are not authoritative project state. After compaction, reconstruct the current task from repository files, Git state, and the active diff before another mutation.

## 3. Product and architecture guardrails

- Use only Obsidian APIs present in `references/obsidian/obsidian.d.ts`.
- Record each new verified Obsidian symbol in `docs/API_USAGE.md` before implementation.
- Keep plugin runtime mobile-compatible; no Node/Electron-only API without an accepted ADR.
- Use `requestUrl` rather than guessed or undocumented transport APIs.
- Raw 5eTools structures exist only inside catalog-builder boundaries.
- The plugin, normalized catalog, and character files never contain raw 5eTools records.
- Resolve source references to canonical project IDs.
- Included unresolved references are build failures.
- Never branch on entity or feature display names.
- Never infer mechanics from narrative text in plugin or rules-engine runtime.
- Narrative automation requires a versioned, runtime-validated reviewed mapping targeting canonical identity.
- Unmapped narrative remains safe render content with explicit automation diagnostics.
- D&D Beyond is a behavioral fixture only; production code never calls it or adopts its IDs/schema.
- Do not bundle or publicly redistribute non-free content.

## 4. Data and TypeScript rules

- Strict TypeScript is mandatory.
- No `any` in domain, catalog, persistence, or calculation modules.
- Validate external, downloaded, raw, and persisted values from `unknown`.
- Use discriminated unions for effects, grants, mutations, and queries.
- Use branded IDs or equivalent wrappers.
- Pure calculations remain deterministic and independent of Obsidian UI.
- Persist authoritative selections and mutable state, not catalog copies, candidate lists, or derived totals.
- Every persisted structure has a schema version and tested deterministic migrations.
- Character create/edit/level/equipment/source-policy changes are atomic transactions.
- Caches are disposable and must include all catalog, policy, query, and character-state fingerprints required for correctness.
- Deleting caches must not destroy character state.

## 5. Character and UI rules

- A character has exactly one ruleset: 2014 or 2024.
- Core-free records remain eligible through record-level classification.
- Optional source access is stored per character.
- Do not remove a required source or silently replace invalid selections.
- Persist selected choices and origin grants, never all future candidates.
- UI components issue typed commands; they do not mutate authoritative state directly.
- Every interactive control requires appropriate accessible behavior.
- Every projected mechanical rule retains source provenance.
- Multiple projections reference one evaluated effect; projections are derived, not persisted.

## 6. Large-file editing protocol

An existing file over 300 lines must be edited through bounded mutations.

Before every mutation, identify and report:

```text
Target file:
Line count:
Symbols or test sections affected:
Bounded ranges inspected:
Planned targeted edit operations:
Expected untouched sections:
Targeted validation command:
Whole-file replacement: no
```

Rules:

- Search symbols first and read bounded ranges.
- Never replace, regenerate, delete, or recreate the whole file.
- Never transport a complete generated replacement through Bash, Python, heredoc, base64, temporary files, or wrappers.
- Prefer focused modules when a new independent contract/helper/test can avoid enlarging a large file.
- After one oversized or transport failure, split into smaller targeted edits.
- After two failures on the same region, stop and report the blocker.
- Validate every logical slice with the narrowest useful test/typecheck.
- A change exceeding 200 lines or 25 percent of a large existing file requires parent review before further mutation.
- Broad formatting churn, section reordering, or delete/re-add diffs are unacceptable.

## 7. Task completion

A task is complete only when:

- implementation and required runtime schemas are complete;
- positive and negative tests cover the boundary/behavior;
- task-specific checks pass;
- `npm run check` passes;
- `npm run build` passes;
- diff review shows no unrelated scope or prohibited pattern;
- roadmap/status and API/ADR documentation are updated only where required.

Do not claim an unexecuted command passed.

## 8. Change control

Stop for an architectural decision before:

- changing a published catalog schema outside an already accepted task;
- changing canonical ID construction;
- allowing mixed rulesets;
- changing source-policy semantics;
- introducing an unapproved effect/grant category;
- persisting a derived value as authoritative;
- using an Obsidian API absent from the pinned reference;
- requiring public redistribution of non-free content.

Record accepted changes in `docs/08_DECISIONS_RISKS_REFERENCES.md`.

## 9. Worker restrictions

A task worker must not:

- select another task;
- change roadmap or project status;
- stage, commit, or push;
- switch branches or change Git configuration;
- reset, restore, clean, stash, or discard changes;
- invoke another agent;
- perform unrelated cleanup, dependency upgrades, or speculative refactors.

## 10. Completion report

```text
Task: <task ID and title>
Status: complete | blocked | partial

Changed files:
- ...

Validation:
- <command>: PASS | FAIL

Acceptance criteria:
- [x] or [ ] ...

Risks or limitations:
- ...

Documentation updated:
- ...

Next task:
- <task ID>
```
