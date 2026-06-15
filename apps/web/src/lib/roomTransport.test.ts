import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { throwReaction } from "./roomTransport";

describe("throwReaction", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(1_717_171_717_000);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts to the throw endpoint with the participant token header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          snapshot: {
            roomId: "ROOM01"
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

    await throwReaction("ROOM01", "PARTICIPANT_TOKEN", {
      emoji: "🔥",
      targetParticipantId: "TARGET_1"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rooms/ROOM01/reactions/throw",
      expect.objectContaining({
        body: JSON.stringify({
          emoji: "🔥",
          targetParticipantId: "TARGET_1"
        }),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-participant-token": "PARTICIPANT_TOKEN"
        }),
        method: "POST"
      })
    );
  });

  it("falls back to the compatibility GET route when the POST response is not JSON", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("<!doctype html>", {
          headers: {
            "content-type": "text/html"
          },
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            snapshot: {
              roomId: "ROOM01"
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

    await throwReaction("ROOM01", "PARTICIPANT_TOKEN", {
      emoji: "💯",
      targetParticipantId: "TARGET_2"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://localhost/api/compat/rooms/ROOM01/reactions/throw?_ts=1717171717000&targetParticipantId=TARGET_2&emoji=%F0%9F%92%AF"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: {
          "x-participant-token": "PARTICIPANT_TOKEN"
        },
        method: "GET"
      })
    );
  });
});
