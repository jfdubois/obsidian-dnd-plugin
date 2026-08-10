# 05 — Engineering Standard Operating Procedure

## 1. Branch Policy

### Branch roles 
| Branch | Role | Automated agent access |
|---|---|---|
| `main` | Release branch containing explicitly approved releases. | No automatic commits, merges, or pushes. |
| `dev` | Active integration and development branch. | Validated roadmap tasks and phase gates are committed and pushed directly. |
| Optional task branch | Used only when the user explicitly requests an isolated or experimental branch. | Not created automatically. |

### Branch rules 

1. Normal roadmap development occurs directly on `dev`. 
2. Each completed roadmap task is one atomic commit on `dev`. 
3. Push each completed task commit to `origin/dev` before starting the next task. 
4. A phase gate is committed separately after every task in the phase is complete. 
5. Keep `dev` green. Do not commit or push incomplete or failing work. 
6. The working tree must be clean before beginning a phase. 
7. The local `dev` branch must be synchronized with `origin/dev` before beginning a phase. 
8. Do not automatically merge or push to `main`. 
9. Movement from `dev` to `main` requires an explicit user instruction. 
10. Do not create a task branch unless the user explicitly requests one. 

### Standard task workflow 

```bash 
git fetch origin dev 
git status --short 
git branch --show-current 
git rev-list --left-right --count origin/dev...dev
```

# Implement and validate one task. 

```bash
git diff --check 
git diff --stat 
git add -A 
git diff --cached --check 
git diff --cached --stat 
git commit -m "chore(project): complete P2-T009" -m "P2-T009"
git push origin dev
```

### Example workflow

```bash
git checkout dev
git pull origin dev
git checkout -b P3-T006-resolve-copy
# ... implement, test, validate ...
git add .
git commit -m "feat(builder): implement _copy resolver"
git push origin P3-T006-resolve-copy
# After review and CI: squash-merge into dev, delete branch
```

## 2. Commit Policy

### Commit message format

Follow Conventional Commits with a scope qualifier:

```
<type>(<scope>): <description>
```

### Types

| Type | Use for |
|---|---|
| `feat` | New functionality (roadmap task implementation) |
| `fix` | Bug fixes |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation, status, ADR updates |
| `chore` | Configuration, tooling, dependency updates |
| `build` | Build system, bundler, compiler changes |

### Scopes

Use the component or package name: `builder`, `plugin`, `engine`, `domain`, `catalog`, `server`, `contract`, `project`.

### Rules

1. One completed roadmap task per commit.
2. Use the configured Git author identity. Do not use `--author`.
3. Do not add an AI or agent as an author or co-author.
4. Do not amend an existing task commit.
5. The standard roadmap task message is:

   ```text
   chore(project): complete <TASK-ID>

   <TASK-ID>
   ```

6. The standard phase-gate message is:
  ```text
  chore(project): complete phase <PHASE-NUMBER> gate

  Phase <PHASE-NUMBER> gate
  ```

7. git add -A is allowed only after reviewing the unstaged file list and confirming that every change belongs to the active task or gate.
8. Review the staged file list and staged diff before committing.
9. Push the task commit to origin/dev before beginning another task.
10. Do not commit secrets, raw 5eTools source, or non-free catalog content.
11. Do not commit generated plugin output such as main.js or source-map files.

## 3. Objective

Ensure a local coding LLM can develop the system incrementally without scope drift, undocumented APIs, source-format leakage, or unverifiable completion claims.

## 4. Task lifecycle

### Step 1 — Select task

Select one roadmap task. Confirm that all dependency tasks are complete.

### Step 2 — Establish context

Read:

- `AGENTS.md`;
- the current-state sections of `docs/PROJECT_STATUS.md`;
- the selected phase, active task, and phase gate from the roadmap;
- only the relevant architecture/contracts/test sections listed by `CONTEXT_INDEX.md`.

Do not load `docs/PROJECT_HISTORY.md` unless investigating a prior task or decision.

### Step 3 — Inspect current state

Before editing:

- list relevant files;
- read existing interfaces and tests;
- search for similar implementation;
- inspect pinned Obsidian API before any new API use;
- inspect targeted raw source fixtures only when working in catalog-builder.

### Step 4 — State implementation contract

Write a short plan containing:

- task ID;
- files expected to change;
- public interfaces affected;
- assumptions;
- validation commands;
- explicit exclusions.

### Step 5 — Implement smallest complete slice

- Avoid speculative abstractions.
- Do not implement future roadmap tasks.
- Add tests in the same change.
- Preserve dependency direction.
- Convert `unknown` at boundaries through runtime validation.

