# P3-T007 — `_mod` execution plan

P3-T007 is an oversized roadmap task. It is executed through five roadmap slices, one `/phase 3` invocation per slice.

## Inventory baseline

The pinned source contains these 21 modes:

```text
addSenses
addSkills
addSpells
appendArr
appendIfNotExistsArr
insertArr
maxSize
prefixSuffixStringProp
prependArr
removeArr
removeSpells
renameArr
replaceArr
replaceSpells
replaceTxt
scalarAddDc
scalarAddHit
scalarAddProp
scalarMultProp
scalarMultXp
setProp
```

## Slices

| Slice | Modes or responsibility |
|---|---|
| P3-T007-S1 | shared contracts plus array operations |
| P3-T007-S2 | scalar, property, text, and size operations |
| P3-T007-S3 | senses and skills operations |
| P3-T007-S4 | spell operations |
| P3-T007-S5 | `_mod` block dispatcher, cloning, diagnostics, `_copy` integration, and full acceptance |

Each slice is independently validated and committed. P3-T007 remains incomplete until S5 passes all 21-mode acceptance evidence.
