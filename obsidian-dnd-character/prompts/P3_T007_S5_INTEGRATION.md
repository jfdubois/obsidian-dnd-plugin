# P3-T007-S5 — Dispatcher, cloning, diagnostics, and `_copy` integration

## Responsibility

Integrate the 21 implemented modes into one `_mod` block executor and the existing `_copy` resolution flow.

## Approved commands

Run the global inventory once and verify it still reports exactly the supported 21 modes:

```bash
node .opencode/tools/inspect-mod-operations.mjs external/5etools-src/data
```

No additional raw-source scans are permitted.

## Planned modules and edits

```text
mod-resolver.ts
mod-resolver.test.ts
```

Allowed bounded edits:

```text
copy-resolver.ts
copy-resolver.test.ts
index.ts
```

Do not rewrite existing resolver files. Locate exact integration symbols and edit only bounded ranges.

## Required behavior

- Parse a `_mod` block whose keys are field targets and whose values are one operation or an operation array.
- Dispatch every supported mode to its execution handler.
- Apply `_mod` after `_copy` has resolved the base record.
- Deep-clone before mutation and preserve the original base/input record.
- Preserve deterministic operation order.
- Reject unknown modes.
- Reject malformed payloads before execution.
- Diagnostics must contain source path, entity identity, field target, mode, and parameter or unknown-mode detail.

## Acceptance cases

- CAT-003: exact resulting record matches fixtures.
- CAT-003A: malformed payload diagnostic contains all required context.
- CAT-003B: original base/input record remains unchanged.
- CAT-004: unknown mode diagnostic contains all required context.

## Tests

- At least one resulting-state assertion for every mode.
- At least one malformed/negative assertion for every mode, either in family tests or integration tests.
- Integration fixture combining `_copy` and `_mod`.
- Unknown-mode and immutability regression tests.

## Focused validation

```bash
npm --prefix obsidian-dnd-character run test -- mod-array-operations.test.ts mod-scalar-text-operations.test.ts mod-sense-skill-operations.test.ts mod-spell-operations.test.ts mod-resolver.test.ts copy-resolver.test.ts
npm --prefix obsidian-dnd-character run typecheck
```
