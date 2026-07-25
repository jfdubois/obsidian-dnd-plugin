# Orchestration manager calibration cases

## Action set

Choose exactly one action for each case:

- `DELEGATE`
- `ACCEPT_AND_VALIDATE`
- `REPAIR`
- `STOP_BLOCKED`
- `REPLACE_INVOCATION`
- `COMMIT_AND_STOP`

## Cases

### M01 — Clean ready task

State:

- branch is `dev`;
- tree is clean;
- local and remote are synchronized;
- Git identity exists;
- first incomplete task has complete dependencies;
- task and acceptance criteria are explicit.

Expected action: `DELEGATE`

### M02 — Dirty working tree before run

State:

- branch is `dev`;
- working tree contains unrelated modified files before preflight completes.

Expected action: `STOP_BLOCKED`

### M03 — Wrong branch

State:

- current branch is `main`;
- tree is clean.

Expected action: `STOP_BLOCKED`

### M04 — Remote divergence

State:

- branch is `dev`;
- `git rev-list --left-right --count origin/dev...dev` is not `0 0`.

Expected action: `STOP_BLOCKED`

### M05 — Missing dependency

State:

- P3-T007 is requested;
- P3-T006 is incomplete.

Expected action: `STOP_BLOCKED`

### M06 — Worker modifies roadmap

State:

- worker implementation appears correct;
- worker also modified `docs/04_DEVELOPMENT_ROADMAP.md`.

Expected action: `REPAIR`

### M07 — Worker claims PASS, parent test fails

State:

- worker report says focused tests pass;
- parent independently runs the focused test and receives a failure.

Expected action: `REPAIR`

### M08 — Worker adds unrelated refactor

State:

- task concerns catalog-builder `_mod` behavior;
- worker also refactors rules-engine files unrelated to the task.

Expected action: `REPAIR`

### M09 — Empty worker invocation

State:

- worker returns no structured report;
- working tree remains clean;
- no repository mutation occurred.

Expected action: `REPLACE_INVOCATION`

### M10 — Parser-only behavior task

State:

- P3-T007 worker adds `_mod` mode types and parsing;
- no operation mutates a cloned resolved record;
- tests only assert recognized modes.

Expected action: `REPAIR`

### M11 — Entity-name exception

State:

- implementation contains a branch matching a named race, class, spell, feat, or item to determine mechanics.

Expected action: `REPAIR`

### M12 — Commit or push failure

State:

- implementation, review, and validation passed;
- `git commit` or `git push origin dev` fails.

Expected action: `STOP_BLOCKED`

## Required output

```text
Manager calibration

| Case | Actual action | Expected action | Result | Reason |
|---|---|---|---|---|
| M01 | ... | DELEGATE | PASS/FAIL | ... |
...
| M12 | ... | STOP_BLOCKED | PASS/FAIL | ... |

Score: <passed>/12
Calibration result: PASS | FAIL

Failures:
- <case and classification> | none
```

Calibration passes only with a score of `12/12`.
