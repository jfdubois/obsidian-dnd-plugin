# Context Index

Use this file to locate the minimum context required for a task. Do not load every listed file in full when a targeted section is sufficient.

| Task area | Required documents |
|---|---|
| Product scope or feature decision | `PROJECT_CONTEXT.md`, relevant section of `docs/01_PRODUCT_REQUIREMENTS.md`, relevant ADR/risk section |
| Repository setup | `AGENTS.md`, active roadmap task, relevant sections of engineering SOP |
| Catalog builder | `AGENTS.md`, relevant architecture/data-contract sections, active Phase 3 or 4 task |
| Catalog server | relevant architecture/workspace sections and active Phase 5 task |
| Obsidian API work | `AGENTS.md`, pinned `references/obsidian/obsidian.d.ts`, relevant architecture and API-register sections |
| Character persistence | relevant data-contract sections, active persistence task, related acceptance tests |
| Calculation engine | relevant effect/snapshot contracts, active engine task, related acceptance tests |
| Character creator | relevant product, contract, and active creator-task sections |
| Level-up/source policy | relevant product, contract, active progression task, and acceptance sections |
| Spell filtering | query/relations/source-policy contract sections and related acceptance tests |
| UI/sidebar/mobile | relevant product/UI architecture sections and related acceptance tests |
| Completing one task | `AGENTS.md`, current-state portion of `docs/PROJECT_STATUS.md`, exact roadmap task and gate, task-specific rows above, current implementation/tests |
| Executing a complete phase | Codex skill `.agents/skills/dnd-phase-execution/SKILL.md`, `AGENTS.md`, selected phase section/gate, current-state portion of project status; task-specific documents are loaded only when each task begins |

## Reference files that must remain pinned

```text
references/
├── obsidian/
│   ├── obsidian.d.ts
│   ├── sample-plugin-main.ts
│   ├── sample-plugin-package.json
│   ├── sample-plugin-manifest.json
│   ├── sample-plugin-tsconfig.json
│   └── SOURCE.md
├── dndbeyond/
│   ├── character-156579226.json
│   └── SOURCE.md
└── fiveetools/
    ├── SOURCE_COMMIT.txt
    ├── SOURCE.md
    └── schema-notes/
```

Do not load an entire reference fixture or the full raw 5eTools repository unless the active task requires a targeted portion.
