import { describe, it, expect } from "vitest";
import {
  parseCanonicalReference,
  parseSubclassFeatureRef,
  parseInlineReference,
  parseStructuredReference,
  parseReference,
  createCanonicalReference,
  isCanonicalReference,
  isStructuredReference,
  isParsedReference,
  isSuccessParsedReference,
  isDiagnosticParsedReference,
  isCanonicalParsedReference,
  isSubclassFeatureParsedReference,
  isInlineParsedReference,
  isPipeDelimitedReference,
  isInlineReferenceString,
  extractSourceAbbr,
  extractEntityName,
  ReferenceParserError,
} from "./ref-parser";

describe("parseCanonicalReference", () => {
  describe("simple references", () => {
    it("parses basic name|Source", () => {
      const result = parseCanonicalReference("sickle|PHB");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("sickle");
      expect(result.ref.sourceAbbr).toBe("PHB");
    });

    it("parses lowercase source", () => {
      const result = parseCanonicalReference("battleaxe|phb");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("battleaxe");
      expect(result.ref.sourceAbbr).toBe("phb");
    });

    it("parses name with apostrophe", () => {
      const result = parseCanonicalReference("Alchemist's Fire (flask)|PHB");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("Alchemist's Fire (flask)");
      expect(result.ref.sourceAbbr).toBe("PHB");
    });

    it("parses name with semicolons", () => {
      const result = parseCanonicalReference("Magic Initiate; Cleric|XPHB");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("Magic Initiate; Cleric");
      expect(result.ref.sourceAbbr).toBe("XPHB");
    });
  });

  describe("references without source", () => {
    it("handles name-only reference", () => {
      const result = parseCanonicalReference("bard");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("bard");
      expect(result.ref.sourceAbbr).toBe("");
    });
  });

  describe("subclass feature references", () => {
    it("parses standard subclass feature ref", () => {
      const result = parseCanonicalReference("Abjuration Savant|Wizard||Abjuration||2");
      if (!isSuccessParsedReference(result) || !isSubclassFeatureParsedReference(result)) throw new Error("Expected subclass-feature");
      expect(result.ref.featureName).toBe("Abjuration Savant");
      expect(result.ref.className).toBe("Wizard");
      expect(result.ref.subclass).toBe("Abjuration");
      expect(result.ref.level).toBe(2);
    });

    it("parses level 20 subclass feature", () => {
      const result = parseCanonicalReference("Feature|Class||Sub||20");
      if (!isSuccessParsedReference(result) || !isSubclassFeatureParsedReference(result)) throw new Error("Expected subclass-feature");
      expect(result.ref.level).toBe(20);
    });
  });

  describe("error cases", () => {
    it("returns error for empty string", () => {
      const result = parseCanonicalReference("");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("EMPTY_REFERENCE");
      expect(result.severity).toBe("warning");
    });

    it("returns error for non-string input", () => {
      const result = parseCanonicalReference(123 as unknown);
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("UNPARSEABLE_REFERENCE");
    });

    it("returns error for null input", () => {
      const result = parseCanonicalReference(null as unknown);
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("UNPARSEABLE_REFERENCE");
    });

    it("returns error for pipe at start", () => {
      const result = parseCanonicalReference("|PHB");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("MISSING_NAME");
    });

    it("returns warning for pipe at end", () => {
      const result = parseCanonicalReference("sickle|");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("MISSING_SOURCE");
      expect(result.severity).toBe("warning");
    });

    it("includes path in diagnostic", () => {
      const result = parseCanonicalReference("", "data/races.json:0");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.path).toBe("data/races.json:0");
    });
  });

  describe("real 5eTools examples", () => {
    it("parses equipment reference", () => {
      const result = parseCanonicalReference("drum|PHB");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("drum");
      expect(result.ref.sourceAbbr).toBe("PHB");
    });

    it("parses class reference", () => {
      const result = parseCanonicalReference("artificer|tce");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("artificer");
      expect(result.ref.sourceAbbr).toBe("tce");
    });

    it("parses background reference", () => {
      const result = parseCanonicalReference("Azorius Functionary|GGR");
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
      expect(result.ref.entityName).toBe("Azorius Functionary");
      expect(result.ref.sourceAbbr).toBe("GGR");
    });
  });
});

