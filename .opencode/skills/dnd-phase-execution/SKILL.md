---
name: dnd-phase-execution
description: Execute exactly one task from a selected Obsidian D&D roadmap phase with a hard early-delegation gate, independent parent review, validation, commit, push, and immediate stop. Use for `/phase <number>` during orchestration calibration.
---

# D&D single-task execution

## 1. Outcome

Complete at most one roadmap task from the phase selected by the user.

The parent coordinates. The worker discovers and implements. Do not accumulate implementation context in the parent before delegation.

## 2. Workspace

```text
Git root:     /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project root: /home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character
Branch:       dev
```

Run Git commands from the Git root. Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

## 3. Hard pre-delegation budget

After loading this skill, the parent may use exactly these repository operations before the first worker:

1. grouped Git preflight;
2. bounded selected-phase extraction;
3. bounded current-status header read;
4. bounded task-capsule read when a capsule is named below.

Do not add discovery operations. Do not use Read, Glob, Grep, List, or LSP. They are intentionally denied to the parent.

The parent must not inspect:

```text
obsidian-dnd-character/apps/
obsidian-dnd-character/packages/
external/
obsidian-dnd-character/references/
```

The parent must not run source inventory commands. Inventory commands belong in the worker capsule and are executed by the worker.

If any prohibited pre-delegation action occurs, stop with:

```text
Status: delegation-protocol-failure
Reason: <prohibited operation>
Repository mutation: none
```

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

- current directory and Git root match the configured Git root;
- branch is exactly `dev`;
- working tree is clean;
- local `dev` and `origin/dev` are synchronized;
- Git identity and `origin` exist.

If any condition fails, stop before delegation.

Record the final `git rev-parse HEAD` value as `Starting commit`.

## 5. Bounded task selection

Extract only the selected phase. Substitute the assigned phase number for `<N>`:

```bash
awk '
  /^# Phase <N> / {printing=1}
  printing && /^# Phase / && !/^# Phase <N> / {exit}
  printing {print}
' obsidian-dnd-character/docs/04_DEVELOPMENT_ROADMAP.md
```

Read only the compact current-state header:

```bash
sed -n '1,45p' obsidian-dnd-character/docs/PROJECT_STATUS.md
```

From those outputs:

1. preserve completed tasks;
2. select the first incomplete task in roadmap order;
3. confirm every earlier task in the phase is complete;
4. do not inspect implementation to confirm completion;
5. do not read the phase gate beyond what the bounded phase extraction already returned.

## 6. Task capsule

For P3-T007, read only:

```bash
sed -n '1,260p' obsidian-dnd-character/prompts/P3_T007_TASK_CAPSULE.md
```

Use that file as the task-specific capsule. Do not open the SOP, acceptance matrix, architecture, contracts, context index, source files, tests, or raw source in the parent.

Construct the worker message from:

- the selected roadmap task text already extracted;
- the task capsule;
- these exact roots:

```text
Git working root: /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project source root: /home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character
Command working directory: /home/jdubois/Documents/Projects/obsidian-dnd-plugin
```

The worker message must state:

- implement exactly one task;
- read `obsidian-dnd-character/AGENTS.md` and task-specific documents named by the capsule;
- run any approved inventory command itself;
- discover relevant source, tests, line counts, symbols, and bounded ranges;
- leave all changes unstaged and uncommitted;
- return the required structured report and completion evidence.

Do not predict filenames, APIs, implementation modules, or changed files.

## 7. Delegation receipt

Immediately before invoking the worker, output once:

```text
Delegation gate
Phase: <phase>
Task: <task ID and title>
Starting commit: <hash>
Parent repository operations after skill load: 4
Parent source/test/raw reads: 0
Parent inventory commands: 0
Worker: fresh dnd-task-worker
```

Then invoke one fresh `dnd-task-worker` immediately. Do not perform another parent repository operation first.

## 8. Empty invocation

If the worker returns no structured report:

1. run `git status --short`;
2. if the tree is clean, allow one fresh replacement invocation using the same capsule and the shortest failure note;
3. if the replacement also returns no report and no changes, stop blocked.

An empty invocation does not consume the repair attempt.

## 9. Parent review after worker return

Only after the worker returns, run:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Review changed files individually with bounded diffs:

```bash
git diff -- <changed-path>
```

Use `sed -n` only for a specific bounded range when a diff requires surrounding context. Do not begin broad repository discovery after the worker.

Confirm:

- every change belongs to the active task;
- the worker did not change roadmap or project status;
- behavior requirements have execution symbols;
- tests assert resulting state/output, not only parsing or recognition;
- positive and malformed/negative coverage exists;
- task-specific acceptance evidence is complete;
- no raw-source leakage, protected `any`, entity-name branch, narrative inference, undocumented Obsidian API, unrelated refactor, generated output, or dependency change was introduced;
- existing large files were changed through localized diffs rather than replacement.

For P3-T007, require evidence that every supported inventoried `_mod` mode:

- validates its payload;
- executes against a cloned resolved record;
- preserves the original record;
- has a before/after behavior assertion;
- has malformed-payload coverage;
- produces actionable failure for unknown modes.

Parser-only, registry-only, type-only, or recognition-only work is partial.

## 10. Repair

Allow at most one fresh repair worker.

Give it only:

- task ID;
- changed files;
- exact failed command or review finding;
- shortest useful error excerpt;
- exact correction required;
- behavior that must remain unchanged.

If repair remains incomplete, stop with uncommitted changes preserved.

## 11. Independent validation

Run focused checks identified in the worker report, then:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

Worker-reported validation is not sufficient.

The task is accepted only when parent review, focused validation, project check, build, and acceptance evidence all pass.

## 12. Documentation, commit, and push

Only after acceptance:

1. mark only the active task complete in the roadmap;
2. update compact project status;
3. update API or ADR documents only when the task requires them.

Review before staging:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Then:

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

If commit or push fails, stop. Do not start another task.

## 13. Stop after one task

After one successful commit and push:

- do not inspect or announce the next task;
- do not evaluate the phase gate;
- do not delegate again;
- return the report and stop.

## 14. Final report

```text
Calibration task run
Phase: <phase>
Task: <task ID and title>
Status: complete | blocked | partial | delegation-protocol-failure
Starting commit: <hash>
Ending commit: <hash>

Delegation gate:
- parent repository operations before worker: 4
- parent source/test/raw reads: 0
- parent inventory commands: 0

Worker attempts:
- original: <result>
- replacement: <result or none>
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
