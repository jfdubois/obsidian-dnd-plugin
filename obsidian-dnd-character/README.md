# Obsidian D&D Character Manager — Project Pack

This pack is the controlling documentation for developing the project with a local coding LLM.

## Read order

1. `PROJECT_CONTEXT.md`
2. `CONTEXT_INDEX.md`
3. `AGENTS.md`
4. `docs/01_PRODUCT_REQUIREMENTS.md`
5. `docs/02_SYSTEM_ARCHITECTURE.md`
6. `docs/03_DATA_CONTRACTS.md`
7. `docs/04_DEVELOPMENT_ROADMAP.md`
8. `docs/05_ENGINEERING_SOP.md`
9. `docs/06_TEST_ACCEPTANCE_MATRIX.md`
10. `docs/07_WORKSPACE_SETUP.md`
11. `docs/08_DECISIONS_RISKS_REFERENCES.md`
12. `docs/PROJECT_STATUS.md`
13. `prompts/QWEN_TASK_PROMPT.md`

## Controlling rules

- `AGENTS.md` contains mandatory implementation guardrails.
- `docs/04_DEVELOPMENT_ROADMAP.md` is the task source of truth.
- `docs/PROJECT_STATUS.md` records completed work, current task, blockers, and validation results.
- A task is complete only when its acceptance criteria and required checks pass.
- The Obsidian plugin may use only API members verified in the pinned `obsidian.d.ts` reference.
- The plugin must never parse raw 5eTools records at runtime.
- Character files contain authoritative character state; generated eligibility lists and derived values are disposable caches.

## Recommended repository placement

Copy this pack into the root of the future repository. Keep `AGENTS.md`, `PROJECT_CONTEXT.md`, and `CONTEXT_INDEX.md` at repository root. Keep the remaining project documents under `docs/` and prompts under `prompts/`.
