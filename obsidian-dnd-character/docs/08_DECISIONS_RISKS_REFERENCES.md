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

Choice definitions are the strictly runtime-validated discriminated contract published in [03 — Data Contracts](03_DATA_CONTRACTS.md#7-choices): query choices, ability allocations, and source-defined closed options. Query selections persist canonical entity IDs; allocations persist actual ability/bonus assignments; closed options persist catalog-owned option IDs. `RuleGrant` is the single strict entity/effect/item/named-item/currency vocabulary: entities use it for automatic non-choice consequences and closed options use it for selected consequences. `ChoiceOptionGrant` is only a compatibility alias, preventing duplicated unions from drifting.

H2 clarifies that a `named-item` is permitted only for an explicitly structured physical source grant that fails an attempted canonical `ItemRule` resolution and has a usable normalized name with no mechanics to infer. Canonical resolution always takes precedence: resolved items emit `item`; only the defined unresolved physical case emits `named-item`; all remaining cases produce an actionable coverage diagnostic. The grant carries only normalized name and positive quantity, remains free of raw source payloads (including 5eTools `special`), and has no mechanical behavior or `RuleEffects`. The project rejects synthetic `ItemRule` entities for such names because missing category, rarity, cost, weight, properties, attunement, or body-slot data would require guessed mechanics.

H3 closes the automatic-origin gap. RuleEntity effects hold direct active mechanics; RuleEntity grants hold automatic non-choice consequences. ClassRule startingGrants is separate from class-wide effects/grants, starting choices, and level grants, and applies only to an isStartingClass instance. Entity/effect grants remain derived; item/named-item/currency materialize only in a future atomic transaction, which must be idempotent across recalculation and rerendering.

H4 records the concrete deferred need for `RuleGrantId`: every catalog grant has a deterministic, runtime-validated, owner-scoped branded identity generated by the builder from normalized source/path provenance, never display text alone. The pinned supported class starting-gold evidence needs only fixed amounts, `NdM`, and `NdM × K`, so currency uses a narrow nested fixed/dice-multiplier discriminant instead of a generic expression language. Raw source markup never crosses the catalog boundary; unsupported creator-relevant expression shapes produce actionable normalization-coverage diagnostics.

H5 clarifies equipment choices and resolution timing without reopening H1–H4. Creator-relevant raw `equipmentType` values map only inside the catalog builder to finite, runtime-validated, catalog-owned `EquipmentGroup` values: artisan tool, musical instrument, gaming set, simple weapon, simple melee weapon, martial weapon, martial melee weapon, and arcane, holy, or druidic spellcasting focus. `ItemRule.equipmentGroups` is structurally classified from authoritative item source fields, and `EquipmentQuery.equipmentGroups` uses intersection with the requested groups while remaining conjunctive with existing filters. Raw 5eTools tokens, candidate lists, and raw package shapes do not cross the catalog boundary; unknown tokens or unavailable structured classification produce actionable diagnostics.

H5 also establishes a builder-only deferred equipment-resolution boundary. An authoritative canonical source reference is `canonical-reference-required`: it must resolve to an actual normalized `ItemRule` or fail, and a constructible canonical ID does not prove entity existence. An explicit concrete physical object without an authoritative canonical reference is `physical-name-with-fallback`: only a deterministic governed mapping may resolve it to an ItemRule; otherwise its validated physical name publishes as `named-item`. No fuzzy display-name matching, synthetic items, fallback source fields on published RuleGrant, or inferred mechanics are permitted. The transient builder representation retains only resolution mode, stable RuleGrantId, quantity, authoritative reference/candidate or permitted validated fallback name, owning scope, and provenance; it is fully resolved or diagnosed before publication validation. The source/path-derived RuleGrantId is unchanged by a later item-versus-named-item outcome.

H6 clarifies the remaining Class proficiency semantics without reopening H1–H5. Exact `ProficiencyRef` remains the representation for exact skills, tools, weapons, armor, and saves. Broad simple/martial weapon proficiency is a finite normalized `WeaponProficiencyScope`, and structured filters are bounded category-plus-all-required-property scopes derived only from structured source. They are never expanded into current weapon IDs. The verified XPHB Rogue Finesse-or-Light form is a union of two such fixed scopes, not a generalized predicate language. The rules engine retains scopes declaratively and derives catalog-aware matches when needed.

H6 also makes `ProficiencyQuery` a strict constrained query: kind only, source-authored canonical eligible IDs, or finite catalog-owned `ProficiencyGroup` values. Exact eligible IDs are rule-authoritative source constraints, not evaluated caches, and unresolved included IDs fail under normal reference integrity. The only verified group values are artisan-tool and musical-instrument. The existing canonical selectable target is `ItemRule`, which may receive both structured `equipmentGroups` and `proficiencyGroups` from the same item-source classification, but the types and consequences remain separate: equipment selection does not grant proficiency, and a proficiency choice never uses `EquipmentQuery`.

The catalog stores a random amount definition but no result. Future draft state correlates an explicit resolved integer to `RuleGrantId`, because derived consequence models are disposable and must not roll during any read/recalculation. Unresolved selected random currency blocks save. Finalization consumes the existing resolution exactly once and materializes only that integer to `CharacterCurrencyState`; retries cannot reroll and final character JSON does not copy a dice definition. No implicit rerolls exist; any future reroll is an explicit creator command. J/M own command/state and verification, while I owns the catalog schema increment and normalizer implementation.

Persisted `CharacterChoice` retains instance ID, definition ID, origin grant/entity ID, and a discriminated typed selected value: entity IDs, actual ability allocations, or option IDs. Catalog definitions, candidate lists, eligible abilities, package contents, nested choices, and render/provenance data are never copied into character JSON. `CharacterDocument.currency` is the authoritative typed five-denomination currency state, initialized to zero for new and migrated characters; package materialization updates it separately rather than persisting package data. Inventory is likewise discriminated: a catalog item retains `itemId` and catalog-only attunement, charge, and override fields; a named item has a concrete name and shared organizational state only. Legacy inventory migrates losslessly by adding `type: "catalog-item"`; no legacy item changes to named-item. A future package materialization creates a new authoritative named inventory instance rather than copying a package or manufacturing a catalog entity.

Base ability generation (standard array, point buy, manual values, entered rolls) remains authoritative global player state. Origin-derived ability increases or allocations are separately normalized effects/selections and are combined only in deterministic calculation.

Changing an origin invalidates selections owned by that origin and actual downstream dependents; ruleset and source-policy changes invalidate incompatible/ineligible selections. Independent choices remain. Both supported rulesets require usable starting-Class level-one coverage; Species and Background must classify automatic consequences, choices, context, and unsupported diagnostics according to normalized source data.

When implemented, the catalog schema version increments to the finalized v2 contract, including RuleGrant, H5 ItemRule/EquipmentQuery equipment-group fields, and H6 scoped proficiency, constrained ProficiencyQuery, weapon classification/property, and ItemRule proficiency-group fields; H6 does not create a catalog v3. The character schema increment already required by H1/H2 remains for typed choices, currency, and inventory migration; EquipmentGroup and ProficiencyGroup themselves add no character field. No new CharacterDocument field is required for a dice formula. A deterministic validated migration maps old valid `selectedOptionIds` arrays to the entity-ID selected-value variant without replacement, candidate lists, or copied catalog definitions, and initializes currency to zero. Runtime validators, fixtures, and tests change with these published schemas.

**Out of scope:** External 5eTools URL routing is out of scope and governed separately. A configurable 5eTools Web Base URL remains a future product setting, but external target identity and routing are supplemental architecture for P10-CORRECTIVE-L and must not block creator correctness.

**Consequences:** P10-CORRECTIVE-I normalizes the coverage, P10-CORRECTIVE-J integrates the consequence service and invalidation, P10-CORRECTIVE-K renders panels/details, P10-CORRECTIVE-L handles supplemental external references, and P10-CORRECTIVE-M rebaselines validation. The prior Phase 10 gate evidence remains historical but is no longer the active release gate.

### ADR-014 — Equipment eligibility metadata is projected into the compact item index

**Status:** accepted
**Date:** 2026-08-20

**Context:** `EquipmentQuery` requires normalized equipment groups, but those groups existed only in `ItemRule` detail documents. Hydrating every item detail to evaluate one creator choice produced an unbounded query and renderer out-of-memory failure.

**Decision:** Catalog schema v4 projects `ItemRule.equipmentGroups` into item compact-index entries as normalized query metadata. No raw 5eTools field, display-name interpretation, generic facet system, candidate list, or catalog definition is introduced into character state.

**Consequences:** Equipment eligibility can be determined from the compact item index and item details remain lazy-loaded. Existing immutable revisions remain unchanged. Schema compatibility identifies revisions that contain the required item-index shape; an older or malformed item index must report an actionable equipment-query compatibility diagnostic and must never fall back to loading all item details. Candidate lists and catalog definitions remain disposable catalog/runtime data, never authoritative character state.

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

## ADR-010 — Supplemental 5eTools external references

**Status:** accepted
**Date:** 2026-08-11

**Decision:** The catalog-builder alone reproduces the reviewed finite pinned 5eTools route subset and publishes optional validated `{ provider: "5etools", relativeTarget }` metadata. The plugin never derives routes from entity identity; it validates a user-owned HTTP(S) base URL and safely composes/opens the catalog target only after user activation. The metadata is supplemental, non-mechanical, and excluded from CharacterDocument/draft state.

**Pinned route authority:** `external/5etools-src/js/utils.js`: `UrlUtil.PG_RACES`, `PG_BACKGROUNDS`, `PG_CLASSES`, `URL_TO_HASH_GENERIC`, `encodeArrayForHash`, and `String.prototype.toUrlified`.

**Compatibility impact:** Catalog schema v3 adds the optional metadata; v2 remains readable during transition. Settings schema v2 adds disabled-by-default `fiveEToolsWebBaseUrl`.

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
