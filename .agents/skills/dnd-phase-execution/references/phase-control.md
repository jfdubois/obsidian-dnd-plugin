# Phase control after worker completion

Use this reference after a task worker returns. Follow the sections in order.

## Contents

- Parent review
- Repairs
- Independent validation
- Task documentation
- Task commit and push
- Rehydration between tasks
- Phase gate
- Blocking conditions
- Final report

## 8. Parent review

The worker must leave changes uncommitted and unstaged.

If a worker reads an existing file over 300 lines without bounded ranges, or exceeds the discovery budget before the first edit without a concrete blocker, terminate that worker before repository mutation and start a fresh replacement. A worker terminated before mutation does not consume a repair attempt.

If the worker returns no structured report:

- inspect `git status --short`;
- when the tree is clean, treat the invocation as failed rather than as a task defect;
- allow one fresh replacement worker using the same task capsule plus the shortest failure note;
- if the replacement also returns no report or leaves no changes, stop as blocked;
- do not consume the normal two repair attempts for an invocation that made no repository mutation.

Start with compact review metadata:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Do not immediately load one complete repository diff.

Review each changed file separately. Use bounded diffs or symbol/range reads. A full `git diff` is allowed only when the total change is small enough to inspect without threatening parent context.

Confirm:

- all changes belong to the active task;
- roadmap and project status were not changed by the worker;
- no commit, generated output, secret, unrelated dependency update, or future-task implementation exists;
- dependency direction and runtime validation rules are preserved;
- no undocumented Obsidian API, raw-source leakage, protected `any`, entity-name branch, persisted derived value, silent replacement, or narrative inference was added;
- positive and negative tests exist where required;
- every applicable acceptance case has named implementation and behavior-test evidence.

Passing typecheck, lint, tests, and build is necessary but not sufficient.

For inventory-driven tasks, require this evidence table:

```text
| Inventory item | Implementation symbol | Positive behavior test | Negative test |
|---|---|---|---|
```

Reject the worker result when:

- tests only demonstrate parsing, recognition, registration, discriminator narrowing, type guards, or shape acceptance;
- required behavior is deferred or described as future work;
- no implementation function produces the required state change or output;
- an acceptance criterion lacks a corresponding implementation symbol and behavior assertion;
- an inventoried item is absent from the evidence table;
- an operation is cast to a discriminated union without operation-specific runtime payload validation;
- a new implementation or test file exceeds 300 lines without explicit capsule authorization before the first write.

Before documentation or commit, inspect at least one actual resulting-state assertion per operation family and confirm the tests compare the resulting record/output rather than only the parsed operation.

For `P3-T007`, verify all of the following before acceptance:

1. every supported inventoried mode has an execution handler;
2. every handler applies to a cloned resolved record;
3. the original base/input record is unchanged;
4. every mode has a before/after behavior test;
5. every mode has malformed-payload or negative coverage;
6. unknown modes fail with actionable diagnostics;
7. parser-only or registry-only coverage is not counted as implementation evidence.

For every changed existing file over 300 lines, also confirm:

- the worker stated the bounded plan before editing;
- the diff is localized;
- unrelated sections remain untouched;
- the file was not deleted/recreated or transported as a complete replacement;
- focused validation followed logical slices.

A mutation exceeding 200 changed lines or 25 percent of an existing file over 300 lines triggers mandatory review before further work. Reject formatting churn, delete/re-add patterns, and broad rewrites.

## 9. Repairs

For a correctable defect, spawn a fresh project custom agent named `dnd_task_worker` with only:

- task ID;
- changed files;
- failed command or review finding;
- shortest useful error excerpt;
- exact correction;
- files and behavior that must remain unchanged.

Maximum attempts per task:

- one original worker;
- two fresh repair workers.

After two unsuccessful repairs, stop as blocked or partial. Never loop indefinitely.

## 10. Independent validation

Run focused task checks, then:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

Do not invent scripts, suppress failures, or rely only on worker-reported results.

A task is complete only when focused checks, check, build, acceptance criteria, semantic completion evidence, and parent review all pass.