describe("parseSubclassFeatureRef", () => {
  it("parses full reference", () => {
    const result = parseSubclassFeatureRef("Abjuration Savant|Wizard||Abjuration||2");
    if (!isSuccessParsedReference(result) || !isSubclassFeatureParsedReference(result)) throw new Error("Expected subclass-feature");
    expect(result.ref.featureName).toBe("Abjuration Savant");
    expect(result.ref.className).toBe("Wizard");
    expect(result.ref.subclass).toBe("Abjuration");
    expect(result.ref.level).toBe(2);
  });

  it("returns error for too few segments", () => {
    const result = parseSubclassFeatureRef("Feat|Class||Sub");
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("INVALID_SUBCLASS_FEATURE");
  });

  it("returns error for non-numeric level", () => {
    const result = parseSubclassFeatureRef("Feat|Class||Sub||abc");
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("INVALID_SUBCLASS_FEATURE");
  });

  it("includes path in diagnostic", () => {
    const result = parseSubclassFeatureRef("Short", "path.json");
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.path).toBe("path.json");
  });
});

describe("parseInlineReference", () => {
  describe("valid inline references", () => {
    it("parses item reference", () => {
      const result = parseInlineReference("{@item dagger|PHB}");
      if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error("Expected inline");
      expect(result.tag).toBe("item");
      expect(result.segments).toEqual(["dagger", "PHB"]);
    });

    it("parses class reference with subclass", () => {
      const result = parseInlineReference("{@class fighter|phb|Battle Master}");
      if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error("Expected inline");
      expect(result.tag).toBe("class");
      expect(result.segments).toEqual(["fighter", "phb", "Battle Master"]);
    });

    it("parses damage without pipe", () => {
      const result = parseInlineReference("{@damage 1d6}");
      if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error("Expected inline");
      expect(result.tag).toBe("damage");
      expect(result.segments).toEqual(["1d6"]);
    });

    it("parses filter reference with multiple pipes", () => {
      const result = parseInlineReference("{@filter 1st-level spell|spells|level=1|school=E;D}");
      if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error("Expected inline");
      expect(result.tag).toBe("filter");
      expect(result.segments).toEqual(["1st-level spell", "spells", "level=1", "school=E;D"]);
    });
  });

  describe("error cases", () => {
    it("returns error for non-inline string", () => {
      const result = parseInlineReference("not an inline ref");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("UNPARSEABLE_REFERENCE");
    });

    it("returns error for non-string", () => {
      const result = parseInlineReference(42 as unknown);
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.code).toBe("UNPARSEABLE_REFERENCE");
    });

    it("includes path in diagnostic", () => {
      const result = parseInlineReference("bad", "path.json");
      if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
      expect(result.path).toBe("path.json");
    });
  });
});

describe("parseStructuredReference", () => {
  it("parses valid structured reference", () => {
    const result = parseStructuredReference({ name: "Goblin", source: "MPMM" });
    if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
    expect(result.ref.entityName).toBe("Goblin");
    expect(result.ref.sourceAbbr).toBe("MPMM");
  });

  it("parses with whitespace trimming", () => {
    const result = parseStructuredReference({ name: "  Goblin  ", source: "  MPMM  " });
    if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
    expect(result.ref.entityName).toBe("Goblin");
    expect(result.ref.sourceAbbr).toBe("MPMM");
  });

  it("returns error for missing name", () => {
    const result = parseStructuredReference({ source: "PHB" });
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("STRUCTURED_REF_MISSING_FIELD");
  });

  it("returns error for missing source", () => {
    const result = parseStructuredReference({ name: "Goblin" });
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("STRUCTURED_REF_MISSING_FIELD");
  });

  it("returns error for null", () => {
    const result = parseStructuredReference(null as unknown);
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("STRUCTURED_REF_MISSING_FIELD");
  });

  it("returns error for empty name string", () => {
    const result = parseStructuredReference({ name: "", source: "PHB" });
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("MISSING_NAME");
  });

  it("includes path in diagnostic", () => {
    const result = parseStructuredReference({ name: "Goblin" }, "path.json");
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.path).toBe("path.json");
  });
});

describe("parseReference (universal)", () => {
  it("auto-detects pipe-delimited string", () => {
    const result = parseReference("sickle|PHB");
    if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
    expect(result.ref.entityName).toBe("sickle");
  });

  it("auto-detects inline reference string", () => {
    const result = parseReference("{@item dagger|PHB}");
    if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error("Expected inline");
    expect(result.tag).toBe("item");
  });

  it("auto-detects structured reference object", () => {
    const result = parseReference({ name: "Goblin", source: "MPMM" });
    if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
    expect(result.ref.entityName).toBe("Goblin");
  });

  it("handles plain string without pipe", () => {
    const result = parseReference("bard");
    if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error("Expected canonical");
    expect(result.ref.sourceAbbr).toBe("");
  });

  it("handles null", () => {
    const result = parseReference(null);
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("EMPTY_REFERENCE");
  });

  it("handles number", () => {
    const result = parseReference(42);
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.code).toBe("UNPARSEABLE_REFERENCE");
  });

  it("includes path in diagnostic", () => {
    const result = parseReference(null, "path.json");
    if (!isDiagnosticParsedReference(result)) throw new Error("Expected diagnostic");
    expect(result.path).toBe("path.json");
  });
});

