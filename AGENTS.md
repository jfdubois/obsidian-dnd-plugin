# AGENTS.md — Codex repository instructions

These instructions apply from the Git root:

```text
/home/jdubois/Documents/Projects/obsidian-dnd-plugin
```

The application project is:

```text
obsidian-dnd-character/
```

## Mandatory project rules

Before repository inspection, mutation, validation, delegation, or Git activity, read and follow:

```text
obsidian-dnd-character/AGENTS.md
```

Repository documentation is binding. Do not substitute conversation history, compaction summaries, or model memory for the current repository state.

## Execution modes

### One roadmap task

When the user assigns one task, use single-task mode from `obsidian-dnd-character/AGENTS.md`. Implement exactly that task and stop after the task report. Do not stage, commit, or push unless the user explicitly requests those Git actions.

### One complete roadmap phase

When the user explicitly assigns a complete phase, load the repository skill:

```text
$REPO_ROOT/.agents/skills/dnd-phase-execution/SKILL.md
```

Follow it as the controlling workflow. The main Codex thread is the phase orchestrator. Spawn exactly one fresh project custom agent named `dnd_task_worker` for each roadmap task. Never run two task workers concurrently. The parent thread alone may update roadmap/status documents, stage, commit, or push.

If the phase skill or the `dnd_task_worker` custom agent is unavailable, stop before repository mutation and report the missing Codex configuration.

## Workspace boundaries

Run Git commands from the Git root. Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

Do not reinterpret `.codex/`, `.agents/`, or `external/` as children of `obsidian-dnd-character/`.

## Git safety

- Work on `dev` for roadmap execution.
- Keep `dev` synchronized with `origin/dev`.
- Never merge or push to `main` without explicit user instruction.
- Never use destructive Git commands prohibited by `obsidian-dnd-character/AGENTS.md` and the active phase skill.
- Preserve uncommitted user work. Do not reset, restore, clean, stash, or discard it.
