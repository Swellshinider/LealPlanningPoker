import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRoom,
  getConnectionErrorMessage,
  subscribeToRoom,
  syncRoom
} from "./roomTransport";

describe("roomTransport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      location: {
        origin: "https://poker.erleal.com",
        protocol: "https:",
        hostname: "poker.erleal.com"
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends create requests to the HTTP API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          roomId: "ROOM-0001",
          participantToken: "TOKEN_1",
          hostToken: "TOKEN_1",
          snapshot: {
            roomId: "ROOM-0001",
            hostName: "Mina",
            story: "",
            phase: "lobby",
            participants: [],
            history: [],
            updatedAt: "2026-06-15T12:00:00.000Z",
            viewer: {
              participantId: "P_1",
              isHost: true
            }
          }
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await createRoom({
      hostName: "Mina"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rooms", expect.objectContaining({
      body: JSON.stringify({
        hostName: "Mina"
      }),
      method: "POST"
    }));
  });

  it("falls back to compat GET when POST returns a proxy block page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html>blocked</html>", {
          headers: {
            "content-type": "text/html"
          },
          status: 403
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            roomId: "ROOM-0001",
            participantToken: "TOKEN_1",
            hostToken: "TOKEN_1",
            snapshot: {
              roomId: "ROOM-0001",
              hostName: "Mina",
              story: "",
              phase: "lobby",
              participants: [],
              history: [],
              updatedAt: "2026-06-15T12:00:00.000Z",
              viewer: {
                participantId: "P_1",
                isHost: true
              }
            }
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await createRoom({
      hostName: "Mina"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/compat/rooms/create?_ts="),
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  it("uses snapshot GET requests for session sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          snapshot: {
            roomId: "ROOM-0001",
            hostName: "Mina",
            story: "",
            phase: "lobby",
            participants: [],
            history: [],
            updatedAt: "2026-06-15T12:00:00.000Z",
            viewer: {
              participantId: "P_1",
              isHost: true
            }
          }
        }),
        {
          headers: {
            "content-type": "application/json"
          },
          status: 200
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await syncRoom("ROOM-0001", "TOKEN_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rooms/ROOM-0001/snapshot",
      expect.objectContaining({
        headers: {
          "x-participant-token": "TOKEN_1"
        },
        method: "GET"
      })
    );
  });

  it("falls back from streaming to polling and surfaces snapshots", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("blocked", {
          headers: {
            "content-type": "text/html"
          },
          status: 403
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            snapshot: {
              roomId: "ROOM-0001",
              hostName: "Mina",
              story: "",
              phase: "lobby",
              participants: [],
              history: [],
              updatedAt: "2026-06-15T12:00:00.000Z",
              viewer: {
                participantId: "P_1",
                isHost: true
              }
            }
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const onSnapshot = vi.fn();
    const onModeChange = vi.fn();

    const subscription = subscribeToRoom({
      onClosed: vi.fn(),
      onError: vi.fn(),
      onModeChange,
      onSnapshot,
      participantToken: "TOKEN_1",
      roomId: "ROOM-0001"
    });

    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(onModeChange).toHaveBeenCalledWith("sse");
    expect(onModeChange).toHaveBeenCalledWith("polling");
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    subscription.close();
  });
});

describe("getConnectionErrorMessage", () => {
  it("uses a transport-neutral network message", () => {
    expect(getConnectionErrorMessage()).toBe(
      "Unable to connect. Your network or corporate proxy may be blocking room traffic."
    );
  });
});
