# P3-T007-S4 — Spell operations

## Assigned modes

```text
addSpells
removeSpells
replaceSpells
```

## Approved source command

Run once:

```bash
node .opencode/tools/inspect-mod-operation-family.mjs external/5etools-src/data addSpells,removeSpells,replaceSpells 3
```

## Planned modules

```text
mod-spell-operations.ts
mod-spell-operations.test.ts
```

Reuse `mod-types.ts`. Update `src/index.ts` only for exports.

## Required behavior

- Validate exact spell operation payloads from `unknown`.
- Apply operations to cloned spellcasting structures.
- Preserve ordering and nested structures according to verified source examples.
- Preserve original input objects.
- Fail contextually for missing spellcasting targets, malformed levels/groups, and invalid replacement data.

## Allowed existing-file inspection

- `src/mod-types.ts`
- `src/index.ts`
- one bounded operation-module test for style

## Focused validation

```bash
npm --prefix obsidian-dnd-character run test -- mod-spell-operations.test.ts
npm --prefix obsidian-dnd-character run typecheck
```
