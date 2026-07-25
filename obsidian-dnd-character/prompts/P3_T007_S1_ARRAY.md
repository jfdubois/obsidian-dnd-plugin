# P3-T007-S1 — Shared contracts and array operations

## Assigned modes

```text
appendArr
appendIfNotExistsArr
insertArr
prependArr
removeArr
renameArr
replaceArr
```

## Approved source command

Run once:

```bash
node .opencode/tools/inspect-mod-operation-family.mjs external/5etools-src/data appendArr,appendIfNotExistsArr,insertArr,prependArr,removeArr,renameArr,replaceArr 2
```

Do not run another raw-source scanner.

## Planned modules

Create focused modules under `obsidian-dnd-character/apps/catalog-builder/src/`:

```text
mod-types.ts
mod-array-operations.ts
mod-array-operations.test.ts
```

Update `src/index.ts` only to export completed public symbols.

## Required behavior

- Validate every operation payload from `unknown`.
- Apply to a cloned field value or cloned record fragment.
- Preserve original inputs.
- Match items structurally according to verified source examples; do not branch by entity name.
- Return contextual failures rather than silently ignoring malformed targets or payloads.

## Allowed existing-file inspection

- `src/index.ts`
- bounded relevant symbols in `src/copy-resolver.ts` only when a shared type is necessary
- one bounded existing test file for style only

Do not read package files, tsconfig files, or unrelated resolver tests.

## Focused validation

```bash
npm --prefix obsidian-dnd-character run test -- mod-array-operations.test.ts
npm --prefix obsidian-dnd-character run typecheck
```
