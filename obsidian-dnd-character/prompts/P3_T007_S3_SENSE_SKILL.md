# P3-T007-S3 — Senses and skills operations

## Assigned modes

```text
addSenses
addSkills
```

## Approved source command

Run once:

```bash
node .opencode/tools/inspect-mod-operation-family.mjs external/5etools-src/data addSenses,addSkills 3
```

## Planned modules

```text
mod-sense-skill-operations.ts
mod-sense-skill-operations.test.ts
```

Reuse `mod-types.ts`. Update `src/index.ts` only for exports.

## Required behavior

- Validate exact payload shapes found in the pinned source.
- Merge senses and skills generically without entity-name conditions.
- Preserve existing values unless source semantics require replacement.
- Preserve original input objects.
- Fail contextually for malformed entries and invalid target shapes.

## Allowed existing-file inspection

- `src/mod-types.ts`
- `src/index.ts`
- one bounded operation-module test for style

## Focused validation

```bash
npm --prefix obsidian-dnd-character run test -- mod-sense-skill-operations.test.ts
npm --prefix obsidian-dnd-character run typecheck
```
