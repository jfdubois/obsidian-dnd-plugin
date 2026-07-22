import { describe, it, expect } from "vitest";
import {
  createCharacterContentPolicy,
  createQueryContext,
  isCharacterContentPolicy,
  isQueryContext,
  policyContainsSource,
  queryContextContainsSource,
  type CharacterContentPolicy,
  type QueryContext,
  type SourceProfileOrigin,
} from "./source-policy";
import { createSourceId } from "./ids";
import type { Ruleset } from "./enums";

describe("SourceProfileOrigin", () => {
  const validOrigin: SourceProfileOrigin = {
    profileId: "core-2024",
    profileRevision: 1,
  };

  it("accepts valid origin", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [], {
      sourceProfileOrigin: validOrigin,
    });
    expect(policy.sourceProfileOrigin).toEqual(validOrigin);
  });

  it("accepts zero revision", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [], {
      sourceProfileOrigin: { profileId: "test", profileRevision: 0 },
    });
    expect(policy.sourceProfileOrigin?.profileRevision).toBe(0);
  });

  it("rejects negative revision in policy validator", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      mode: "snapshot",
      sourceProfileOrigin: { profileId: "test", profileRevision: -1 },
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("rejects non-numeric revision", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      mode: "snapshot",
      sourceProfileOrigin: { profileId: "test", profileRevision: "1" },
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("rejects NaN revision", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      mode: "snapshot",
      sourceProfileOrigin: { profileId: "test", profileRevision: NaN },
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });
});

describe("CharacterContentPolicy", () => {
  const coreSource = createSourceId("phb");
  const extraSource = createSourceId("xge");

  it("creates policy with factory", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [coreSource]);
    expect(policy.ruleset).toBe("2024");
    expect(policy.enabledSourceIds).toEqual([coreSource]);
    expect(policy.mode).toBe("snapshot");
    expect(policy.sourceProfileOrigin).toBeUndefined();
  });

  it("creates policy with profile origin", () => {
    const policy = createCharacterContentPolicy("2014" as Ruleset, [coreSource, extraSource], {
      sourceProfileOrigin: { profileId: "core-2014", profileRevision: 3 },
    });
    expect(policy.ruleset).toBe("2014");
    expect(policy.enabledSourceIds).toEqual([coreSource, extraSource]);
    expect(policy.sourceProfileOrigin).toEqual({ profileId: "core-2014", profileRevision: 3 });
  });

  it("creates an immutable copy of enabledSourceIds", () => {
    const sources = [coreSource];
    const policy = createCharacterContentPolicy("2024" as Ruleset, sources);
    sources.push(extraSource);
    expect(policy.enabledSourceIds).toHaveLength(1);
  });

  it("validator accepts valid 2024 policy", () => {
    const valid: unknown = {
      ruleset: "2024",
      enabledSourceIds: ["phb", "xphb"],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(valid)).toBe(true);
  });

  it("validator accepts valid 2014 policy", () => {
    const valid: unknown = {
      ruleset: "2014",
      enabledSourceIds: ["phb"],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(valid)).toBe(true);
  });

  it("validator accepts policy with empty source list", () => {
    const valid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(valid)).toBe(true);
  });

  it("validator accepts policy with profile origin", () => {
    const valid: unknown = {
      ruleset: "2024",
      enabledSourceIds: ["phb"],
      mode: "snapshot",
      sourceProfileOrigin: { profileId: "core", profileRevision: 1 },
    };
    expect(isCharacterContentPolicy(valid)).toBe(true);
  });

  it("validator rejects unknown ruleset", () => {
    const invalid: unknown = {
      ruleset: "2025",
      enabledSourceIds: [],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects missing ruleset", () => {
    const invalid: unknown = {
      enabledSourceIds: [],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects non-array enabledSourceIds", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: "phb",
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects non-string source id in array", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: ["phb", 123],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects empty string source id", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: ["phb", ""],
      mode: "snapshot",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects wrong mode", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      mode: "reference",
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects missing mode", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
    };
    expect(isCharacterContentPolicy(invalid)).toBe(false);
  });

  it("validator rejects null", () => {
    expect(isCharacterContentPolicy(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isCharacterContentPolicy(undefined)).toBe(false);
  });

  it("validator rejects plain string", () => {
    expect(isCharacterContentPolicy("not-a-policy")).toBe(false);
  });

  it("validator rejects number", () => {
    expect(isCharacterContentPolicy(42)).toBe(false);
  });

  it("validator rejects array", () => {
    expect(isCharacterContentPolicy([])).toBe(false);
  });

  it("policyContainsSource returns true for enabled source", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [coreSource, extraSource]);
    expect(policyContainsSource(policy, coreSource)).toBe(true);
  });

  it("policyContainsSource returns false for absent source", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [coreSource]);
    expect(policyContainsSource(policy, extraSource)).toBe(false);
  });
});

