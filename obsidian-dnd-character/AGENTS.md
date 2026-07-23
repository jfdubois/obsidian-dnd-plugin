# AGENTS.md — Mandatory Development Rules

These rules apply to every agent and every implementation task in this repository.

## 1. Work protocol

Two execution modes are permitted.

### 1.1 Single-task mode

### 1.1 Single-task mode Single-task mode is the default when a user or agent assigns one roadmap task.

Single-task mode is the default when a user or agent assigns one roadmap task.

1. Read `PROJECT_CONTEXT.md` and `CONTEXT_INDEX.md`. 
2. Read `docs/PROJECT_STATUS.md`. 
3. Select exactly one unchecked task from `docs/04_DEVELOPMENT_ROADMAP.md` unless the user explicitly assigns another task. 
4. Read only the documents listed for that task area in `CONTEXT_INDEX.md`. 
5. Inspect the existing implementation before changing files. 
6. State the task ID, scope, assumptions, and validation commands before editing. 
7. Implement only the selected task and its required supporting changes. 
8. Run all task-specific checks. 
9. Update the task checkbox and `docs/PROJECT_STATUS.md` only after acceptance criteria pass. 
10. Report changed files, commands run, test results, remaining risks, and the next task ID. 
11. Stop. Do not automatically begin the next task.

### 1.2 Phase-orchestrator mode

Phase-orchestrator mode is permitted only when the user explicitly invokes the phase workflow defined in `prompts/QWEN_TASK_PROMPT.md`.

In phase-orchestrator mode:

In phase-orchestrator mode: 

1. Select exactly one roadmap phase. 
2. Execute its incomplete tasks sequentially. 
3. Delegate each task to a new, disposable subagent session. 
4. Each task subagent must obey the single-task protocol and stop after its assigned task.
5. A task subagent must not:
  - select another task;
  - update the roadmap;
  - update `docs/PROJECT_STATUS.md`; 
  - create a Git commit; 
  - push changes; 
  - change branches; 
  - invoke another subagent.
6. The phase orchestrator must independently review and validate the task changes.
7. Only the phase orchestrator may: 
  - mark the task complete;
  - update project status;
  - commit the completed task;
  - push the task commit to `dev`.
8. After a successful task commit and push, the phase orchestrator must reload the controlling repository documents before selecting the next task.
9. After all phase tasks pass, validate and complete the phase gate.
10. Stop after the phase gate. Do not begin the next phase.
11. If any task or gate is blocked, stop the phase without inventing a solution or discarding uncommitted work.


## 2. No invented APIs

- Use only Obsidian API members present in the repository's pinned `references/obsidian/obsidian.d.ts`.
- Before using a new Obsidian API member, search the pinned file and record it in `docs/API_USAGE.md` with:
  - symbol name;
  - exact signature;
  - minimum API version from TSDoc when present;
  - project file using it;
  - reason for use.
- Do not call internal, private, undocumented, or guessed Obsidian members.
- Do not use Electron or Node-only APIs in the plugin unless the product is explicitly made desktop-only. The planned plugin must remain mobile-compatible.
- Do not use browser `fetch` for catalog calls when the documented Obsidian `requestUrl` API is required by the architecture.

## 3. Raw 5eTools isolation

- Raw 5eTools JSON may be imported only by the catalog-builder package.
- The Obsidian plugin must never import, parse, or branch on raw 5eTools structures.
- No raw 5eTools record is allowed in a character file.
- No raw 5eTools record is allowed in the normalized catalog output.
- All source references must resolve to canonical project entity IDs.
- Unresolved included references are build failures, not warnings.
- Never write entity-name exceptions such as `if (name === "Elf")` or `if (className === "Wizard")`.
- Branch only on normalized schema fields, discriminated unions, or rule capability types.
- Do not infer mechanical effects by parsing narrative rule text in the plugin or rules engine.
- Narrative-only mechanics may become automated only through a versioned, runtime-validated semantic mapping approved by an architecture decision.
- Semantic mappings must target canonical entity or feature IDs. They must not be implemented as display-name branches.
- Unmapped narrative mechanics remain safe render content with explicit automation diagnostics.

## 4. D&D Beyond usage restriction

