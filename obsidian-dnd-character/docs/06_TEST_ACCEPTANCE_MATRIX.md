# 06 — Test and Acceptance Matrix

## 1. Catalog builder

| ID | Scenario | Expected result |
|---|---|---|
| CAT-001 | Same source commit and config built twice | Same normalized content/checksums except explicitly excluded timestamps |
| CAT-002 | Record uses `_copy` | Fully resolved before normalization |
| CAT-003 | Record uses supported `_mod` | Modification applied and covered by fixture |
| CAT-004 | Unknown `_mod` operation | Build fails with source path and entity identity |
| CAT-005 | Copy cycle | Build fails with cycle chain |
| CAT-006 | Duplicate canonical ID | Publication blocked |
| CAT-007 | Unresolved included reference | Publication blocked |
| CAT-008 | 2014 core marker | Entity classified `2014` and `core` |
| CAT-009 | 2024 core marker | Entity classified `2024` and `core` |
| CAT-010 | Book categorized core but record not free | Entity classified `source` |
| CAT-011 | New class uses supported normalized structures | Appears in class index without plugin rebuild |
| CAT-012 | New class requires unknown mechanic | Build reports unsupported mechanic; publication policy decides exclusion/failure |
| CAT-013 | Resolved record contains an unclaimed structured field | Field is included in the ingestion inventory and is not silently discarded |
| CAT-014 | Narrative mechanic has an approved reviewed mapping | Mapping produces validated effects with provenance, automation status, and projections |
| CAT-015 | Narrative mechanic has no reviewed mapping | Full text remains visible and a non-automated diagnostic is emitted |
| CAT-016 | Semantic mapping targets the wrong ruleset or source identity | Build rejects the mapping with an actionable diagnostic |
| CAT-017 | Semantic mapping uses a display name instead of canonical identity | Build rejects the mapping |

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

## 4. Character creation

| ID | Scenario | Expected result |
|---|---|---|
| CRE-001 | 2014 core-only character | Only 2014 core plus required fixed dependencies visible |
| CRE-002 | 2024 core-only character | Only 2024 core visible |
| CRE-003 | Add optional source | Its compatible entities become visible |
| CRE-004 | Unselected source | Its non-core entities remain hidden |
| CRE-005 | Change ruleset | Incompatible selections cleared/invalidated explicitly |
| CRE-006 | Change species | Species-origin choices invalidated and regenerated |
| CRE-007 | Change class | Class/subclass/spell choices invalidated and regenerated |
| CRE-008 | Required choice unresolved | Save blocked |
| CRE-009 | Review | Derived snapshot matches selected inputs |
| CRE-010 | Save succeeds | Character file contains selections, not candidate lists/catalog copies |

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
| ENG-009 | Advantage against being Poisoned | Appears as a conditional saving-throw effect and not as a permanent ability bonus |
| ENG-010 | Disease immunity | Appears in Defenses as disease immunity and not as damage immunity |
| ENG-011 | No breathing requirement | Appears as a capability without inventing a numeric modifier |
| ENG-012 | One effect has primary and secondary projections | Effect is evaluated once and referenced in both projections |
| ENG-013 | Projected effect source | Projection identifies the originating entity or feature |
| ENG-014 | Partial feature automation | Supported effects apply and unsupported narrative remains visible with partial status |
| ENG-015 | Conditional skill disadvantage | Applies only to matching skill checks while its source effect is active |

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
| UI-008 | Conditional saving-throw effect | Displayed under Saving Throws with its source feature |
| UI-009 | Resistance or immunity | Displayed under Defenses with the correct semantic category |
| UI-010 | Species capability | Displayed under Species Traits and marked according to automation status |
| UI-011 | One rule has two projections | Both views reference the same derived effect |
| UI-012 | Display-only narrative mechanic | Full text is visible and clearly marked non-automated |

## 7. Inventory and equipment
| ID | Scenario | Expected result |
|---|---|---|
| EQP-001 | Add armor without equipping it | Inventory changes; AC and conditional effects do not change |
| EQP-002 | Equip armor with an AC formula | Active AC recalculates and contribution trace identifies the item instance |
| EQP-003 | Equipped armor imposes Stealth disadvantage | Conditional skill effect appears while the item is equipped |
| EQP-004 | Unequip armor | AC formula and every conditional armor effect are removed |
| EQP-005 | Equip shield with compatible armor | Shield contribution composes once with the active armor formula |
| EQP-006 | Two body armors conflict | Command is rejected or conflict resolution is explicitly required |
| EQP-007 | Two instances of the same item exist | Only the equipped instance contributes effects |
| EQP-008 | Item effect is projected to AC and Inventory | Effect is evaluated once and both projections identify the same item instance |

## 8. Level-up and source policy

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

## 9. Release acceptance

- [ ] All critical scenarios pass.
- [ ] No open critical/high data-integrity defect.
- [ ] Catalog rollback tested.
- [ ] Character migration tested.
- [ ] Obsidian API usage register reviewed against pinned definition.
- [ ] Desktop and Android manual checks completed.
- [ ] Content-distribution policy reviewed.
