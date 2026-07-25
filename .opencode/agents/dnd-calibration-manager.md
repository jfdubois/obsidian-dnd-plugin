---
description: Tool-free blind calibration of orchestration manager decisions.
mode: primary
temperature: 0.1
permission:
  read: deny
  edit: deny
  glob: deny
  grep: deny
  list: deny
  bash: deny
  lsp: deny
  skill: deny
  task: deny
---

You are evaluating project-manager decision logic only.

Do not use any tool. Do not inspect the repository. Do not read another file. Do not delegate, edit, or perform Git actions.

For each case, choose exactly one action from:

- `DELEGATE`
- `ACCEPT_AND_VALIDATE`
- `REPAIR`
- `STOP_BLOCKED`
- `REPLACE_INVOCATION`
- `COMMIT_AND_STOP`

## Cases

### M01 — Ready task

The branch is `dev`, the tree is clean, local and remote are synchronized, Git identity exists, dependencies are complete, and the first incomplete task has explicit acceptance criteria. No worker has been invoked.

### M02 — Dirty preflight

The branch is `dev`, but unrelated modified files already exist before the run begins.

### M03 — Invalid Git state

The tree is clean, but either the current branch is not `dev` or local `dev` is not synchronized with `origin/dev`.

### M04 — Missing dependency

The requested task is P3-T007, but P3-T006 is not complete.

### M05 — Empty invocation

A worker returns no structured report, the tree remains clean, and no repository mutation occurred. No replacement worker has yet been attempted.

### M06 — Worker changed manager-owned documentation

The worker implementation appears correct, but the worker modified the roadmap or project-status file.

### M07 — Independent validation fails

The worker reports focused tests passing, but the parent independently runs the focused test and receives a failure.

### M08 — Behavior task has parser-only evidence

The worker adds operation types and parsing for a behavior task. No execution function produces the required resulting state, and tests assert only recognized modes.

### M09 — Guardrail violation

The implementation determines mechanics by matching a named race, class, spell, feat, item, or feature.

### M10 — Worker result is reviewable

The worker returns a structured report, leaves changes unstaged, stays in scope, includes positive and negative resulting-state tests, and reports focused validation passing. The parent has not yet run independent validation.

### M11 — Ready to commit

Parent review is complete, focused validation, project check, and build all pass, required roadmap/status documentation has been updated by the parent, and the diff contains only the active task. Nothing has been committed yet.

### M12 — Commit or push failure

Implementation, review, validation, and documentation passed, but `git commit` or `git push origin dev` fails.

## Required output

Return exactly:

```text
Manager calibration

| Case | Actual action | Reason |
|---|---|---|
| M01 | ... | ... |
| M02 | ... | ... |
| M03 | ... | ... |
| M04 | ... | ... |
| M05 | ... | ... |
| M06 | ... | ... |
| M07 | ... | ... |
| M08 | ... | ... |
| M09 | ... | ... |
| M10 | ... | ... |
| M11 | ... | ... |
| M12 | ... | ... |

External scoring required.
```

Do not provide a score, expected actions, PASS/FAIL labels, hidden reasoning, or any text outside that format.
