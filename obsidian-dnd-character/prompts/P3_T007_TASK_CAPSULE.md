# P3-T007 worker capsule

## Roots

```text
Git working root:
/home/jdubois/Documents/Projects/obsidian-dnd-plugin

Project source root:
/home/jdubois/Documents/Projects/obsidian-dnd-plugin/obsidian-dnd-character

Task-area root:
obsidian-dnd-character/apps/catalog-builder/
```

## Task

```text
Phase 3 — Catalog builder ingestion foundation
P3-T007 — Implement _mod operations used by included data
```

Dependencies confirmed by parent:

```text
P3-T000 through P3-T006 complete
```

## Roadmap requirements

- Implement every `_mod` operation used by the included pinned source data.
- Every supported operation requires fixtures and tests.
- Unknown operations fail the build.

## Acceptance cases

### CAT-003

A supported `_mod` operation is applied to a cloned resolved record and the exact resulting record matches the fixture.

### CAT-003A

Malformed parameters fail with source path, entity identity, field target, mode, and parameter diagnostic.

### CAT-003B

Applying `_mod` to a resolved base record does not mutate the original base/input record.

### CAT-004

Unknown `_mod` mode fails with source path, entity identity, field target, and unknown mode.

## Approved inventory command

Run exactly once from the Git working root:

```bash
node .opencode/tools/inspect-mod-operations.mjs external/5etools-src/data
```

Absolute fallback, only when the relative command fails because of working directory:

```bash
node /home/jdubois/Documents/Projects/obsidian-dnd-plugin/.opencode/tools/inspect-mod-operations.mjs \
  /home/jdubois/Documents/Projects/obsidian-dnd-plugin/external/5etools-src/data
```

Do not replace this inventory with recursive grep, Python, or another ad hoc scanner.

## Semantic definition of done

P3-T007 is not complete with parsing, type declarations, mode registration, or shape recognition alone.

Every supported inventoried mode must:

1. validate its operation-specific payload from `unknown`;
2. execute against a cloned resolved record after `_copy` resolution;
3. preserve the original base/input record;
4. have a before/after behavior test asserting the resulting record;
5. have malformed-payload coverage;
6. emit actionable diagnostics containing required source and operation context.

Unknown modes must fail.

## Required evidence before implementation

| Inventoried mode | Planned implementation symbol/module | Positive resulting-state test | Malformed/negative test |
|---|---|---|---|

Every inventoried mode must appear in the table.

## Required validation

Run focused catalog-builder tests after each operation family.

Before reporting ready-for-review:

```bash
npm --prefix obsidian-dnd-character run check
npm --prefix obsidian-dnd-character run build
```

## Explicit exclusions

- Do not update roadmap or project status.
- Do not stage, commit, or push.
- Do not implement `_preserve`, `_versions`, cycle detection, debug fixtures, or reports beyond what P3-T007 directly requires.
- Do not change normalized catalog contracts unless a concrete accepted requirement makes it unavoidable; report such a need as blocked.
- Do not add display-name or entity-name exceptions.
