# 06 — Test and Acceptance Matrix

## 1. Catalog builder

| ID | Scenario | Expected result |
|---|---|---|
| CAT-001 | Same source commit and config built twice | Same normalized content/checksums except explicitly excluded timestamps |
| CAT-002 | Record uses `_copy` | Fully resolved before normalization |
| CAT-003 | Record uses supported `_mod` | Operation is applied to a cloned resolved record and the exact resulting record matches the fixture |
| CAT-003A | Supported `_mod` has malformed parameters | Build fails with source path, entity identity, field target, mode, and parameter diagnostic |
| CAT-003B | `_mod` is applied to a resolved base record | Original base record remains unchanged |
| CAT-004 | Unknown `_mod` operation | Build fails with source path, entity identity, field target, and unknown mode |
| CAT-005 | Copy cycle | Build fails with cycle chain |
| CAT-006 | Duplicate canonical ID | Publication blocked |
| CAT-007 | Unresolved included reference | Publication blocked |
| CAT-008 | 2014 core marker | Entity classified `2014` and `core` |
| CAT-009 | 2024 core marker | Entity classified `2024` and `core` |
| CAT-010 | Book categorized core but record not free | Entity classified `source` |
| CAT-011 | New class uses supported normalized structures | Appears in class index without plugin rebuild |
| CAT-012 | New class requires unknown mechanic | Build reports unsupported mechanic; publication policy decides exclusion/failure |
| CAT-013 | 2014 Species has automatic grants or choices | Normalized output retains origin, provenance, and required/optional status |
| CAT-014 | 2024 Species has automatic grants or choices | Normalized output retains origin, provenance, and required/optional status |
| CAT-015 | 2014 Background has automatic grants or choices | Normalized output retains origin, provenance, and required/optional status |
| CAT-016 | 2024 Background has automatic grants or choices | Normalized output retains origin, provenance, and required/optional status |
| CAT-017 | 2014 starting Class | Applicable level-one proficiencies, saves, grants, choices, equipment choices, and spellcasting/progression normalize |
| CAT-018 | 2024 starting Class | At least one usable starting Class exists and applicable level-one data normalizes |
| CAT-019 | Structured source field lacks a supported normalization | Actionable normalization-coverage diagnostic; it is not silently represented as creator-ready |
| CAT-020 | Automatic entity equipment/named-item/currency | Uses RuleEntity grants without a fake choice; named item has no mechanics |
| CAT-021 | Closed package consequence | Uses the same RuleGrant vocabulary and retains nested choices |
| CAT-022 | Starting-Class-only consequence | Uses ClassRule startingGrants; it does not activate for a non-starting multiclass instance |
| CAT-023 | Fixed currency grant | Normalizes to runtime-valid `CurrencyGrantAmount.fixed` with positive integer value |
| CAT-024 | 5d4 × 10-style starting currency | Normalizes structurally as `dice` count/die sides/multiplier; no source dice tag leaks into catalog |
| CAT-025 | Unsupported creator currency formula | Actionable coverage diagnostic identifies available entity/ruleset/source/path/normalizer and expression shape; no average, raw formula, or omission |
| CAT-026 | Same normalized grant source/configuration | Deterministic, scope-unique `RuleGrantId`, not based only on display text |

## 2. Catalog client/cache

| ID | Scenario | Expected result |
|---|---|---|
| CLI-001 | Compatible manifest | Revision activates |
| CLI-002 | Unsupported schema version | Existing compatible revision remains active |
| CLI-003 | Invalid JSON | Validation error; no activation |
| CLI-004 | Server unavailable with cache | Existing character opens with offline/stale status |
| CLI-005 | Server unavailable without required entity cache | Character remains unchanged; unresolved data shown |
| CLI-006 | Catalog revision changes | Revision-specific cache keys prevent stale mix |
| CLI-007 | Character policy changes | Eligibility cache misses/rebuilds |
| CLI-008 | Character state changes | Character-specific plan/snapshot cache invalidates |

## 3. Character persistence

| ID | Scenario | Expected result |
|---|---|---|
| PER-001 | Create valid character | Versioned JSON saved |
| PER-002 | Read valid character | Runtime validation succeeds |
| PER-003 | Read malformed JSON | Diagnostic; plugin continues |
| PER-004 | Read old supported schema | Migrates deterministically |
| PER-005 | Concurrent mutation simulation | Atomic update prevents silent lost update according to repository design |
| PER-006 | External file modification | Character index and active view refresh |
| PER-007 | Delete all caches | Character data remains intact |
| PER-008 | Legacy entity-ID choice | Deterministically migrates to the typed `entity-ids` selected value without loss or candidate lists |
| PER-009 | Ability allocation choice | Exact selected distribution, definition ID, and origin identity persist; eligible abilities/candidates do not |
| PER-010 | Closed/package choice | Selected normalized option identity persists without copying its package definition; inventory/resources persist separately when materialized |
| PER-011 | Automatic mutable materialization | Item, named-item, and currency materialize only in an atomic transaction; rerender/recalculation cannot duplicate them |
| PER-012 | Resolved random starting currency | Final `CharacterCurrencyState` receives the existing resolved integer; CharacterDocument does not copy catalog dice expression |
| PER-013 | Failed save then retry | Finalization consumes the same draft resolution and does not reroll |

