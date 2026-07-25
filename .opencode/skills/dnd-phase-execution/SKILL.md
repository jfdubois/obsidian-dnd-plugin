---
name: dnd-phase-execution
description: Execute exactly one roadmap task or one declared task slice from a selected Obsidian D&D phase with hard early delegation, independent review, validation, commit, push, and immediate stop. Use for `/phase <number>` during calibration.
---

# D&D single-unit execution

## 1. Outcome

Complete at most one execution unit from the phase selected by the user.

An execution unit is:

- one ordinary roadmap task; or
- one roadmap slice explicitly listed beneath an oversized task.

P3-T007 is an oversized task and is executed as five slices. Never run more than one slice per `/phase 3` invocation.

## 2. Workspace

```text
Git root:     /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project root: /home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character
Branch:       dev
```

Run Git from the Git root. Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

## 3. Pre-delegation budget

After loading this skill, perform exactly four repository operations before the worker:

1. grouped Git preflight;
2. bounded selected-phase extraction;
3. bounded project-status header read;
4. bounded capsule read for the selected task or slice.

Do not use parent Read, Glob, Grep, List, or LSP. Do not inspect implementation, tests, raw data, package files, architecture, contracts, SOP, or acceptance documents. Do not run an inventory command in the parent.

A breach before mutation ends the run as `delegation-protocol-failure`.

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

Require the configured root, branch `dev`, clean tree, synchronized `origin/dev`, Git identity, and origin. Record the final hash as `Starting commit`.

## 5. Select one execution unit

Extract only the assigned phase:

```bash
awk '
  /^# Phase <N> / {printing=1}
  printing && /^# Phase / && !/^# Phase <N> / {exit}
  printing {print}
' obsidian-dnd-character/docs/04_DEVELOPMENT_ROADMAP.md
```

Read only:

```bash
sed -n '1,55p' obsidian-dnd-character/docs/PROJECT_STATUS.md
```

Selection rules:

1. Find the first incomplete top-level task.
2. If that task contains incomplete executable slices, select its first incomplete slice.
3. Confirm all prior tasks and prior slices are complete.
4. Select nothing else.

### P3-T007 capsule mapping

| Slice | Capsule |
|---|---|
| P3-T007-S1 | `obsidian-dnd-character/prompts/P3_T007_S1_ARRAY.md` |
| P3-T007-S2 | `obsidian-dnd-character/prompts/P3_T007_S2_SCALAR_TEXT.md` |
| P3-T007-S3 | `obsidian-dnd-character/prompts/P3_T007_S3_SENSE_SKILL.md` |
| P3-T007-S4 | `obsidian-dnd-character/prompts/P3_T007_S4_SPELLS.md` |
| P3-T007-S5 | `obsidian-dnd-character/prompts/P3_T007_S5_INTEGRATION.md` |

Read only the selected capsule with `sed -n '1,260p'` as operation four.

## 6. Delegate immediately

Output:

```text
Delegation gate
Phase: <phase>
Execution unit: <task or slice ID and title>
Starting commit: <hash>
Parent repository operations after skill load: 4
Parent source/test/raw reads: 0
Parent inventory commands: 0
Worker: fresh dnd-task-worker
```

Invoke one fresh worker with the capsule content and exact roots. Do not perform another repository operation first.

## 7. Empty or crashed worker

After a worker crash, missing report, or connection loss:

1. run `git status --short` and `git diff --stat`;
2. if the tree is clean, classify as `REPLACE_INVOCATION` and permit one fresh replacement worker;
3. if the tree is modified, preserve all changes, review the diff, and classify as repair or partial;
4. never reset, restore, clean, or stash.

A clean failed invocation does not consume the repair attempt.

## 8. Parent review

After worker return, run compact metadata:

```bash
git status --short
git diff --check
git diff --stat
git diff --numstat
git diff --name-only
```

Review changed files individually with bounded diffs. Confirm:

- changes match only the selected slice;
- roadmap/status were not changed by the worker;
- each assigned mode has an execution symbol, resulting-state test, and malformed test;
- no parser-only completion;
- no unauthorized scan, denied-command continuation, shell mutation, oversized new file, raw leakage, protected `any`, entity-name branch, or unrelated refactor.

Do not require modes assigned to future slices.

## 9. Repair

Allow at most one fresh repair worker for the selected slice. Provide only the failed finding, changed files, exact correction, and behavior that must remain unchanged.

If still incomplete, stop partial with changes preserved.

## 10. Validation

Run the focused command from the slice capsule, then:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

For S1-S4, project-wide checks must pass before the slice commit. For S5, also verify CAT-003, CAT-003A, CAT-003B, and CAT-004 across all 21 modes.

## 11. Documentation and commit

After an accepted slice:

- mark only that slice complete in the roadmap;
- update current status to the next incomplete slice;
- do not mark P3-T007 complete for S1-S4.

Commit S1-S4 as:

```bash
git add -A
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git commit -m "chore(project): complete <SLICE-ID>" -m "<SLICE-ID>"
git push origin dev
```

For S5, after all full-task acceptance checks pass:

- mark S5 and P3-T007 complete;
- update status to P3-T008;
- commit:

```bash
git commit -m "chore(project): complete P3-T007" -m "P3-T007"
git push origin dev
```

Verify clean tree and synchronized branch. Stop after the commit. Do not start the next slice or task.

## 12. Final report

```text
Calibration execution
Phase: <phase>
Execution unit: <ID and title>
Status: complete | blocked | partial | delegation-protocol-failure
Starting commit: <hash>
Ending commit: <hash>

Worker attempts:
- original: <result>
- replacement: <result or none>
- repair: <result or none>

Validation:
- focused: PASS | FAIL | NOT AVAILABLE
- check: PASS | FAIL
- build: PASS | FAIL

Commit:
- <hash or none>

Next execution unit:
- <ID or none>
```
