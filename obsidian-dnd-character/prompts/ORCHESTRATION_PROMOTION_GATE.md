# Orchestration promotion gate

Full multi-task phase execution remains disabled until every criterion passes.

## Manager calibration

- [ ] Read-only manager score is 12/12.
- [ ] No repository actions occurred during the read-only test.
- [ ] Failed cases, if any, were classified before prompt changes.

## Single-task execution

Three consecutive real task runs must each satisfy:

- [ ] Correct first incomplete task selected.
- [ ] One original worker used.
- [ ] No more than one repair worker used.
- [ ] Worker stayed within task scope.
- [ ] Parent found and evaluated semantic behavior evidence.
- [ ] Focused tests passed.
- [ ] Project check passed.
- [ ] Project build passed.
- [ ] Parent alone updated roadmap/status.
- [ ] One atomic task commit was pushed.
- [ ] Working tree ended clean.
- [ ] Local and remote `dev` ended synchronized.
- [ ] Run stopped without selecting the next task.

## Context stability

- [ ] No run failed from context exhaustion.
- [ ] No run depended on conversation history after compaction.
- [ ] No run loaded unrelated source or full reference fixtures.

## Promotion decision

```text
Decision: keep single-task mode | pilot two-task mode
Evidence:
Director approval:
Date:
```

The first promotion is only to a two-task pilot, not directly to an entire phase.
