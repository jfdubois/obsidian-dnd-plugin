---
name: dnd-phase-execution
description: Execute exactly one Obsidian D&D roadmap phase with immediate delegation to disposable task workers, bounded parent context, independent validation, atomic task commits, pushes to dev, rehydration between tasks, and a separate phase-gate commit.
compatibility: opencode
metadata:
  project: obsidian-dnd-character
  workflow: phase-orchestrator
---

# D&D phase execution

Use this skill only when the user explicitly assigns a complete roadmap phase.

## 1. Workspace

OpenCode runs from the Git worktree root:

```text
/home/jdubois/Documents/Projects/obsidian-dnd-plugin
```

The active project is `obsidian-dnd-character/`.

Run Git commands from the worktree root. Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

Do not use `git -C`, initialize another repository, or change branches.

## 2. Authority

Use this order when instructions conflict:

1. `obsidian-dnd-character/AGENTS.md`
2. accepted ADRs in `docs/08_DECISIONS_RISKS_REFERENCES.md`
3. `PROJECT_CONTEXT.md`
4. product requirements
5. system architecture
6. data contracts
7. development roadmap
8. engineering SOP
9. test acceptance matrix
10. project status
11. this skill
12. existing code and tests

Do not preload these files merely because they appear in the authority list. Read a lower-level authority only when the active task requires it or a conflict must be resolved.

## 3. Durable state

Conversation history and compaction summaries are not authoritative.

Maintain only this parent ledger:

```text
Phase:
Starting commit:
Completed task commits:
Current task:
Current retry:
Gate status:
Blocking issue:
```

After compaction, do not mutate files until the ledger is reconstructed from bounded control-document sections and Git state.

## 4. Delegation-first context budget

The parent orchestrator coordinates. The worker investigates and implements.

Before the first worker, the parent may load only:

1. `obsidian-dnd-character/AGENTS.md`;
2. `obsidian-dnd-character/CONTEXT_INDEX.md`;
3. the selected phase section and gate from the roadmap;
4. the current-state header of `docs/PROJECT_STATUS.md`.

Use bounded reads. Never open the complete roadmap, complete status history, or complete SOP.

For an exact phase number, extract only that phase. Example for Phase 3:

```bash
awk '
  /^# Phase 3 / {printing=1}
  printing && /^# Phase / && !/^# Phase 3 / {exit}
  printing {print}
' obsidian-dnd-character/docs/04_DEVELOPMENT_ROADMAP.md
```

Read only the status header needed to identify current phase, last task, blockers, and validation baseline, normally:

```bash
sed -n '1,100p' obsidian-dnd-character/docs/PROJECT_STATUS.md
```

Do not read `PROJECT_CONTEXT.md`, the SOP, architecture, contracts, source files, tests, raw 5eTools data, or reference fixtures before delegation unless a concrete conflict prevents task selection.

After preflight, use at most four repository read/search operations before invoking the first worker. Do not compensate with broad Bash searches.

Before the first worker, prohibited parent targets are:

```text
obsidian-dnd-character/apps/
obsidian-dnd-character/packages/
obsidian-dnd-character/external/
external/
obsidian-dnd-character/references/
```

The worker owns implementation discovery.

## 5. Preflight

Run one grouped preflight command:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git status --short
git log -10 --oneline
git config --get user.name
git config --get user.email
git remote -v
git fetch origin dev
git rev-list --left-right --count origin/dev...dev
git rev-parse HEAD
```

Require:

- current directory and Git root are `/home/jdubois/Documents/Projects/obsidian-dnd-plugin`;
- branch is exactly `dev`;
- working tree is clean;
- local `dev` and `origin/dev` are synchronized;
- Git name/email and `origin` exist;
- required control documents and selected phase exist;
- phase tasks and gate are explicit.

Do not change Git identity. If a requirement fails, stop before delegation.

Report once:

```text
Phase:
Target branch: dev
Starting commit:
Git author:
Completed tasks already present:
Remaining tasks:
Phase gate:
```

Do not repeat this information before delegation.

## 6. Phase and task selection

Use the phase explicitly assigned by the user. If the assignment is `AUTO`, select the first phase with an incomplete task or gate after confirming all previous gates are complete.

Inside the bounded phase section:

1. preserve completed tasks;
2. select the first incomplete task in roadmap order;
3. confirm earlier tasks and explicit dependencies are complete;
4. copy only the task's written requirements and applicable shared phase criteria;
5. identify task-area documents from `CONTEXT_INDEX.md` without opening them in the parent.

Do not inspect implementation, tests, fixtures, raw source, or reference data before the worker.

If no incomplete task is ready, stop as blocked.

## 7. Minimal worker capsule

Prepare only:

```text
Project root:
Phase and task:
Dependencies confirmed:
Exact roadmap requirements:
Applicable phase acceptance criteria:
Task-area documents from CONTEXT_INDEX.md:
Required validation:
Explicit exclusions:
Worker discovery requirement:
```

Set `Worker discovery requirement` to:

```text
Discover relevant implementation files, tests, raw-source examples, line counts,
symbols, bounded ranges, expected changes, and risks before editing. The parent
has intentionally not pre-read them.
```

Do not predict new filenames, public APIs, implementation structure, or expected changed files. Do not list large files unless their relevance is explicitly stated in the roadmap or current status.

Report once:

```text
Starting task: <ID and title>
Dependencies: complete
Worker: new disposable dnd-task-worker
```

Invoke a fresh `dnd-task-worker` immediately. Never resume or reuse a prior task worker.

## 8. Parent review

The worker must leave changes uncommitted and unstaged.

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
- positive and negative tests exist where required.

For every changed existing file over 300 lines, confirm:

- the worker stated the bounded plan before editing;
- the diff is localized;
- unrelated sections remain untouched;
- the file was not deleted/recreated or transported as a complete replacement;
- focused validation followed logical slices.

A mutation exceeding 200 changed lines or 25 percent of an existing file over 300 lines triggers mandatory review before further work. Reject formatting churn, delete/re-add patterns, and broad rewrites.

## 9. Repairs

For a correctable defect, invoke a fresh `dnd-task-worker` with only:

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

A task is complete only when focused checks, check, build, acceptance criteria, and parent review all pass.

## 11. Task documentation

Only after validation:

1. mark the active roadmap task complete;
2. update `docs/PROJECT_STATUS.md` without rewriting unrelated history;
3. update `docs/API_USAGE.md` only for verified new Obsidian API use;
4. update ADRs only for an explicitly accepted architecture decision.

The status entry must contain date, task ID/title, concise summary, validation results, compatibility notes, and:

```text
Commit: see Git history for <TASK-ID>.
```

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
