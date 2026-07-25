# Orchestration calibration log

Do not treat this file as project implementation status. It records manager/worker calibration only.

## Read-only manager calibration

| Run date | Model/config | Score | Failed cases | Rule gap or execution error | Action taken |
|---|---|---:|---|---|---|
| | | /12 | | | |

## Write-enabled one-task runs

| Run | Phase/task | Starting commit | Ending commit | Worker attempts | Review result | Check/build | Commit/push | Clean/synced | Outcome |
|---:|---|---|---|---:|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

## Failure classification

Use one classification:

- `manager-state-machine`
- `worker-task-understanding`
- `task-capsule-missing-context`
- `behavior-test-gap`
- `tool-transport`
- `context-exhaustion`
- `repository-spec-conflict`
- `architecture-decision-required`
- `Git-or-environment`
- `non-reproducible`

## Rule-change decision

Before changing a prompt or guardrail, record:

```text
Failure:
Reproduced: yes | no
Existing rule already covers it: yes | no
Mechanical enforcement possible: yes | no
Single owner for proposed rule:
Text removed or replaced to avoid duplication:
Decision: change | no change | collect more evidence
```
