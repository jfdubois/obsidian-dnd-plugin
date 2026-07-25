---
name: dnd-phase-execution
description: Execute exactly one complete Obsidian D&D roadmap phase through its gate using sequential fresh Codex task workers, bounded parent context, independent review and validation, one commit and push per task, rehydration between tasks, and a separate phase-gate commit. Use only when the user explicitly assigns a complete phase; do not use for a single task.
---

# D&D phase execution

Use this skill only when the user explicitly assigns a complete roadmap phase.

## 1. Workspace roots

The Git and Codex working root is:

```text
/home/jdubois/Documents/Projects/obsidian-dnd-plugin
```

The application project source root is:

```text
/home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character
```

Delegated workers must run repository-level tools and Git-relative commands from the Git working root.

Project source paths begin with:

```text
obsidian-dnd-character/
```

Repository support paths begin directly at the Git working root:

```text
.codex/
.agents/
external/
```

Do not reinterpret `.codex/`, `.agents/`, or `external/` as children of `obsidian-dnd-character/`.

Run Git commands from the Git working root. Run project scripts with:

```bash
npm --prefix obsidian-dnd-character run <script>
```

Do not use `git -C`, initialize another repository, or change branches.

## 1.1 Stable workspace map

Use these paths exactly when constructing worker capsules:

```text
Catalog builder: obsidian-dnd-character/apps/catalog-builder/
Catalog server: obsidian-dnd-character/apps/catalog-server/
Obsidian plugin: obsidian-dnd-character/apps/obsidian-plugin/
Domain: obsidian-dnd-character/packages/domain/
Catalog contract: obsidian-dnd-character/packages/catalog-contract/
Character contract: obsidian-dnd-character/packages/character-contract/
Rules engine: obsidian-dnd-character/packages/rules-engine/
Testing: obsidian-dnd-character/packages/testing/
Raw 5eTools clone: external/5etools-src/
```

Do not guess or substitute `packages/catalog-builder`; the catalog builder is an app.

## 2. Authority

Use this order when instructions conflict:

1. `obsidian-dnd-character/AGENTS.md`
2. accepted ADRs in `docs/08_DECISIONS_RISKS_REFERENCES.md`
3. `PROJECT_CONTEXT.md`
4. product requirements
5. system architecture
6. data contracts
7. development roadmap
8. engineering SOP
9. test acceptance matrix
10. project status
11. this skill
12. existing code and tests

Do not preload these files merely because they appear in the authority list. If the `dnd_task_worker` project custom agent is unavailable, stop before task delegation and report the missing `.codex/agents/dnd-task-worker.toml` configuration. Read a lower-level authority only when the active task requires it or a conflict must be resolved.

## 3. Durable state

Conversation history and compaction summaries are not authoritative.

Maintain only this parent ledger:

```text
Phase:
Starting commit:
Completed task commits:
Current task:
Current retry:
Gate status:
Blocking issue:
```

After compaction, do not mutate files until the ledger is reconstructed from bounded control-document sections and Git state.

## 4. Delegation-first context budget

The parent orchestrator coordinates. The worker investigates and implements.

Before the first worker, the parent may load only:

1. `obsidian-dnd-character/AGENTS.md`;
2. `obsidian-dnd-character/CONTEXT_INDEX.md`;
3. the selected phase section and gate from the roadmap;
4. the current-state header of `docs/PROJECT_STATUS.md`.

Use bounded reads. Never open the complete roadmap, complete status history, or complete SOP.

For an exact phase number, extract only that phase. Example for Phase 3:

```bash
awk '
  /^# Phase 3 / {printing=1}
  printing && /^# Phase / && !/^# Phase 3 / {exit}
  printing {print}
' obsidian-dnd-character/docs/04_DEVELOPMENT_ROADMAP.md
```

Read only the status header needed to identify current phase, last task, blockers, and validation baseline, normally:

```bash
sed -n '1,100p' obsidian-dnd-character/docs/PROJECT_STATUS.md
```

Do not read `PROJECT_CONTEXT.md`, the SOP, architecture, contracts, source files, tests, raw 5eTools data, or reference fixtures before delegation unless a concrete conflict prevents task selection.

After preflight, use at most four repository read/search operations before invoking the first worker. Do not compensate with broad Bash searches.

Before the first worker, prohibited parent targets are:

```text
obsidian-dnd-character/apps/
obsidian-dnd-character/packages/
obsidian-dnd-character/external/
external/
obsidian-dnd-character/references/
```

The worker owns implementation discovery.

## 5. Preflight

Run one grouped preflight command:

```bash
pwd
git rev-parse --show-toplevel
git branch --show-current
git status --short
git log -10 --oneline
git config --get user.name
git config --get user.email
git remote -v
git fetch origin dev
git rev-list --left-right --count origin/dev...dev
git rev-parse HEAD
```

Require:

- record the exact final `git rev-parse HEAD` output as the phase `Starting commit`; do not substitute an older phase commit, status-file value, or another line from `git log`;
- current directory and Git root are `/home/jdubois/Documents/Projects/obsidian-dnd-plugin`;
- branch is exactly `dev`;
- working tree is clean;
- local `dev` and `origin/dev` are synchronized;
- Git name/email and `origin` exist;
- required control documents and selected phase exist;
- phase tasks and gate are explicit.

Do not change Git identity. If a requirement fails, stop before delegation.

Report once:

```text
Phase:
Target branch: dev
Starting commit:
Git author:
Completed tasks already present:
Remaining tasks:
Phase gate:
```

