---
name: dnd-phase-execution
description: Execute exactly one Obsidian D&D roadmap phase with disposable task workers, bounded large-file edits, independent validation, atomic task commits, pushes to dev, rehydration between tasks, and a separate phase-gate commit.
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

The active project is:

```text
obsidian-dnd-character/
```

Git commands run from the current worktree root. Project npm commands use:

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

Do not guess through a conflict. Stop and identify it.

## 3. Durable state

Conversation history and compaction summaries are not authoritative.

Authoritative continuation state is:

- repository control documents;
- active roadmap checkbox and gate;
- source and tests;
- Git commits, branch, working tree, and remote synchronization;
- current uncommitted diff.

Maintain this compact ledger in parent reasoning:

```text
Phase:
Starting commit:
Completed task commits:
Current task:
Current retry:
Gate status:
Blocking issue:
```

After compaction, do not mutate files until the ledger has been reconstructed from Git and repository files.

## 4. Initial context budget

At phase start, read only:

- `obsidian-dnd-character/AGENTS.md`;
- `obsidian-dnd-character/PROJECT_CONTEXT.md`;
- `obsidian-dnd-character/CONTEXT_INDEX.md`;
- the selected phase section and gate in the roadmap;
- the current-state portion of `docs/PROJECT_STATUS.md`;
- relevant SOP sections for branch, task lifecycle, validation, and large files.

Do not load complete historical status logs, complete reference fixtures, or all task-specific documents.

For each task, use `CONTEXT_INDEX.md` to load only relevant sections and implementation files.

## 5. Preflight

Run:

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

Do not change Git identity.

If any requirement fails, stop before delegation.

At phase start report:

```text
Phase:
Target branch: dev
Starting commit:
Git author:
Completed tasks already present:
Remaining tasks:
Phase gate:
```

## 6. Phase and task selection

Use the phase explicitly assigned by the user. If the assignment is `AUTO`, select the first phase with an incomplete task or gate after confirming all previous gates are complete.

Inside the phase:

1. preserve completed tasks;
2. select the first incomplete task in roadmap order;
3. confirm earlier tasks and explicit dependencies are complete;
4. identify task acceptance criteria and applicable shared phase criteria;
5. inspect only enough current implementation to prepare a precise worker capsule.

If no incomplete task is ready, stop as blocked.

## 7. Worker capsule

Before delegation, prepare:

```text
Project root:
Phase:
Task ID:
Task title:
Dependencies confirmed:
Exact task requirements:
Shared phase requirements:
Acceptance criteria:
Required documents:
Relevant implementation files:
Relevant tests:
Expected files to change:
Existing files over 300 lines:
Required bounded-edit method:
Prohibited replacement targets:
Required validation:
Explicit exclusions:
Known risks:
```

Do not paste complete control documents into the capsule.

For every expected existing file over 300 lines, identify known symbols, exports, fixtures, describe blocks, or logical sections. List the file under prohibited replacement targets.

Before delegation report:

```text
Starting task: <ID and title>
Dependencies: complete
Worker: new disposable dnd-task-worker
```

Invoke a fresh `dnd-task-worker`. Never resume or reuse a prior task worker.

## 8. Parent review

The worker must leave changes uncommitted and unstaged.

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff --name-only
git diff
```

Confirm:

- all changes belong to the active task;
- roadmap and project status were not changed by the worker;
- no commit, generated output, secret, unrelated dependency update, or future-task implementation exists;
- dependency direction and runtime validation rules are preserved;
- no undocumented Obsidian API, raw-source leakage, protected `any`, entity-name branch, persisted derived value, silent replacement, or unsupported narrative inference was added;
- positive and negative tests exist where required.

For every changed existing file over 300 lines, confirm:

- the worker stated the bounded plan before editing;
- the diff is localized;
- unrelated sections remain untouched;
- the file was not deleted/recreated or transported as a complete replacement;
- focused validation was run after logical slices.

A mutation exceeding 200 changed lines or 25 percent of an existing file over 300 lines triggers mandatory review before further work. Reject formatting churn, delete/re-add patterns, or broad rewrites.

## 9. Repairs

For a correctable defect, invoke a fresh `dnd-task-worker` with only:

- task ID;
- changed files;
- failed command or review finding;
- shortest useful error excerpt;
- exact required correction;
- files and behavior that must remain unchanged.

Maximum attempts per task:

- one original worker;
- two fresh repair workers.

A worker stopped before any accepted repository mutation does not consume a repair attempt.

After two unsuccessful repairs, stop as blocked or partial. Never loop indefinitely.

## 10. Independent validation

Run task-specific tests, then:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

Do not invent scripts, suppress failures, or rely only on worker-reported results.

A task is complete only when:

- focused checks pass;
- check passes;
- build passes;
- every acceptance criterion passes;
- parent review passes.

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
git diff --name-only
```

Then:

```bash
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
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

After push report:

```text
Completed task: <ID and title>
Commit: <hash>
Validation: PASS
Push: PASS
Remaining phase tasks: <count>
```

If commit or push fails, stop without starting another task.

## 13. Rehydration between tasks

After each successful task push, discard detailed worker context and retain only the compact ledger.

Re-read:

- `obsidian-dnd-character/AGENTS.md`;
- selected phase section and gate;
- current-state portion of project status;
- Git log, status, and synchronization.

Do not re-read this skill or every control document unless an instruction source changed or a conflict must be resolved. Select the next task from durable state, not memory.

## 14. Phase gate

When all phase tasks are complete:

1. re-read exact gate criteria;
2. confirm one commit per task;
3. require a clean tree;
4. compare current state with the phase starting commit;
5. run gate-specific validation;
6. run project check and build;
7. inspect complete phase change for architecture drift;
8. verify each gate criterion explicitly.

If the gate explicitly requires a small missing fixture, test, or report, delegate one fresh gate-specific worker and review it like a task. If the gate requires substantial unplanned functionality, stop and identify the missing roadmap task.

Only after the gate passes:

- mark gate criteria complete;
- update project status with gate results, validation, limitations, next phase, and `Commit: see Git history for Phase <N> gate.`;
- stage and review;
- commit with:

```bash
git commit -m "chore(project): complete phase <N> gate" -m "Phase <N> gate"
git push origin dev
```

Verify author, clean tree, and synchronization. Do not start the next phase or touch `main`.

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
- <task ID>: <commit hash> — <title>

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