describe("createCanonicalReference", () => {
  it("creates frozen reference", () => {
    const ref = createCanonicalReference("sickle", "PHB");
    expect(ref.entityName).toBe("sickle");
    expect(ref.sourceAbbr).toBe("PHB");
    expect(Object.isFrozen(ref)).toBe(true);
  });

  it("trims whitespace", () => {
    const ref = createCanonicalReference("  sickle  ", "  PHB  ");
    expect(ref.entityName).toBe("sickle");
    expect(ref.sourceAbbr).toBe("PHB");
  });
});

describe("type guards", () => {
  it("isCanonicalReference validates structure", () => {
    expect(isCanonicalReference({ entityName: "sickle", sourceAbbr: "PHB" })).toBe(true);
    expect(isCanonicalReference({ entityName: "sickle" })).toBe(false);
    expect(isCanonicalReference(null)).toBe(false);
  });

  it("isStructuredReference validates structure", () => {
    expect(isStructuredReference({ name: "Goblin", source: "MPMM" })).toBe(true);
    expect(isStructuredReference({ name: "Goblin" })).toBe(false);
  });

  it("isParsedReference distinguishes from diagnostic", () => {
    expect(isParsedReference({ kind: "canonical", ref: { entityName: "x", sourceAbbr: "y" } })).toBe(true);
    expect(isParsedReference({ code: "EMPTY_REFERENCE", severity: "warning", message: "", raw: "" })).toBe(false);
  });

  it("isSuccess/isDiagnostic distinguish results", () => {
    const success = parseReference("sickle|PHB");
    const diagnostic = parseReference(null);
    expect(isSuccessParsedReference(success)).toBe(true);
    expect(isDiagnosticParsedReference(diagnostic)).toBe(true);
  });

  it("isPipeDelimitedReference checks format", () => {
    expect(isPipeDelimitedReference("sickle|PHB")).toBe(true);
    expect(isPipeDelimitedReference("bard")).toBe(false);
  });

  it("isInlineReferenceString checks format", () => {
    expect(isInlineReferenceString("{@item dagger|PHB}")).toBe(true);
    expect(isInlineReferenceString("dagger|PHB")).toBe(false);
  });
});

describe("extract helpers", () => {
  it("extractSourceAbbr extracts last segment", () => {
    expect(extractSourceAbbr("sickle|PHB")).toBe("PHB");
    expect(extractSourceAbbr("Alchemist's Fire (flask)|PHB")).toBe("PHB");
    expect(extractSourceAbbr("bard")).toBeUndefined();
  });

  it("extractEntityName extracts name part", () => {
    expect(extractEntityName("sickle|PHB")).toBe("sickle");
    expect(extractEntityName("Alchemist's Fire (flask)|PHB")).toBe("Alchemist's Fire (flask)");
    expect(extractEntityName("bard")).toBeUndefined();
  });
});

describe("ReferenceParserError", () => {
  it("creates error with code and raw", () => {
    const err = new ReferenceParserError("EMPTY_REFERENCE", "", "test message");
    expect(err.name).toBe("ReferenceParserError");
    expect(err.code).toBe("EMPTY_REFERENCE");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("integration with real 5eTools patterns", () => {
  it("parses baseItem references", () => {
    for (const ref of ["sickle|PHB", "battleaxe|phb", "chain mail|phb", "drum|PHB"]) {
      const result = parseReference(ref);
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error(`Expected canonical for ${ref}`);
    }
  });

  it("parses starting equipment references", () => {
    for (const ref of ["acid (vial)|phb", "dagger|phb", "explorer's pack|xphb"]) {
      const result = parseReference(ref);
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error(`Expected canonical for ${ref}`);
    }
  });

  it("parses _copy structured references", () => {
    for (const copy of [{ name: "Goblin", source: "MPMM" }, { name: "Centaur", source: "GGR" }]) {
      const result = parseReference(copy);
      if (!isSuccessParsedReference(result) || !isCanonicalParsedReference(result)) throw new Error(`Expected canonical for ${copy.name}`);
    }
  });

  it("parses inline references from entries", () => {
    for (const inline of ["{@item dagger|PHB}", "{@damage 1d6}", "{@dice 2d4 x 10}"]) {
      const result = parseReference(inline);
      if (!isSuccessParsedReference(result) || !isInlineParsedReference(result)) throw new Error(`Expected inline for ${inline}`);
    }
  });

  it("parses subclass feature references", () => {
    const result = parseReference("Abjuration Savant|Wizard||Abjuration||2");
    if (!isSuccessParsedReference(result) || !isSubclassFeatureParsedReference(result)) throw new Error("Expected subclass-feature");
  });
});