## 4. Character creation

| ID | Scenario | Expected result |
|---|---|---|
| CRE-001 | 2014 core-only character | Only 2014 core plus required fixed dependencies visible |
| CRE-002 | 2024 core-only character | Only 2024 core visible |
| CRE-003 | Add optional source | Its compatible entities become visible |
| CRE-004 | Unselected source | Its non-core entities remain hidden |
| CRE-005 | Change ruleset | Incompatible selections cleared/invalidated explicitly |
| CRE-006 | Change species | Species-origin choices invalidated and regenerated |
| CRE-006A | Change background | Background-origin dependent choices invalidate; independent selections remain |
| CRE-007 | Change class | Class/subclass/spell choices invalidated and regenerated |
| CRE-007A | Change source policy | Selections that become ineligible invalidate; eligible independent selections remain |
| CRE-008 | Required choice unresolved | Save blocked |
| CRE-009 | Review | Derived snapshot matches selected inputs |
| CRE-010 | Save succeeds | Character file contains selections, not candidate lists/catalog copies |
| CRE-011 | Base score method plus origin ability adjustment | Base standard-array/point-buy/manual/entered-roll state remains distinct and calculation applies normalized origin effect |
| CRE-012 | Selected Species, Background, or Class | `(?)` details action renders normalized summary/content, features, grants, choices, automation, provenance, source, ruleset, and page where available; no raw-source access |
| CRE-013 | Selected option has unresolved random currency RuleGrant | Save blocked until explicit creator resolution exists for its RuleGrantId |
| CRE-014 | Consequence render/recalculation/review/diagnostic refresh | Reads unresolved or existing resolved random grant; never rerolls |
| CRE-015 | Explicit future reroll request | Only an intentional creator command may replace the current draft resolution; no implicit rerolls |

## 5. Rules engine

| ID | Scenario | Expected result |
|---|---|---|
| ENG-001 | Same character/catalog | Identical snapshot |
| ENG-002 | Ability effect | Ability and dependent totals update |
| ENG-003 | Proficiency/expertise | Correct multiplier and trace |
| ENG-004 | Armor plus shield | AC formula/bonuses compose correctly |
| ENG-005 | Unequip shield | Only shield contribution removed |
| ENG-006 | Max HP change | Current HP clamped only according to documented mutation rule |
| ENG-007 | Spellcasting class | Correct spell attack/DC/slots |
| ENG-008 | Unsupported narrative mechanic | Feature displayed with warning; no invented effect |

## 6. Interactive sheet

| ID | Scenario | Expected result |
|---|---|---|
| UI-001 | Damage with temp HP | Temp HP consumed according to command rule before current HP |
| UI-002 | Healing above max | Current HP clamped to max |
| UI-003 | Resource use below zero | Command rejected |
| UI-004 | Short rest | Only eligible resources restored |
| UI-005 | Long rest | Only documented eligible state restored/reset |
| UI-006 | Narrow sidebar | No essential control inaccessible horizontally |
| UI-007 | External character update | View refreshes without reopen |

## 7. Level-up and source policy

| ID | Scenario | Expected result |
|---|---|---|
| LVL-001 | Increase class level | Only grants at newly reached level activate |
| LVL-002 | Subclass level reached | Subclass choice required |
| LVL-003 | ASI/feat level reached | Eligible options filtered by policy/prerequisites |
| LVL-004 | Spell level unlocked | Eligible spells filtered by class/subclass/ruleset/source |
| LVL-005 | Cached plan inputs match | Cache may be used |
| LVL-006 | Catalog/policy/state changes | Cached plan rejected |
| LVL-007 | Level-up canceled | Character file unchanged |
| LVL-008 | Level-up validation fails | Character file unchanged |
| LVL-009 | Remove level with invalid spells/features | Full diagnostics before apply |
| SRC-001 | Add source | Future options appear; no automatic character mutation |
| SRC-002 | Remove unused source | Policy updates |
| SRC-003 | Remove required source | Operation blocked with dependency list |
| SRC-004 | Replace all dependencies transactionally | Source can be removed after final validation |
| SRC-005 | Core records | Remain eligible regardless of optional source list |

## 8. Release acceptance

- [ ] All critical scenarios pass.
- [ ] No open critical/high data-integrity defect.
- [ ] Catalog rollback tested.
- [ ] Character migration tested.
- [ ] Obsidian API usage register reviewed against pinned definition.
- [ ] Desktop and Android manual checks completed.
- [ ] Content-distribution policy reviewed.
