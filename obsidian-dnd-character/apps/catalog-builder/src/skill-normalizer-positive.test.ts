import { describe, it, expect } from "vitest";
import { normalizeSkills, type SkillNormalizerInput } from "./skill-normalizer";
import { makeCopyModRawRecord, ctx } from "./skill-normalizer-test-helpers";

describe("normalizeSkills", () => {
  describe("empty input", () => {
    it("returns empty result for no records", () => {
      const input: SkillNormalizerInput = { records: [], context: ctx };
      const result = normalizeSkills(input);

      expect(result.skills).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("result is frozen", () => {
      const record = makeCopyModRawRecord();
      const input: SkillNormalizerInput = { records: [record], context: ctx };
      const result = normalizeSkills(input);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.skills)).toBe(true);
      expect(Object.isFrozen(result.diagnostics)).toBe(true);
    });
  });

  describe("positive normalization", () => {
    it("normalizes a valid PHB skill", () => {
      const record = makeCopyModRawRecord();
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills.length).toBe(1);
      const skill = result.skills[0]!;
      expect(skill.kind).toBe("skill");
      expect(skill.name).toBe("Athletics");
      expect(skill.ruleset).toBe("2014");
      expect(skill.access).toBe("core");
      expect(skill.abilityScore).toBe("STR");
      expect(skill.content).toEqual([]);
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes a valid XPHB skill", () => {
      const record = makeCopyModRawRecord({
        name: "Athletics",
        source: "XPHB",
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills.length).toBe(1);
      expect(result.skills[0]!.ruleset).toBe("2024");
      expect(result.skills[0]!.name).toBe("Athletics");
      expect(result.diagnostics.length).toBe(0);
    });

    it("normalizes multiple skills in a single batch", () => {
      const athletics = makeCopyModRawRecord({ name: "Athletics", abilityScore: "STR" });
      const stealth = makeCopyModRawRecord({ name: "Stealth", abilityScore: "DEX" });

      const input: SkillNormalizerInput = { records: [athletics, stealth], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills.length).toBe(2);
      expect(result.skills[0]!.name).toBe("Athletics");
      expect(result.skills[0]!.abilityScore).toBe("STR");
      expect(result.skills[1]!.name).toBe("Stealth");
      expect(result.skills[1]!.abilityScore).toBe("DEX");
    });

    it("extracts narrative content from entries", () => {
      const record = makeCopyModRawRecord({
        name: "Athletics",
        abilityScore: "STR",
        entries: [
          { type: "paragraph", text: "Your Strength score reflects your ability to run, climb, and swim." },
          { type: "heading", text: "Athletics", level: 2 },
        ],
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.content.length).toBe(2);
      expect(result.skills[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Your Strength score reflects your ability to run, climb, and swim.",
      });
      expect(result.skills[0]!.content[1]).toEqual({
        type: "heading",
        level: 2,
        text: "Athletics",
      });
    });

    it("extracts page number from record", () => {
      const record = makeCopyModRawRecord({ page: 175 });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.page).toBe(175);
    });

    it("extracts summary from record", () => {
      const record = makeCopyModRawRecord({ summary: "Strength-based skill check." });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.summary).toBe("Strength-based skill check.");
    });

    it("extracts description as paragraph content", () => {
      const record = makeCopyModRawRecord({
        description: "Your Strength determines your Athletics checks.",
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.content.length).toBe(1);
      expect(result.skills[0]!.content[0]).toEqual({
        type: "paragraph",
        text: "Your Strength determines your Athletics checks.",
      });
    });

    it("generates canonical ID with correct kind", () => {
      const record = makeCopyModRawRecord();
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.id).toContain("skill:");
    });

    it("generates canonical IDs matching source ruleset", () => {
      const record = makeCopyModRawRecord();
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      // PHB -> 2014 ruleset
      expect(result.skills[0]!.id).toContain(":2014:");
    });

    it("extracts ability score from 'ability' field", () => {
      const record = makeCopyModRawRecord({
        name: "Perception",
        ability: "WIS",
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.abilityScore).toBe("WIS");
    });

    it("handles list entries in content", () => {
      const record = makeCopyModRawRecord({
        entries: [
          { type: "list", items: ["item1", "item2"] },
        ],
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.content.length).toBe(1);
      expect(result.skills[0]!.content[0]).toEqual({
        type: "list",
        ordered: false,
        items: [],
      });
    });

    it("uses alternative abilityScore field", () => {
      const record = makeCopyModRawRecord({
        name: "Stealth",
        abilityScore: "DEX",
      });
      const input: SkillNormalizerInput = { records: [record], context: ctx };

      const result = normalizeSkills(input);

      expect(result.skills[0]!.abilityScore).toBe("DEX");
    });
  });
});
