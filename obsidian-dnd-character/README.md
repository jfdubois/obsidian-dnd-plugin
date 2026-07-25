# Obsidian D&D Character Manager — Project Pack

This pack is the controlling documentation for development with OpenCode and the local Qwen model.

## Context authority

The following list describes authority and document location. It is **not** an instruction to load every file into one prompt.

1. `AGENTS.md`
2. accepted decisions in `docs/08_DECISIONS_RISKS_REFERENCES.md`
3. `PROJECT_CONTEXT.md`
4. relevant sections of `docs/01_PRODUCT_REQUIREMENTS.md`
5. relevant sections of `docs/02_SYSTEM_ARCHITECTURE.md`
6. relevant sections of `docs/03_DATA_CONTRACTS.md`
7. the exact phase/task in `docs/04_DEVELOPMENT_ROADMAP.md`
8. relevant sections of `docs/05_ENGINEERING_SOP.md`
9. relevant cases in `docs/06_TEST_ACCEPTANCE_MATRIX.md`
10. the current-state portion of `docs/PROJECT_STATUS.md`

Agents must use `CONTEXT_INDEX.md` as a whitelist and read bounded sections only. `docs/PROJECT_HISTORY.md` is historical evidence and is never normal task or phase context.

Complete-phase execution is controlled by:

```text
.opencode/skills/dnd-phase-execution/SKILL.md
```

Preferred invocation:

```text
/phase <number>
```

## Branch and commit policy

See `docs/05_ENGINEERING_SOP.md` sections 1 and 2 for the complete policy.

| Branch | Role |
|---|---|
| `main` | Release branch; changed only after explicit user approval. |
| `dev` | Active integration branch; validated task commits are pushed directly. |
| Optional task branch | Created only when explicitly requested. |

- Normal development occurs directly on `dev`.
- One validated roadmap task is committed at a time.
- Each task commit is pushed before the next task begins.
- A phase gate receives a separate commit.
- Automated agents do not merge or push to `main`.

Standard task commit:

```text
chore(project): complete <TASK-ID>

<TASK-ID>
```

## Controlling rules

- `AGENTS.md` contains mandatory implementation guardrails.
- `docs/04_DEVELOPMENT_ROADMAP.md` is the task source of truth.
- `docs/PROJECT_STATUS.md` records current phase/task, blockers, and validation.
- A task is complete only when its acceptance criteria and required checks pass.
- The Obsidian plugin may use only API members verified in the pinned `obsidian.d.ts` reference.
- The plugin must never parse raw 5eTools records at runtime.
- Character files contain authoritative character state; generated eligibility lists and derived values are disposable caches.
