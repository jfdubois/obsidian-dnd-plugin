# P3-T007-S2 — Scalar, property, text, and size operations

## Assigned modes

```text
maxSize
prefixSuffixStringProp
replaceTxt
scalarAddDc
scalarAddHit
scalarAddProp
scalarMultProp
scalarMultXp
setProp
```

## Approved source command

Run once:

```bash
node .opencode/tools/inspect-mod-operation-family.mjs external/5etools-src/data maxSize,prefixSuffixStringProp,replaceTxt,scalarAddDc,scalarAddHit,scalarAddProp,scalarMultProp,scalarMultXp,setProp 2
```

## Planned modules

```text
mod-scalar-text-operations.ts
mod-scalar-text-operations.test.ts
```

Reuse `mod-types.ts`. Update `src/index.ts` only for exports.

## Required behavior

- Validate operation-specific payloads from `unknown`.
- Preserve integer/floor behavior shown by source examples.
- Apply text replacement only to the intended target scope.
- Support explicit null values for `setProp` when verified by source examples.
- Preserve original input values and objects.
- Fail contextually for invalid target types, missing properties, invalid scalar values, or malformed patterns.

## Allowed existing-file inspection

- `src/mod-types.ts`
- `src/index.ts`
- one bounded operation-module test for style

## Focused validation

```bash
npm --prefix obsidian-dnd-character run test -- mod-scalar-text-operations.test.ts
npm --prefix obsidian-dnd-character run typecheck
```
