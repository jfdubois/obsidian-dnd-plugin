# Qwen calibration bootstrap

The project is currently calibrating its manager/worker workflow.

## Read-only manager calibration

Use:

```text
/calibrate-manager
```

This runs the scenario matrix without repository mutation.

## One-task write-enabled calibration

Use:

```text
/phase 3
```

During calibration, `/phase <N>` completes at most one roadmap task and stops after its validated commit and push.

The complete workflow is provided by the project-local skill:

```text
dnd-phase-execution
```

Do not reconstruct the older full-phase workflow from conversation history. Full multi-task phase execution remains disabled until the promotion gate passes.