describe("QueryContext", () => {
  const coreSource = createSourceId("phb");
  const extraSource = createSourceId("xge");
  const requiredSource = createSourceId("xphb");

  it("creates context with factory", () => {
    const ctx = createQueryContext("2024" as Ruleset, [coreSource], [requiredSource]);
    expect(ctx.ruleset).toBe("2024");
    expect(ctx.enabledSourceIds).toEqual([coreSource]);
    expect(ctx.requiredSourceIds).toEqual([requiredSource]);
    expect(ctx.includeCore).toBe(true);
  });

  it("creates immutable copies of source arrays", () => {
    const enabled = [coreSource];
    const required = [requiredSource];
    const ctx = createQueryContext("2024" as Ruleset, enabled, required);
    enabled.push(extraSource);
    expect(ctx.enabledSourceIds).toHaveLength(1);
  });

  it("validator accepts valid context", () => {
    const valid: unknown = {
      ruleset: "2024",
      enabledSourceIds: ["phb"],
      requiredSourceIds: ["xphb"],
      includeCore: true,
    };
    expect(isQueryContext(valid)).toBe(true);
  });

  it("validator accepts empty source arrays", () => {
    const valid: unknown = {
      ruleset: "2014",
      enabledSourceIds: [],
      requiredSourceIds: [],
      includeCore: true,
    };
    expect(isQueryContext(valid)).toBe(true);
  });

  it("validator rejects false includeCore", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      requiredSourceIds: [],
      includeCore: false,
    };
    expect(isQueryContext(invalid)).toBe(false);
  });

  it("validator rejects missing includeCore", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      requiredSourceIds: [],
    };
    expect(isQueryContext(invalid)).toBe(false);
  });

  it("validator rejects unknown ruleset", () => {
    const invalid: unknown = {
      ruleset: "5e",
      enabledSourceIds: [],
      requiredSourceIds: [],
      includeCore: true,
    };
    expect(isQueryContext(invalid)).toBe(false);
  });

  it("validator rejects non-array enabledSourceIds", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: "phb",
      requiredSourceIds: [],
      includeCore: true,
    };
    expect(isQueryContext(invalid)).toBe(false);
  });

  it("validator rejects non-string in requiredSourceIds", () => {
    const invalid: unknown = {
      ruleset: "2024",
      enabledSourceIds: [],
      requiredSourceIds: [null],
      includeCore: true,
    };
    expect(isQueryContext(invalid)).toBe(false);
  });

  it("validator rejects null", () => {
    expect(isQueryContext(null)).toBe(false);
  });

  it("validator rejects undefined", () => {
    expect(isQueryContext(undefined)).toBe(false);
  });

  it("queryContextContainsSource returns true for enabled source", () => {
    const ctx = createQueryContext("2024" as Ruleset, [coreSource], [requiredSource]);
    expect(queryContextContainsSource(ctx, coreSource)).toBe(true);
  });

  it("queryContextContainsSource returns true for required source", () => {
    const ctx = createQueryContext("2024" as Ruleset, [coreSource], [requiredSource]);
    expect(queryContextContainsSource(ctx, requiredSource)).toBe(true);
  });

  it("queryContextContainsSource returns false for absent source", () => {
    const ctx = createQueryContext("2024" as Ruleset, [coreSource], []);
    expect(queryContextContainsSource(ctx, extraSource)).toBe(false);
  });
});

describe("round-trip", () => {
  it("factory + validator round-trips for policy", () => {
    const policy = createCharacterContentPolicy("2024" as Ruleset, [createSourceId("phb")]);
    expect(isCharacterContentPolicy(policy)).toBe(true);
    const typed = policy as unknown as CharacterContentPolicy;
    expect(typed.ruleset).toBe("2024");
    expect(typed.mode).toBe("snapshot");
  });

  it("factory + validator round-trips for query context", () => {
    const ctx = createQueryContext("2024" as Ruleset, [createSourceId("phb")], []);
    expect(isQueryContext(ctx)).toBe(true);
    const typed = ctx as unknown as QueryContext;
    expect(typed.includeCore).toBe(true);
  });
});
