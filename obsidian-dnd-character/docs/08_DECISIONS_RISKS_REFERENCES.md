# 08 — Decisions, Risks, and References

## Architecture decisions

### ADR-001 — External normalized catalog

**Status:** accepted
**Date:** 2026-07-22

**Decision:** The plugin consumes a versioned normalized catalog served by a local/private Docker service. It does not bundle the full content catalog and does not parse raw 5eTools data at runtime.

**Reason:** New entities using supported schemas can appear without plugin rebuilds, while raw-source changes remain isolated in the builder.

### ADR-002 — Static revision server first

**Status:** accepted
**Date:** 2026-07-22

**Decision:** Generate static immutable JSON revisions and serve them with a minimal static server.

**Reason:** Lower operational complexity, deterministic responses, easy rollback, effective caching, and no request-time normalization.

### ADR-003 — Per-character source policy

**Status:** accepted
**Date:** 2026-07-22

**Decision:** Source selections are stored per character. Settings contain reusable profiles only.

**Reason:** Different characters and campaigns may allow different books, and level-up must honor the character's historical policy.

### ADR-004 — Core access is record-level

**Status:** accepted
**Date:** 2026-07-22

**Decision:** Free/core eligibility is assigned from explicit record metadata, not from the book's display category.

**Reason:** A core book category does not imply every record in that publication is freely distributable/available.

### ADR-005 — Persist selections, cache candidates

**Status:** accepted
**Date:** 2026-07-22

**Decision:** Persist current choices and origin grants. Derive and optionally cache future candidate IDs and level-up plans.

**Reason:** This retains the useful hybrid behavior seen in the D&D Beyond hydrated response without duplicating catalogs or making stale option lists authoritative.

### ADR-006 — Derived values are non-authoritative

**Status:** accepted
**Date:** 2026-07-22

**Decision:** AC, modifiers, skill totals, spell DC, slot maxima, and similar values are calculated from state and catalog rules.

**Reason:** Prevent drift and enable consistent recalculation after equipment, level, or catalog changes.

### ADR-007 — Mobile-compatible Obsidian plugin

**Decision:** Keep `isDesktopOnly: false` and avoid Node/Electron APIs.

**Reason:** The right-sidebar/mobile experience is a primary requirement.

### ADR-008 — Narrative mechanics are not guessed

**Decision:** Structured source fields may produce mechanical effects. Unsupported narrative-only mechanics remain display text with diagnostics.

**Reason:** Avoid hallucinated rules and class/species-specific exceptions.

## Principal risks

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-001 | 5eTools source structure changes | Builder failure | Pin commits, strict resolver tests, schema diagnostics, update builder independently |
| R-002 | Future game mechanic exceeds normalized schema | Partial automation | Display narrative, report unsupported mechanic, add formal effect/grant schema version |
| R-003 | Catalog revision removes/renames referenced entity | Character cannot fully resolve | Immutable revisions, stable IDs, compatibility validation, migration maps |
| R-004 | Non-free content redistribution | Legal/project risk | Private/local service, no bundled data, operator rights review |
| R-005 | Mobile cannot reach `localhost` catalog | Feature unavailable | LAN/VPN/HTTPS URL and local runtime cache |
| R-006 | Large catalog impacts mobile performance | Slow UI/memory | Compact indexes, lazy entity loading, bounded cache |
| R-007 | LLM invents Obsidian API | Runtime defects | Pinned API, API usage register, AGENTS guardrail |
| R-008 | LLM implements entity-name exceptions | Unmaintainable parser | Code review/search gate, generic fixture requirements |
| R-009 | Character source removal or level reduction orphans state | Data loss | Transactional dependency analysis and preview |
| R-010 | Cache treated as source of truth | Stale/incorrect choices | Cache envelopes, input hashes, deletion tests |

## Reference notes

### D&D Beyond character fixture

Reference endpoint:

`https://character-service.dndbeyond.com/character/v5/character/156579226`

Observed useful concepts:

- current progression and mutable state;
- hydrated species/background/class/item definitions;
- selected choice values;
- candidate option IDs;
- choice display definitions;
- class progression metadata;
- derived modifier collections.

Restriction: treat as a sample hydrated response only. Do not assume it is a stable public API or internal persistence schema.

### Obsidian API master reference

`https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts`

Verified relevant public surfaces in the current reference include:

- `requestUrl` for HTTP/HTTPS without CORS restrictions;
- `Plugin.registerView`;
- `ItemView`;
- `Workspace.getRightLeaf`;
- `WorkspaceLeaf.setViewState`;
- `Plugin.loadData` and `saveData`;
- `Vault.cachedRead`, `modify`, and atomic `process`;
- vault events and component event registration.

The repository must pin an exact snapshot and use that snapshot as the implementation contract.

### Official Obsidian sample plugin

`https://github.com/obsidianmd/obsidian-sample-plugin`

Use it for project structure, TypeScript/esbuild configuration, manifest/release pattern, and plugin lifecycle examples. Do not assume every sample API use is appropriate without verifying the pinned definition.

### 5eTools source

`https://github.com/5etools-mirror-3/5etools-src`

Relevant observed source characteristics include:

- entity-specific data files and indexes;
- 2014 and 2024 metadata such as `edition`, `srd`, `srd52`, `basicRules`, and `basicRules2024`;
- structured fields for abilities, proficiencies, spells, equipment, and class progression;
- inheritance/version mechanisms such as `_copy`, `_mod`, `_preserve`, and `_versions`;
- pipe-delimited entity references;
- generated relationship data.

The mirror is not an official Wizards of the Coast API. Pin the exact source commit and review content rights before deployment or redistribution.

## Decision change template

```text
ADR-XXX — Title
Status: proposed | accepted | superseded
Date:
Context:
Decision:
Consequences:
Migration/compatibility impact:
Affected roadmap tasks:
```
