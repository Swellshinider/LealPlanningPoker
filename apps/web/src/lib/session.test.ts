import { describe, expect, it } from "vitest";
import { resolveHostTokenAfterJoin } from "./session";

describe("resolveHostTokenAfterJoin", () => {
  it("clears the stored host token for non-host joins", () => {
    expect(resolveHostTokenAfterJoin(false, "PARTICIPANT_TOKEN")).toBe("");
  });

  it("keeps the participant token for host joins", () => {
    expect(resolveHostTokenAfterJoin(true, "HOST_TOKEN")).toBe("HOST_TOKEN");
  });
});
