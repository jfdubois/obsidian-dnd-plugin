# Qwen phase-execution bootstrap

This file is intentionally short. The complete phase workflow is provided by the project-local OpenCode skill:

```text
dnd-phase-execution
```

When the user references this file and assigns a phase:

1. load the `dnd-phase-execution` skill before any repository action;
2. interpret the user's phase number or phase ID as the exact selected phase;
3. execute that phase sequentially through its gate;
4. delegate every roadmap task to a fresh `dnd-task-worker`;
5. stop after the selected phase gate or on a blocker defined by the skill.

The active workspace is:

```text
Git worktree: /home/jdubois/Documents/Projects/obsidian-dnd-plugin
Project:      obsidian-dnd-character/
Branch:       dev
```

Do not reconstruct the old phase workflow from conversation history. Do not continue if the skill or `dnd-task-worker` agent is unavailable; report the missing project-local OpenCode configuration instead.

Preferred invocation:

```text
/phase 3
```

Compatibility invocation:

```text
@obsidian-dnd-character/prompts/QWEN_TASK_PROMPT.md execute Phase 3
```
