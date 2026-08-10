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

### ADR-009 — Reviewed semantic mechanics and character-sheet projection

**Decision:** Normalized rule-bearing entities shall distinguish calculated effects, conditional roll effects, defenses, capabilities, grants, actions, resources, display-only mechanics, and narrative information.
Every normalized mechanical effect shall retain its automation status, source provenance, and character-sheet projection.

Structured 5eTools fields shall be normalized generically. Narrative rule text shall not be interpreted automatically at runtime or through unrestricted text parsing.

A versioned, runtime-validated semantic mapping may define reviewed mechanical effects for narrative-only rules when it:

targets a canonical entity or feature ID;
identifies the source ruleset and source revision;
contains no executable code;
passes schema validation;
includes rule-specific tests;
records that the effect originated from a reviewed mapping.

Narrative mechanics without a reviewed mapping shall remain visible as safe render content and shall be marked display-only or manual-adjudication.

**Reason:** eTools does not represent every mechanical rule through universal structured fields. This decision permits explicit and testable support for rules such as conditional saving-throw advantage and physiological capabilities without guessing from prose, adding entity-name code branches, or hiding unsupported traits.

### ADR-010 — Species size scope (P4-T005)

**Status:** accepted
**Date:** 2026-07-27

**Context:** Pinned species source records may offer multiple descriptive size possibilities (e.g., "Small or Medium humanoid"). The species normalizer must decide how to handle size information.

**Decision:**
- P4-T005 may retain the source size information as display text or builder metadata.
- P4-T005 is not required to create a structured size-selection mechanic.
- Character-selected size support is deferred to a follow-up enhancement task.
- The normalizer must not arbitrarily remove source size information.

**Consequences:** Size remains unstructured in the initial species normalization pass. A follow-up task will add structured size selection where the character explicitly chooses among available sizes.

**Affected roadmap tasks:** P4-T005 (initial normalizer), follow-up enhancement task for structured size selection.

### ADR-011 — Initial source scope for species normalizer (P4-T005)

**Status:** accepted
**Date:** 2026-07-27

**Context:** The species normalizer must define which source books it initially supports.

**Decision:**
- P4-T005 initially supports core species from PHB and XPHB only.
- Other pinned sources remain excluded until a reviewed source-to-ruleset registry is implemented.
- Excluded sources must produce explicit diagnostics rather than silently disappearing.
- No ruleset may be inferred from publication date, entity name, display text, or narrative content.

**Consequences:** Species from optional sources will emit build-time diagnostics indicating exclusion. A follow-up task will implement the reviewed source-to-ruleset registry to expand supported sources.

**Affected roadmap tasks:** P4-T005 (initial normalizer), follow-up task for reviewed optional-source ruleset registry.

### ADR-012 — Canonical ID scope (pre-P4-T005)

**Status:** accepted
**Date:** 2026-07-27

**Context:** The species normalizer needs stable identifiers but P4-T018 is responsible for the complete catalog-wide canonical-ID pass.

**Decision:**
- P4-T005 must not implement a private species-only canonical-ID algorithm.
- A shared deterministic ID helper must be available before P4-T005 begins (minimum shared behavior for normalizers).
- P4-T018 remains responsible for the complete catalog-wide canonical-ID pass.
- The pre-P4-T005 helper may implement only the minimum shared behavior needed by normalizers.

**Consequences:** The shared helper provides a consistent, deterministic ID generation function that all normalizers can use. P4-T018 will later audit and finalize the complete catalog-wide ID scheme.

**Affected roadmap tasks:** P4-T005 (species normalizer), P4-T018 (canonical ID generator).

### ADR-013 — Origin-owned creator consequences and typed choices

**Status:** accepted
**Date:** 2026-08-10

**Context:** The creator requires source-driven handling for 2014 and 2024 Species, Background, and starting Class mechanics. Current normalized coverage does not yet supply meaningful Species/Background choices or usable starting-class progression, and the persisted `selectedOptionIds: EntityId[]` shape cannot represent ability allocations or closed packages. Global creator pages are useful presentation capabilities but cannot own choices simply by their page location.

**Decision:** The normalized catalog remains authoritative for descriptions, traits/features, automatic grants, structured choices, mechanics, prerequisites, dependencies, provenance, and safe render content. Raw 5eTools structures remain builder-only. Missing structured source normalization is an actionable coverage defect; the plugin must not parse raw data, infer mechanics from narrative, branch on display names, or encode entity-specific exceptions.

The plugin/application service derives a disposable, origin-owned Selection Consequence Model from normalized catalog data and creator draft state. It reconstructs automatic grants, choices, resolved/unresolved selections, candidates, diagnostics, dependencies, contextual content, and provenance. It is neither a catalog authority nor a persisted character structure. Generic controls consume the normalized choice supplied by that model, regardless of visual placement.

Choice definitions become a strictly runtime-validated discriminated contract for entity-query, ability-allocation, and source-defined closed-option selection. A deterministic, branded, runtime-validated `ChoiceOptionId` identifies a closed option within its `ChoiceDefinition`; it is distinct from `EntityId` and permits a character to retain only the selected option identity. This is the smallest additional identifier required by verified closed options/packages.

Persisted `CharacterChoice` retains instance ID, definition ID, origin grant/entity ID, and a discriminated typed selected value: entity IDs, actual ability increases, or a closed option ID. Catalog definitions, candidate lists, eligible abilities, package contents, and render/provenance data are never copied into character JSON. If package application materializes inventory, currency, or another mutable resource, that resulting authoritative state is persisted separately in a typed contract; an absent currency contract is a documented follow-up gap, not a generic choice payload.

Base ability generation (standard array, point buy, manual values, entered rolls) remains authoritative global player state. Origin-derived ability increases or allocations are separately normalized effects/selections and are combined only in deterministic calculation.

Changing an origin invalidates selections owned by that origin and actual downstream dependents; ruleset and source-policy changes invalidate incompatible/ineligible selections. Independent choices remain. Both supported rulesets require usable starting-Class level-one coverage; Species and Background must classify automatic consequences, choices, context, and unsupported diagnostics according to normalized source data.

When implemented, the character schema version increments. A deterministic validated migration maps old valid `selectedOptionIds` arrays to the entity-ID selected-value variant without replacement, candidate lists, or copied catalog definitions. An incompatible catalog-contract change increments the catalog schema version.

**Out of scope:** External 5eTools URL routing is out of scope and governed separately. A configurable 5eTools Web Base URL remains a future product setting, but external target identity and routing are supplemental architecture for P10-CORRECTIVE-L and must not block creator correctness.

**Consequences:** P10-CORRECTIVE-I normalizes the coverage, P10-CORRECTIVE-J integrates the consequence service and invalidation, P10-CORRECTIVE-K renders panels/details, P10-CORRECTIVE-L handles supplemental external references, and P10-CORRECTIVE-M rebaselines validation. The prior Phase 10 gate evidence remains historical but is no longer the active release gate.

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
| R-011 | Reviewed semantic mappings become incomplete or stale | Incorrect or missing character effects | Key mappings by canonical identity and ruleset, pin source revisions, require provenance and regression tests, and report unmapped narrative mechanics |
| R-012 | Mobile settings, `requestUrl` transport, cache restoration, and catalog activation remain manually unverified on an actual Obsidian Mobile device | Mobile compatibility uncertainty | Keep `isDesktopOnly: false`; automated platform-boundary checks and desktop runtime smoke pass; mobile smoke remains mandatory before the first mobile/public release or when remote installation becomes available |

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
