---
description: Complete one task from a selected roadmap phase during orchestration calibration
agent: dnd-phase-orchestrator
subtask: false
---

Execute one calibration task from roadmap phase `$ARGUMENTS` for the Obsidian D&D Character Manager.

Before any repository action:

1. load `dnd-phase-execution`;
2. interpret `$ARGUMENTS` as the exact phase number or phase ID;
3. select the first incomplete task in that phase;
4. delegate it to one fresh `dnd-task-worker`;
5. independently review and validate it;
6. commit and push it only if fully accepted;
7. stop after that single task.

Do not continue to the next task. Full-phase execution is disabled during calibration.