- The D&D Beyond fixture is a behavioral and data-shape reference only.
- Do not call D&D Beyond endpoints from production code.
- Do not assume its JSON response is its database schema.
- Do not reuse D&D Beyond IDs as project canonical IDs.
- Do not copy D&D Beyond branding, assets, CSS, descriptions, or proprietary UI code.

## 5. Data ownership

Authoritative data:

- normalized versioned catalog artifacts;
- character documents;
- plugin settings;
- schema migration history.

Disposable data:

- downloaded indexes;
- entity response cache;
- option candidate cache;
- spell eligibility cache;
- level-up plan cache;
- derived character snapshots.

A character must remain reconstructable after deleting all disposable caches, provided the referenced catalog revision remains available or its entities can be migrated.

## 6. Character rules

- Every character has exactly one ruleset: `2014` or `2024`.
- Core-free content is always included by record-level access classification.
- Optional source-book access is stored per character.
- Plugin source profiles are presets only; they do not silently rewrite existing character policies.
- Existing selected content remains a required dependency when changing source access.
- Level-up option queries use the character's policy, class state, subclass, current selections, and target level.
- Persist selections and their origin grants. Do not persist all future options.

## 7. Cache rules

Every cache key must include or derive from:

- normalized catalog schema version;
- catalog revision;
- character ID when character-specific;
- character state hash when eligibility depends on character state;
- content-policy hash;
- query type and query parameters.

A cache hit is valid only when all inputs match. Unknown or incomplete cache metadata is a cache miss.

## 8. TypeScript rules

- Enable strict TypeScript.
- No `any` in domain, catalog, persistence, or calculation modules.
- Use `unknown` at external boundaries and validate before conversion.
- Use discriminated unions for effects, grants, mutations, and query types.
- Use branded string types or equivalent wrappers for entity IDs, character IDs, source IDs, and instance IDs.
- Exhaustive `switch` statements must use a `never` assertion.
- Domain modules must not depend on Obsidian UI classes.
- Side effects must be isolated behind repositories, clients, and services.
- Pure calculation functions must remain deterministic.

## 9. Persistence rules

- Plugin settings use documented `Plugin.loadData()` and `Plugin.saveData()`.
- Character files are stored in a configurable vault folder.
- Character updates use documented atomic `Vault.process()` when modifying an existing plaintext character file.
- All reads are runtime-validated.
- Every persisted structure has a schema version.
- Migrations are forward-only, deterministic, and tested.
- Never partially save a character creation or level-up transaction.

## 10. UI rules

- UI components issue commands; they do not mutate character objects directly.
- Mobile/narrow-sidebar layout is a first-class acceptance target.
- Every interactive element requires an accessible label and keyboard behavior where applicable.
- Invalid dependent selections must be shown and resolved; never silently replace them.
- Narrative rules that are not mechanically normalized are displayed as text and marked non-automated.
- Every projected mechanical rule must identify its originating normalized entity or feature.
- One normalized effect may appear in multiple sheet sections, but it must remain one effect with one activation state and one provenance trace.
- Character-sheet projections are derived and must not be persisted as authoritative character state.

## 11. Testing rules

- No task is complete without its listed automated checks.
- Every bug fix requires a regression test unless technically impossible and documented.
- Catalog import tests must cover copies, modifications, versions, references, and 2014/2024 classification.
- Calculation tests must use golden fixtures and contribution traces.
- Persistence tests must cover corrupt data, migration, and atomic mutation behavior.
- UI logic should be separated from DOM rendering so option filtering and state transitions can be unit tested.

## 12. Change control

Stop and request an architectural decision before implementing any change that:

- modifies a published catalog schema;
- changes canonical ID construction;
- allows mixed 2014/2024 content;
- changes character source-policy semantics;
- introduces a new effect or grant category;
- stores a derived value as authoritative state;
- uses an Obsidian API not found in the pinned reference;
- requires public distribution of non-free source content.

Record accepted architecture changes in `docs/08_DECISIONS_RISKS_REFERENCES.md`.

## 13. Completion report format

```text
Task: <task ID and title>
Status: complete | blocked | partial

Changed files:
- ...

Validation:
- <command>: PASS/FAIL

Acceptance criteria:
- [x] ...

Risks or limitations:
- ...

Documentation updated:
- ...

Next task:
- <task ID>
```
