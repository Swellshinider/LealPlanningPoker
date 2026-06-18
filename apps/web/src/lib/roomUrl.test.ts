import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRoomLink, clearRoomQuery, readPathname, readRoomQuery } from "./roomUrl";

describe("room url helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns safe defaults before window is available", () => {
    // The node test runner has no window; the guards must not throw.
    expect(readRoomQuery()).toBe("");
    expect(readPathname()).toBe("/");
    expect(buildRoomLink("ROOM01")).toBe("");
    expect(() => clearRoomQuery()).not.toThrow();
  });

  it("reads and uppercases the room query param", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?room=room01",
        pathname: "/",
        href: "https://app.test/?room=room01",
        origin: "https://app.test",
      },
      history: { replaceState: vi.fn() },
    });

    expect(readRoomQuery()).toBe("ROOM01");
    expect(readPathname()).toBe("/");
  });

  it("builds a shareable room link from the current URL", () => {
    vi.stubGlobal("window", {
      location: {
        search: "",
        pathname: "/help",
        href: "https://app.test/help",
        origin: "https://app.test",
      },
      history: { replaceState: vi.fn() },
    });

    expect(buildRoomLink("ROOM01")).toBe("https://app.test/help?room=ROOM01");
    expect(buildRoomLink("")).toBe("");
  });

  it("clears the room query via history.replaceState", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        search: "?room=ROOM01",
        pathname: "/",
        href: "https://app.test/?room=ROOM01",
        origin: "https://app.test",
      },
      history: { replaceState },
    });

    clearRoomQuery();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0]?.[2]).toBe("https://app.test/");
  });
});