## 11. Task documentation

Only after validation and semantic parent review:

1. mark the active roadmap task complete;
2. update `docs/PROJECT_STATUS.md` without rewriting unrelated history;
3. update `docs/API_USAGE.md` only for verified new Obsidian API use;
4. update ADRs only for an explicitly accepted architecture decision.

The status entry must contain date, task ID/title, concise summary, validation results, compatibility notes, and:

```text
Commit: see Git history for <TASK-ID>.
```

Do not document parser-only work as implementation of a behavior task.

## 12. Task commit and push

Before staging:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Stage only after confirming every change belongs to the task:

```bash
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached --numstat
git diff --cached --name-only
```

Review staged files separately when the staged diff is large. Then:

```bash
git commit -m "chore(project): complete <TASK-ID>" -m "<TASK-ID>"
git push origin dev
```

Do not use `--author`, `--amend`, AI co-author metadata, or force push.

Verify:

```bash
git log -1 --format='%h %an <%ae> %s'
git status --short
git rev-list --left-right --count origin/dev...dev
```

Require the configured author, a clean tree, and synchronized `dev`.

If commit or push fails, stop without starting another task.

## 13. Rehydration between tasks

After each successful task push, retain only the ledger.

Re-read only:

- the bounded selected-phase roadmap section;
- the current-status header;
- Git log, status, and synchronization.

Do not re-read AGENTS, CONTEXT_INDEX, this skill, SOP, project context, source, or tests unless an instruction source changed or a conflict must be resolved.

Select the next task and delegate immediately using the same minimal capsule.

## 14. Phase gate

When all phase tasks are complete:

1. re-read the bounded gate criteria;
2. confirm one commit per task;
3. require a clean tree;
4. compare current state with the phase starting commit using compact stats first;
5. run gate-specific validation;
6. run project check and build;
7. inspect changed areas for architecture drift using targeted diffs;
8. verify each gate criterion explicitly.

If the gate explicitly requires a small missing fixture, test, or report, delegate one fresh gate-specific worker. If it requires substantial unplanned functionality, stop and identify the missing roadmap task.

Only after the gate passes:

- mark gate criteria complete;
- update project status with gate results, validation, limitations, next phase, and `Commit: see Git history for Phase <N> gate.`;
- stage and review;
- commit and push:

```bash
git commit -m "chore(project): complete phase <N> gate" -m "Phase <N> gate"
git push origin dev
```

Do not start the next phase or touch `main`.

## 15. Blocking conditions

Stop rather than inventing a solution when:

- branch/tree/synchronization/identity preflight fails;
- control documents conflict or required inputs are missing;
- a required API is absent from the pinned Obsidian definition;
- a schema or canonical-ID change lacks an accepted decision;
- the task requires future-phase work or redistribution of non-free content;
- acceptance criteria are ambiguous or validation cannot pass;
- a worker exceeds scope or the repair limit is reached;
- commit or push fails;
- destructive Git would be required.

With uncommitted changes, never reset, restore, clean, stash, or discard them. Report changed files and the exact decision required.

Prohibited throughout the phase:

```text
git reset
git clean
git restore
git stash
git rebase
git merge
git cherry-pick
git revert
git commit --amend
git checkout
git switch
git tag
git push --force
git push origin main
```

## 16. Final report

Use exactly:

```text
Phase: <ID and title>
Status: complete | blocked | partial | already-complete
Starting commit: <hash>
Ending commit: <hash>

Task commits:
- <task ID>: <commit hash> - <title>

Gate commit:
- <commit hash or none>

Validation:
- task-specific checks: PASS | FAIL | NOT AVAILABLE
- npm --prefix obsidian-dnd-character run check: PASS | FAIL
- npm --prefix obsidian-dnd-character run build: PASS | FAIL

Gate criteria:
- [x] or [ ] ...

Working tree:
- clean | uncommitted changes

Remote synchronization:
- synchronized | not synchronized

Git author:
- <name and email>

Risks or limitations:
- ...

Blocking decision required:
- ... | none

Next phase:
- <ID and title> | none
```

Then stop.