### Step 6 — Validate

Run, as applicable:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Also run package- or task-specific tests.

### Step 7 — Review diff

Begin with `git diff --check`, `git diff --stat`, `git diff --numstat`, and `git diff --name-only`. Review changed files individually with bounded hunks when the total diff exceeds 400 changed lines or includes an existing file over 300 lines. Use unrestricted full diffs only when needed for cross-file consistency.

Check:

- no accidental generated/source files;
- no `any` in protected modules;
- no undocumented Obsidian calls;
- no name exceptions;
- no raw source fields outside builder;
- no persisted derived values;
- no silent error handling;
- tests assert behavior, not only implementation details.

### Step 8 — Update documentation

Only after passing:

- check the roadmap task;
- update the compact current state and latest work entry in `docs/PROJECT_STATUS.md`;
- move entries older than the latest three to `docs/PROJECT_HISTORY.md`;
- update `docs/API_USAGE.md` if applicable;
- update decision log if architecture changed;
- update contracts/references when intentionally changed.

### Step 9 — Commit

Recommended commit style:

```text
feat(catalog): implement copy resolver
fix(engine): preserve shield AC contribution
refactor(plugin): isolate character command handler
test(leveling): add source-policy eligibility fixture
docs(project): complete P4-T004
```

### Step 10 — Report or continue 

In single-task mode, report and stop. 

In phase-orchestrator mode: 

1. commit and push the validated task; 
2. reload the controlling documents; 
3. select the next ready task in the same phase; 
4. stop only after the phase gate passes or the phase becomes blocked.

## 5. Definition of Ready

A task is ready when:

- dependencies are complete;
- scope and acceptance criteria are unambiguous;
- required reference data exists;
- required schema/API decisions are already accepted;
- expected validation can be executed locally.

If not ready, mark blocked and state the exact missing input.

## 6. Definition of Done

A task is done only when:

- implementation is complete;
- runtime schemas exist for new boundaries;
- tests cover success and failure paths;
- typecheck/lint/tests/build pass as required;
- documentation and status are updated;
- no new unresolved warnings were introduced;
- acceptance criteria are demonstrated.

## 7. Obsidian API verification SOP

For each new symbol:

1. Search the pinned `references/obsidian/obsidian.d.ts`.
2. Copy the exact signature into `docs/API_USAGE.md`.
3. Record TSDoc `@since` value when present.
4. Confirm chosen `minAppVersion` supports it.
5. Use no parameters or behavior not present in the signature/documentation.
6. Add a manual smoke-test scenario where automated testing is impractical.

If the symbol is not found, do not use it.

## 8. 5eTools importer SOP

For each entity type:

1. Identify canonical source file(s) used for all entities of that type.
2. Define minimal raw DTO as `unknown`-validated input.
3. Resolve copy/version mechanics before normalization.
4. Parse source references structurally.
5. Normalize structured fields generically.
6. Convert narrative entries to safe render nodes.
7. Record unsupported mechanics.
8. Resolve all emitted dependencies globally.
9. Add at least:
   - plain record fixture;
   - copied record fixture;
   - modified record fixture where applicable;
   - 2014 fixture;
   - 2024 fixture;
   - malformed/unresolved fixture.
10. Fail publication if included references remain unresolved.

### 8.0 Creator-origin normalization coverage

For Species, Background, and starting Class, classify every verified structured creator-relevant field as an automatic grant, a selectable normalized choice, display/context information, or an unsupported-mechanic diagnostic. Preserve its normalized origin, prerequisites, dependencies, provenance, and ruleset. Do not relocate ownership to a global creator page, infer it from narrative text, or add entity-name exceptions. Missing structured coverage is an actionable normalization defect and must not be silently published as creator-ready.

### 8.1 Rule semantics and character-sheet projection SOP

For every normalized rule-bearing entity:

1. Preserve the complete supported narrative content as safe render nodes.
2. Normalize supported structured source fields generically.
3. Classify each normalized mechanic as:
  - derived-value effect;
  - conditional roll effect;
  - defense or immunity;
  - capability;
  - grant;
  - action;
  - resource;
  - display-only mechanic;
  - narrative information.
4. Assign an automation status:
  - full;
  - partial;
  - display-only;
  - manual-adjudication.
5. Assign a primary character-sheet projection.
6. Assign secondary projections only when the same rule is useful in multiple sections.
7. Record effect provenance:
  - source entity ID;
  - source ID;
  - structured or reviewed-mapping origin.
