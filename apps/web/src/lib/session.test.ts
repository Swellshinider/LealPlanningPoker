import { describe, expect, it } from "vitest";
import { resolveHostTokenAfterJoin, shouldRestoreStoredSessionTokens } from "./session";

describe("resolveHostTokenAfterJoin", () => {
  it("clears the stored host token for non-host joins", () => {
    expect(resolveHostTokenAfterJoin(false, "PARTICIPANT_TOKEN")).toBe("");
  });

  it("keeps the participant token for host joins", () => {
    expect(resolveHostTokenAfterJoin(true, "HOST_TOKEN")).toBe("HOST_TOKEN");
  });
});

describe("shouldRestoreStoredSessionTokens", () => {
  it("restores a stored token when the room link does not change rooms", () => {
    expect(shouldRestoreStoredSessionTokens("", "ROOM01", "TOKEN01")).toBe(true);
    expect(shouldRestoreStoredSessionTokens("ROOM01", "ROOM01", "TOKEN01")).toBe(true);
  });

  it("does not restore a stored token for a different room", () => {
    expect(shouldRestoreStoredSessionTokens("ROOM02", "ROOM01", "TOKEN01")).toBe(false);
    expect(shouldRestoreStoredSessionTokens("ROOM02", "", "TOKEN01")).toBe(false);
  });

  it("does not restore an empty token", () => {
    expect(shouldRestoreStoredSessionTokens("ROOM01", "ROOM01", "")).toBe(false);
  });
});
