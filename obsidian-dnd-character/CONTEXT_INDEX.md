# Context Index

Use this file to locate the minimum context required for a task.

| Task area | Required documents |
|---|---|
| Product scope or feature decision | `PROJECT_CONTEXT.md`, `docs/01_PRODUCT_REQUIREMENTS.md`, `docs/08_DECISIONS_RISKS_REFERENCES.md` |
| Repository setup | `AGENTS.md`, `docs/04_DEVELOPMENT_ROADMAP.md`, `docs/05_ENGINEERING_SOP.md`, `docs/07_WORKSPACE_SETUP.md` |
| Catalog builder | `AGENTS.md`, `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/03_DATA_CONTRACTS.md`, relevant phase in `docs/04_DEVELOPMENT_ROADMAP.md` |
| Catalog server | `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/07_WORKSPACE_SETUP.md`, relevant phase in roadmap |
| Obsidian API work | `AGENTS.md`, pinned `references/obsidian/obsidian.d.ts`, `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/05_ENGINEERING_SOP.md` |
| Character persistence | `docs/03_DATA_CONTRACTS.md`, persistence phase in roadmap, test matrix |
| Calculation engine | `docs/03_DATA_CONTRACTS.md`, engine phase in roadmap, test matrix |
| Character creator | product requirements, architecture, data contracts, creator phase |
| Level-up | product requirements, data contracts, level-up phase, acceptance matrix |
| Spell filtering | data contracts, catalog relations, source policy requirements, acceptance matrix |
| UI/sidebar/mobile | product requirements, architecture, UI phase, acceptance matrix |
| Completing any task | `AGENTS.md`, current task in roadmap, `docs/PROJECT_STATUS.md`, `prompts/QWEN_TASK_PROMPT.md` |
| Executing a complete roadmap phase | `AGENTS.md`, `prompts/QWEN_TASK_PROMPT.md`, `docs/04_DEVELOPMENT_ROADMAP.md`, `docs/05_ENGINEERING_SOP.md`, `docs/PROJECT_STATUS.md`, plus the task-specific documents listed in this index |

## Reference files that must be pinned in the repository

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

Do not load the entire D&D Beyond fixture or full raw 5eTools repository into the LLM context unless the active task requires a targeted portion.
