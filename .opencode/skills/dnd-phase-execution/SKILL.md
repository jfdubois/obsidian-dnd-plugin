---
name: dnd-phase-execution
description: Calibration workflow that completes exactly one task from a selected roadmap phase, then stops.
compatibility: opencode
metadata:
  project: obsidian-dnd-character
  workflow: calibration-single-task-manager
---

# D&D single-task calibration workflow

Use this skill only when the user invokes `/phase <phase>` during calibration.

## 1. Objective

Complete exactly one roadmap task safely.

Do not attempt a full phase. The previous multi-task workflow repeatedly degraded after one or two tasks because parent context accumulated implementation discovery, worker output, diffs, validation, documentation, Git operations, and next-task state.

## 2. Workspace

```text
Git root:     /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project root: /home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character
Branch:       dev
```

Run Git commands from the Git root.

Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

## 3. Authority

1. `obsidian-dnd-character/AGENTS.md`
2. accepted ADRs
3. project context and requirements
4. architecture and contracts
5. roadmap
6. SOP and acceptance matrix
7. project status
8. this skill
9. existing code and tests

Read lower-level documents only when the selected task requires them.

## 4. Preflight

Run one grouped command:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git status --short
git config --get user.name
git config --get user.email
git remote -v
git fetch origin dev
git rev-list --left-right --count origin/dev...dev
git rev-parse HEAD
```

Require:

- Git root and current directory are the expected Git root;
- branch is `dev`;
- tree is clean;
- local and remote `dev` are synchronized;
- Git identity and `origin` exist.

If any check fails, stop before delegation.

## 5. Select one task

Read only:

- `AGENTS.md`;
- `CONTEXT_INDEX.md`;
- the selected phase section and gate from the roadmap;
- the current-state header of `PROJECT_STATUS.md`.

Select the first incomplete task in the assigned phase. Confirm earlier tasks are complete.

Do not inspect task implementation, tests, or raw source in the parent.

## 6. Task capsule

Provide the worker:

```text
Git working root:
Project source root:
Phase and task:
Dependencies confirmed:
Exact roadmap requirements:
Applicable phase criteria:
Applicable acceptance IDs and expected results:
Task-area documents:
Task-area root:
Approved read-only inventory command, when applicable:
Required validation:
Explicit exclusions:
Semantic definition of done:
```

For P3-T007, use:

```text
obsidian-dnd-character/prompts/P3_T007_TASK_CAPSULE.md
```

Do not duplicate its contents in the skill.

## 7. Delegate

Invoke one fresh `dnd-task-worker`.

If it returns no structured report and leaves a clean tree, allow one replacement invocation. Otherwise treat defects as a normal repair case.

## 8. Parent review

Start with:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Review changed files individually.

Reject when:

- changes exceed task scope;
- worker changed roadmap/status;
- required behavior is only parsed, typed, registered, or recognized;
- resulting-state tests are missing;
- malformed/negative tests are missing;
- an acceptance item lacks an implementation symbol and behavior assertion;
- raw-source leakage, protected `any`, entity-name branching, undocumented Obsidian API, or narrative inference appears;
- a large file was replaced or broadly rewritten.

Allow at most one fresh repair worker with the exact review defect.

If repair still fails, stop with uncommitted changes preserved.

## 9. Independent validation

Run focused task tests, then:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

A task is complete only when behavior, review, focused tests, check, and build all pass.

## 10. Document, commit, and push

Only after acceptance:

- mark the task complete in the roadmap;
- update current project status;
- update API or ADR documents only when required.

Review staged files, then commit:

```bash
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached --numstat
git diff --cached --name-only
git commit -m "chore(project): complete <TASK-ID>" -m "<TASK-ID>"
git push origin dev
```

Verify:

```bash
git log -1 --format='%h %an <%ae> %s'
git status --short
git rev-list --left-right --count origin/dev...dev
```

Require configured author, clean tree, and synchronized branch.

## 11. Stop

After one successful task commit and push:

- do not read the next task;
- do not delegate again;
- do not evaluate the phase gate;
- provide the single-task report and stop.

## 12. Final report

```text
Calibration task run
Phase: <phase>
Task: <task ID and title>
Status: complete | blocked | partial
Starting commit: <hash>
Ending commit: <hash>

Worker attempts:
- original: <result>
- repair: <result or none>

Validation:
- focused checks: PASS | FAIL | NOT AVAILABLE
- npm --prefix obsidian-dnd-character run check: PASS | FAIL
- npm --prefix obsidian-dnd-character run build: PASS | FAIL

Commit:
- <hash or none>

Working tree:
- clean | uncommitted changes

Remote synchronization:
- synchronized | not synchronized

Blocking decision required:
- ... | none
```
