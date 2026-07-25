---
description: Execute one roadmap phase with the D&D phase orchestrator
agent: dnd-phase-orchestrator
subtask: false
---

Execute roadmap phase `$ARGUMENTS` for the Obsidian D&D Character Manager.

Before any repository read or command:

1. load the `dnd-phase-execution` skill;
2. interpret `$ARGUMENTS` as the exact phase number or phase ID;
3. execute that phase sequentially through its gate;
4. use a fresh `dnd-task-worker` for every task;
5. stop after the phase gate or on a defined blocker.

Do not treat this command text as a substitute for the skill.
