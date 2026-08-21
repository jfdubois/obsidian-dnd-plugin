# P10-NORMALIZER-A1 Audit Report

**Date**: 2025-11-23
**Task**: Audit existing catalog-builder code and data structures before class normalizer development
**Scope**: Class pipeline files, 5eTools source data, test fixtures

---

## Files Inspected

| File | Lines | Purpose |
|------|-------|---------|
| `class-index-loader.ts` | 311 | Loads raw class records, resolves copy/mod inheritance, indexes class data |
| `class-index-helpers.ts` | 953 | Field extractors: hit die, primary abilities, proficiencies, level-one features, subclass detection |
| `class-normalizer.ts` | 697 | Normalizes indexed class entries into domain model, builds level-one features, starting choices |
| `subclass-normalizer.ts` | 290 | Normalizes indexed subclass entries into domain model |
| `catalog-build-normalizers.ts` | 262 | Orchestrates all normalizers, dispatches by entity kind |
| `raw-boundary.ts` | 591 | Validates raw JSON files, extracts records into envelope/remaining structure |
| `source-file-role.ts` | 91 | Classifies source files as class, subclass, feature, etc. |
| `class-feature-normalizer.ts` | 278 | Normalizes class/subclass features into domain model |

---

## Actual 5eTools Data Structures (from `external/5etools-src/data/class/class-*.json`)

### Class File Top-Level Structure
```json
{
  "_meta": { ... },
  "class": [ ... ],          // list of class entries
  "subclass": [ ... ],       // list of subclass entries
  "classFeature": [ ... ],   // list of class feature definitions
  "subclassFeature": [ ... ] // list of subclass feature definitions
}
```

### Class Entry (PHB Paladin)
```json
{
  "name": "Paladin",
  "source": "PHB",
  "hd": { "number": 1, "faces": 10 },
  "proficiency": ["wis", "cha"],
  "spellcastingAbility": "cha",
  "casterProgression": "1/2",
  "preparedSpells": true,
  "startingProficiencies": {
    "armor": ["light", "medium", "heavy", "shield"],
    "weapons": ["simple", "martial"],
    "skills": [{ "choose": { "from": ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"], "count": 2 } }]
  },
  "startingEquipment": {
    "additionalFromBackground": true,
    "default": ["..."],
    "goldAlternative": "{@dice 5d4 × 10|5d4 × 10|Starting Gold}",
    "defaultData": [ ... ]
  },
  "classFeatures": [
    "Divine Sense|Paladin||1",
    "Lay on Hands|Paladin||1",
    "Divine Smite|Paladin||2",
    "Fighting Style|Paladin||2",
    "Spellcasting|Paladin||2",
    "Channel Divinity|Paladin||3",
    "Divine Health|Paladin||3",
    "Sacred Oath|Paladin||3",
    "Ability Score Improvement|Paladin||4",
    "Extra Attack|Paladin||5",
    "Aura of Protection|Paladin||6",
    "Sacred Oath feature|Paladin||7",
    "Ability Score Improvement|Paladin||8",
    "Aura of Courage|Paladin||10",
    "Improved Divine Smite|Paladin||11",
    "Ability Score Improvement|Paladin||12",
    "Cleansing Touch|Paladin||14",
    "Sacred Oath feature|Paladin||15",
    "Ability Score Improvement|Paladin||16",
    "Aura improvements|Paladin||18",
    "Ability Score Improvement|Paladin||19",
    "Sacred Oath feature|Paladin||20"
  ],
  "subclassTitle": "Sacred Oath",
  "optionalfeatureProgression": [{ "name": "Fighting Style", "featureType": ["FS:P"], "progression": { "2": 1 } }]
}
```

### Subclass Entry (PHB Oath of Devotion)
```json
{
  "name": "Oath of Devotion",
  "shortName": "devotion",
  "source": "PHB",
  "className": "Paladin",
  "classSource": "PHB",
  "subclassFeatures": [
    "Oath of Devotion|Paladin|devotion|3",
    "Channel Divinity|Paladin|devotion|3",
    "Divine Intervention|Paladin|devotion|3",
    "Aura of the Sacred|Paladin|devotion|3",
    "Sacred Oath feature|Paladin|devotion|7",
    "Sacred Oath feature|Paladin|devotion|15",
    "Sacred Oath feature|Paladin|devotion|20"
  ],
  "additionalSpells": {
    "1": ["protection from evil and good", "thebardsministration"],
    "3": ["lesser restoration", "zone of truth"],
    "5": ["beacon of hope", "dispel magic"],
    "7": ["freedom of movement", "guardian of faith"],
    "9": ["commune", "flame strike"]
  }
}
```

### ClassFeature Entry
```json
{
  "name": "Divine Sense",
  "source": "PHB",
  "page": 84,
  "srd": true,
  "className": "Paladin",
  "classSource": "PHB",
  "level": 1,
  "entries": ["The presence of strong evil registers on your senses like a noxious odor..."]
}
```

