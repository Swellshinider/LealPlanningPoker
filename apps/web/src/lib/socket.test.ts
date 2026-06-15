import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomSocket, getConnectionErrorMessage } from "./socket";

const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn()
}));

vi.mock("socket.io-client", () => ({
  io: ioMock
}));

describe("createRoomSocket", () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses websocket-only transport with the shared socket path", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://poker.erleal.com",
        protocol: "https:",
        hostname: "poker.erleal.com"
      }
    });

    createRoomSocket();

    expect(ioMock).toHaveBeenCalledWith("https://poker.erleal.com:3000", {
      autoConnect: false,
      path: "/socket.io",
      transports: ["websocket"]
    });
  });
});

describe("getConnectionErrorMessage", () => {
  it("explains that websocket traffic may be blocked by the network", () => {
    expect(getConnectionErrorMessage()).toBe(
      "Unable to connect. Your network or corporate proxy may be blocking WebSocket traffic."
    );
  });
});