Do not repeat this information before delegation.

## 6. Phase and task selection

Use the phase explicitly assigned by the user. If the assignment is `AUTO`, select the first phase with an incomplete task or gate after confirming all previous gates are complete.

Inside the bounded phase section:

1. preserve completed tasks;
2. select the first incomplete task in roadmap order;
3. confirm earlier tasks and explicit dependencies are complete;
4. copy only the task's written requirements and applicable shared phase criteria;
5. identify task-area documents from `CONTEXT_INDEX.md` without opening them in the parent;
6. identify applicable acceptance cases from `docs/06_TEST_ACCEPTANCE_MATRIX.md` and include their exact IDs and expected results in the worker capsule.

Do not inspect implementation, tests, fixtures, raw source, or reference data before the worker.

If no incomplete task is ready, stop as blocked.

## 7. Minimal worker capsule

Prepare only:

```text
Git working root:
Project source root:
Command working directory:
Phase and task:
Dependencies confirmed:
Exact roadmap requirements:
Applicable phase acceptance criteria:
Applicable acceptance cases from docs/06_TEST_ACCEPTANCE_MATRIX.md:
Task-area documents from CONTEXT_INDEX.md:
Exact task-area root from the stable workspace map:
Approved read-only inventory command, when applicable:
Required validation:
Explicit exclusions:
Worker discovery requirement:
Worker hard limits:
Semantic completion requirement:
```

Set `Worker discovery requirement` to:

```text
Discover relevant implementation files, tests, raw-source examples, line counts,
symbols, bounded ranges, expected changes, and risks before editing. The parent
has intentionally not pre-read them.
```

Set `Worker hard limits` to:

```text
Use bounded reads for every existing file over 300 lines. Every new implementation
or test file must remain at or below 300 lines unless this capsule explicitly
records an exception before the first write. Split multi-family work before writing.
Never use shell-based file creation or transport workarounds. After one transport
failure, split the mutation; after a second transport failure, stop as blocked.
```

Set `Semantic completion requirement` to:

```text
Parser, registry, interface, discriminator, type-guard, shape-recognition, and
mode-enumeration work is partial unless the task explicitly requires only those
artifacts. For behavior tasks, every required item must have an execution symbol,
a positive behavior test asserting resulting state/output, and a negative test.
Any deferred roadmap requirement forces status partial.
```

Do not predict new filenames, public APIs, implementation structure, or expected changed files. Do not list large files unless their relevance is explicitly stated in the roadmap or current status. Always supply the exact task-area root from the stable workspace map.

Every worker capsule must distinguish these roots exactly:

```text
Git working root:
/home/jdubois/Documents/Projects/obsidian-dnd-plugin

Project source root:
/home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character

Command working directory:
/home/jdubois/Documents/Projects/obsidian-dnd-plugin
```

For `P3-T007`, supply this approved read-only inventory command and require it to run exactly once from the Git working root:

```bash
node obsidian-dnd-character/scripts/inspect-mod-operations.mjs external/5etools-src/data
```

Also include the equivalent absolute command in the capsule:

```bash
node /home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character/scripts/inspect-mod-operations.mjs \
  /home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src/data
```

If the relative command fails because the worker is in the wrong directory, retry once with the exact absolute command. If the absolute command fails, stop as blocked. Do not replace it with `find`, recursive `grep`, Python, or another inventory mechanism.

For `P3-T007`, also include this exact semantic definition of done:

```text
P3-T007 is not complete with parsing, type declarations, mode registration, or
shape recognition alone. Every supported inventoried _mod mode must validate its
required payload, execute against a cloned resolved record after _copy resolution,
preserve the original base/input record, and have a before/after behavior test plus
malformed-payload coverage. Unknown modes must fail with actionable diagnostics.
```

The worker must use the approved inventory once instead of constructing ad hoc recursive grep, Python, or shell-pipeline inventories.

When an approved command fails because a referenced repository path is missing:

1. compare the command working directory with the capsule's Git working root;
2. retry once using the exact absolute paths supplied by the capsule;
3. if the absolute command fails, stop as blocked;
4. do not begin fallback source discovery.

For replacement or retry workers after a discovery-protocol violation:

- Do not repeat broad discovery.
- Before the first edit, allow at most:
  1. the approved inventory command;
  2. one file listing;
  3. one line-count command;
  4. bounded symbol searches in relevant large files;
  5. bounded reads around only the located symbols;
  6. one bounded read of an existing test pattern;
  7. one read of the package index.
- Do not read package manifests, TypeScript configuration, complete large files, or unrelated tests unless a concrete blocker requires it.
- Produce the evidence plan and module split, then begin editing.

Report once:

```text
Starting task: <ID and title>
Dependencies: complete
Worker: new disposable Codex custom agent `dnd_task_worker`
```

Spawn exactly one fresh project custom agent named `dnd_task_worker` immediately. Wait for it to finish, collect its structured report, and close the completed worker thread before starting another task. Never resume or reuse a prior task worker. Never run two task workers concurrently.

## 8. Continue with parent control

After the worker returns, read `references/phase-control.md` before any review, repair, validation, documentation, staging, commit, push, rehydration, gate evaluation, or final report. Follow every applicable section in that reference in order.

Do not improvise a shorter lifecycle. The reference is mandatory and contains the acceptance-evidence review, repair limits, independent validation, task documentation, atomic commit/push procedure, between-task rehydration, phase-gate workflow, blocking conditions, and exact final report.
