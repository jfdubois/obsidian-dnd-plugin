# Qwen phase-execution bootstrap

This file is intentionally short. The complete phase workflow is provided by the project-local OpenCode skill:

```text
dnd-phase-execution
```

When the user references this file and assigns a phase:

1. load the `dnd-phase-execution` skill before any repository action;
2. interpret the user's phase number or phase ID as the exact selected phase;
3. preserve every completed roadmap task and phase gate;
4. select the first incomplete task from repository state;
5. delegate every task to a fresh `dnd-task-worker`;
6. stop after the selected phase gate or a blocker defined by the skill.

The active workspace is:

```text
Git worktree: /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project:      obsidian-dnd-character/
Branch:       dev
```

Do not reconstruct workflow state from conversation history. Do not continue if the skill or `dnd-task-worker` agent is unavailable.

Before delegation, require a clean working tree. An interrupted P4-T004 attempt must be reviewed and either retained intentionally or backed up and discarded by the operator before `/phase 4` is run.

Preferred invocation:

```text
/phase 4
```

Compatibility invocation:

```text
@obsidian-dnd-character/prompts/QWEN_TASK_PROMPT.md execute Phase 4
```
