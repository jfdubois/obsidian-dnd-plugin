# 05 — Engineering Standard Operating Procedure

## 1. Branch Policy

### Branch roles

| Branch | Role | Protection requirement |
|---|---|---|
| `main` | Release branch. Contains only validated, gate-passed releases. | Required |
| `dev` | Integration branch. All completed tasks integrate here first. | Required |
| `P#-T###-<slug>` | Feature branch. One roadmap task per branch. | Not required |

### Branch rules

1. Never push directly to `main` or `dev`.
2. Each roadmap task works on a branch named `P#-T###-<descriptive-slug>` (e.g. `P0-T003-pin-obsidian-refs`).
3. A feature branch is created from `dev`.
4. After acceptance criteria pass, merge the feature branch into `dev` with a squash merge.
5. When a phase gate passes, merge `dev` into `main` with a merge commit.
6. Delete the feature branch after merge.
7. Keep `dev` green at all times. Do not merge incomplete work.

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

1. One roadmap task per branch; multiple commits per branch are allowed.
2. Imperative mood in the description (e.g. "implement", not "implemented").
3. No period at the end of the subject line.
4. Subject line max 72 characters.
5. Include the task ID in the body when the commit is part of a roadmap task:

```
feat(builder): implement _copy resolver

P3-T006
```

6. Do not commit secrets, raw 5eTools source, or non-free catalog content.
7. Do not commit generated plugin output (`main.js`, `.map` files).

## 3. Objective

Ensure a local coding LLM can develop the system incrementally without scope drift, undocumented APIs, source-format leakage, or unverifiable completion claims.

## 4. Task lifecycle

### Step 1 — Select task

Select one roadmap task. Confirm that all dependency tasks are complete.

### Step 2 — Establish context

Read:

- `AGENTS.md`;
- current `docs/PROJECT_STATUS.md`;
- active task and phase gate;
- only the relevant architecture/contracts/test sections.

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
- update `docs/PROJECT_STATUS.md`;
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

### Step 10 — Report and stop

Use the completion report defined in `AGENTS.md`. Do not start the next task automatically.

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