8. Do not parse narrative rule text at plugin runtime or rules-engine runtime.
9. Do not add entity-name or feature-name branches.
10. A reviewed semantic mapping may add an effect only when:
  - it targets a canonical entity or feature ID;
  - it is versioned and runtime-validated;
  - it identifies its ruleset and source revision;
  - it contains normalized data only;
  - it has positive and negative tests.
11. Leave unmapped narrative mechanics visible.
12. Emit an actionable diagnostic for every known but non-automated mechanic.
13. Ensure that one effect projected into multiple sections is evaluated only once.
14. Add tests covering:
  - normalization;
  - activation;
  - deactivation;
  - projection;
  - source provenance;
  - unsupported behavior.

Default projections shall be based on normalized mechanic type, not on display names.

Examples:

| Mechanic | Primary projection | Secondary projection |
|---|---|---|
| AC formula | Armor Class | Inventory |
| Conditional save advantage | Saving Throws | Defenses |
| Skill-check disadvantage | Skills | Inventory |
| Damage resistance | Defenses | Features and Traits |
| Disease immunity | Defenses | Species Traits |
| No breathing required | Species Traits | Defenses |
| Species narrative feature | Species Traits | — |
| Class feature | Class Features | Actions or Resources when applicable |

The character sheet shall consume normalized projections from the derived snapshot. It shall not independently decide rule meaning from source text.

## 9. Character transaction SOP

For create/edit/level/equipment/source-policy transactions:

1. Load and validate current character.
2. Load required catalog entities for the active revision.
3. Build proposed state in memory.
4. Validate all selections and dependencies.
5. Derive preview snapshot.
6. Show diagnostics/confirmation where user-facing.
7. Apply one atomic repository mutation.
8. Invalidate affected caches.
9. Recalculate and publish update event.

Never write intermediate wizard/level-up state to the authoritative character file.

## 10. Cache SOP

- Cache is optional for correctness.
- Cache reads must validate envelope metadata.
- Cache write failure must not corrupt character state.
- Cache clear operation must be safe at any time.
- Cache invalidation must be explicit after character/source/catalog changes.
- Do not synchronize large transient caches through the vault unless formally decided.

## 11. Testing strategy

### Unit tests

- parsing;
- schemas;
- normalizers;
- calculations;
- eligibility queries;
- state machines;
- migrations;
- command validation.

### Golden tests

- normalized catalog excerpts;
- representative 2014 character snapshot;
- representative 2024 character snapshot;
- level-up before/after snapshots.

### Integration tests

- builder to generated revision;
- catalog client to fixture server;
- repository to test vault abstraction where feasible;
- transaction and cache invalidation.

### Manual tests

- Obsidian lifecycle;
- right-sidebar placement;
- settings UI;
- desktop and Android narrow layouts;
- real Docker server access.

## 12. Error and diagnostic format

Errors should include:

- stable code;
- human-readable message;
- component;
- entity/character/file identifier where available;
- catalog revision;
- recoverability;
- optional structured details.

Example:

```ts
interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  entityId?: EntityId;
  path?: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}
```

## 13. Code review checklist

- [ ] Scope matches one roadmap task.
- [ ] Domain boundaries respected.
- [ ] Runtime validation at external/persistence boundaries.
- [ ] No raw source leakage.
- [ ] No undocumented API.
- [ ] No name-specific rule exception.
- [ ] No authoritative derived value.
- [ ] Cache can be deleted safely.
- [ ] Errors are actionable.
- [ ] Tests include negative path.
- [ ] Documentation updated.
## 14. Context-efficient execution

### 14.1 Bounded document reads

- Read only the selected roadmap phase and its gate during a phase run.
- Read only applicable SOP, architecture, contract, and acceptance sections.
- Treat `docs/PROJECT_STATUS.md` as compact current state.
- Treat `docs/PROJECT_HISTORY.md` as historical reference loaded only for explicit investigation.
- Do not reread the complete phase prompt after every completed task.

### 14.2 Between-task state

After a task commit and push, retain only the phase ledger, commit hash, validation result, unresolved risk, next task, and gate status. Rehydrate from compact status, the selected roadmap phase, the next task's indexed documents, and Git state.

### 14.3 Validation output

For successful commands, retain the command, exit code, test count when available, and PASS status. For failures, retain only the first causal error and the shortest useful excerpt.

### 14.4 Context reserve

For models with an 81,920-token context, reserve at least 20 percent for review, repair, validation, documentation, and final reporting. Compact closed task context before selecting another task when approximately 60 percent has been consumed.