### SubclassFeature Entry
```json
{
  "name": "Oath of Devotion",
  "source": "PHB",
  "page": 87,
  "className": "Paladin",
  "classSource": "PHB",
  "subclassShortName": "devotion",
  "subclassSource": "PHB",
  "level": 3,
  "entries": ["..."]
}
```

### XPHB Paladin (2024 rules)
```json
{
  "name": "Paladin",
  "source": "XPHB",
  "hd": { "number": 1, "faces": 10 },
  "primaryAbility": [{ "str": true, "cha": true }],
  "proficiency": ["wis", "cha"],
  "proficiencies": [
    { "type": "armor", "name": "light armor" },
    { "type": "armor", "name": "medium armor" },
    { "type": "armor", "name": "heavy armor" },
    { "type": "armor", "name": "shields" },
    { "type": "weapon", "name": "simple weapons" },
    { "type": "weapon", "name": "martial weapons" }
  ],
  "classFeatures": [
    { "classFeature": "Paladin's Blessing", "gainSubclassFeature": true }
  ],
  "levels": [],
  "startingProficiencies": {
    "armor": ["light armor", "medium armor", "heavy armor", "shields"],
    "weapons": ["simple weapons", "martial weapons"],
    "skills": [{ "choose": { "from": ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"], "count": 2 } }]
  },
  "startingEquipment": { ... },
  "casterProgression": "1/2"
}
```

---

## Critical Defects Found

### Defect 1: `isSubclassRecord` checks for `parent` field (does not exist in 5eTools)

**Location**: `class-index-helpers.ts:46-53`
```typescript
export function isSubclassRecord(record: CopyModRawRecord): boolean {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return true;
  }
  return false;
}
```

**Problem**: 5eTools subclass records do NOT have a `parent` field. They use `className` and `classSource` instead:
```json
{ "name": "Oath of Devotion", "className": "Paladin", "classSource": "PHB", ... }
```

**Impact**: ALL PHB/XPHB subclasses will be classified as base classes. The pipeline will attempt to normalize them as base classes, which will fail because subclasses lack `hd`, `proficiency`, and other base-class-required fields.

**Fix**: Update `isSubclassRecord` to check for `className`/`classSource` presence:
```typescript
export function isSubclassRecord(record: CopyModRawRecord): boolean {
  const remaining = record.remaining;
  // 5eTools uses className/classSource instead of parent
  if (typeof remaining.className === "string" && remaining.className.length > 0) {
    return true;
  }
  // Legacy fallback
  if (typeof remaining.parent === "string" && remaining.parent.length > 0) {
    return true;
  }
  return false;
}
```

### Defect 2: `extractLevelOneFeatures` expects `levels[]` array (does not exist in PHB classes)

**Location**: `class-index-helpers.ts:893-953`
```typescript
export function extractLevelOneFeatures(remaining: Record<string, unknown>): readonly LevelOneFeature[] {
  const features: LevelOneFeature[] = [];
  const levels = remaining.levels;
  if (Array.isArray(levels)) {
    for (const level of levels) {
      if (lvl.level === 1) {
        const feats = lvl.feats;
        // ...
      }
    }
  }
  // ...
}
```

**Problem**: PHB class entries do NOT have a `levels` array. They have `classFeatures` as a list of pipe-delimited strings:
```json
"classFeatures": ["Divine Sense|Paladin||1", "Lay on Hands|Paladin||1", ...]
```

XPHB class entries have `levels: []` (empty array).

**Impact**: Level-one features will NEVER be extracted from actual 5eTools data. The `buildLevelOne` function in `class-normalizer.ts` will receive an empty array, so no level-one features will appear in normalized class output.

**Fix**: Add `classFeatures` parsing to extract level-one features:
```typescript
// Parse classFeatures pipe-delimited strings: "Name|Class||Level"
const classFeatures = remaining.classFeatures;
if (Array.isArray(classFeatures)) {
  for (const cf of classFeatures) {
    if (typeof cf === "string") {
      const parts = cf.split("|");
      if (parts.length >= 4 && parts[3] === "1") {
        features.push({ name: parts[0] });
      }
    }
  }
}
```

### Defect 3: `extractStartingArmorProficiencies` expects array, but 5eTools uses dict

**Location**: `class-index-helpers.ts:247-285`
```typescript
export function extractStartingArmorProficiencies(remaining: Record<string, unknown>): readonly string[] {
  const startingProf = remaining.startingProficiencies;
  if (Array.isArray(startingProf)) {
    for (const entry of startingProf) {
      // ...
    }
  }
  // ...
}
```

**Problem**: 5eTools `startingProficiencies` is a dict, not an array:
```json
"startingProficiencies": {
  "armor": ["light", "medium", "heavy", "shield"],
  "weapons": ["simple", "martial"],
  "skills": [{ "choose": { "from": [...], "count": 2 } }]
}
```

**Impact**: Starting armor proficiencies will never be extracted from actual 5eTools data. Same applies to weapons, tools, and skills extractors.

