import { describe, expect, it } from "vitest";
import { resolve } from "path";
import { pinnedFiveEToolsPath } from "./test-pinned-source-path";

describe("pinnedFiveEToolsPath", () => {
  it("derives the pinned source path from the checkout location", () => {
    const sourcePath = pinnedFiveEToolsPath();
    expect(sourcePath).toBe(resolve(process.cwd(), "../external/5etools-src"));
  });
});