**Fix**: Handle dict format:
```typescript
const startingProf = remaining.startingProficiencies;
if (typeof startingProf === "object" && startingProf !== null && !Array.isArray(startingProf)) {
  const prof = startingProf as Record<string, unknown>;
  const armor = prof.armor;
  if (Array.isArray(armor)) {
    for (const a of armor) {
      if (typeof a === "string" && a.length > 0 && !armors.includes(a)) {
        armors.push(a);
      }
    }
  }
}
```

### Defect 4: `extractParentId` checks for `parent` field (does not exist in 5eTools)

**Location**: `class-index-helpers.ts:55-62`
```typescript
export function extractParentId(record: CopyModRawRecord): string | undefined {
  const remaining = record.remaining;
  const parent = remaining.parent;
  if (typeof parent === "string" && parent.length > 0) {
    return parent;
  }
  return undefined;
}
```

**Problem**: Same as Defect 1. Uses `parent` instead of `className`/`classSource`.

**Impact**: Parent class ID will never be extracted for 5eTools subclasses.

**Fix**: Construct parent ID from `className`/`classSource`:
```typescript
if (typeof remaining.className === "string" && remaining.className.length > 0) {
  const classSource = typeof remaining.classSource === "string" ? remaining.classSource : "";
  return createCanonicalEntityId({ entityKind: "class", name: remaining.className, source: classSource });
}
```

---

## Pipeline Flow

```
normalizeClassIndexKind (catalog-build-normalizers.ts)
  └─ loadClassIndex (class-index-loader.ts)
       ├─ collectClassRecords (class-index-helpers.ts)
       │    └─ iterates validatedFiles → collections → records
       │
       └─ for each record:
            ├─ indexSingleClass
            │    ├─ classifyClassSourceScope
            │    ├─ resolve _copy/_mod inheritance
            │    ├─ isSubclassRecord(record)  ← DEFECT 1
            │    ├─ If subclass:
            │    │    ├─ extractParentId(record)  ← DEFECT 4
            │    │    └─ push to subclassEntries
            │    └─ If base class:
            │         ├─ extractHitDie(record)
            │         ├─ extractPrimaryAbilities2014/2024(record)
            │         ├─ extractSavingThrows2014/2024(record)
            │         ├─ extractStartingArmorProficiencies(record)  ← DEFECT 3
            │         ├─ extractStartingWeaponProficiencies(record)  ← DEFECT 3
            │         ├─ extractStartingToolProficiencies(record)  ← DEFECT 3
            │         ├─ extractStartingSkillChoices(record)  ← DEFECT 3
            │         ├─ extractStartingEquipment(record)
            │         ├─ extractStartingGold(record)
            │         └─ extractLevelOneFeatures(record)  ← DEFECT 2
            │
            └─ return { baseClassEntries, subclassEntries }

  └─ normalizeClasses (class-normalizer.ts)
       └─ for each base class entry:
            ├─ normalizeSingleClass
            │    ├─ buildLevelOne(levelOneFeatures)
            │    └─ buildStartingChoices(...)
            └─ push to normalized classes

  └─ normalizeSubclasses (subclass-normalizer.ts)
       └─ for each subclass entry:
            └─ normalizeSingleSubclass
                 └─ push to normalized subclasses
```

---

## Recommendations

### Immediate Fixes (before P10 normalizer development)

1. **Fix `isSubclassRecord`** to check for `className`/`classSource` instead of `parent`.
2. **Fix `extractParentId`** to construct parent ID from `className`/`classSource`.
3. **Fix `extractLevelOneFeatures`** to parse `classFeatures` pipe-delimited strings.
4. **Fix starting proficiency extractors** to handle dict format in `startingProficiencies`.

### Data Structure Considerations

- The 5eTools data uses pipe-delimited strings for feature references: `"Divine Sense|Paladin||1"` and `"Oath of Devotion|Paladin|devotion|3"`. These need parsing in the index layer.
- XPHB (2024) classes use `primaryAbility` array with boolean flags, while PHB (2014) uses `proficiency` array for saving throws. Both formats need handling.
- XPHB classes use `proficiencies` array with `type` field for starting proficiencies, while PHB uses `startingProficiencies` dict. Both formats need handling.

### Test Fixture Updates

- Current test fixtures may use a different data format than actual 5eTools. Ensure fixtures match the real 5eTools structure for accurate testing.
- Add test cases for PHB and XPHB class/subclass data with actual 5eTools field names.

---

## Summary

The catalog-builder code was written with an assumed data structure that differs from the actual 5eTools source data. Four critical defects were found that will prevent proper class normalization from real 5eTools data:

1. **Subclass detection** relies on non-existent `parent` field.
2. **Level-one feature extraction** relies on non-existent `levels[]` array.
3. **Starting proficiency extraction** expects array format, but 5eTools uses dict format.
4. **Parent ID extraction** relies on non-existent `parent` field.

These defects must be resolved before P10 class normalizer development can proceed with actual 5eTools data.
