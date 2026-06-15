import { describe, expect, it, vi } from "vitest";
import { RoomRealtimeHub } from "./roomRealtimeHub";
import { buildHttpApp } from "./http";
import { registerRoomHttpRoutes } from "./roomHttp";
import { RoomStore } from "./roomStore";

function createStore() {
  let nextId = 0;
  let nextRoom = 0;

  return new RoomStore({
    idFactory: () => `ID_${(nextId += 1).toString().padStart(3, "0")}`,
    now: () => new Date("2026-06-15T12:00:00.000Z"),
    roomIdFactory: () => `ROOM-${(nextRoom += 1).toString().padStart(4, "0")}`
  });
}

function createApp() {
  const store = createStore();
  const app = buildHttpApp({
    logger: false
  });
  const sockets = {
    notifyRoomChanged: vi.fn(),
    notifyRoomClosed: vi.fn()
  };
  const hub = new RoomRealtimeHub({
    onRoomChanged: sockets.notifyRoomChanged,
    store
  });

  registerRoomHttpRoutes({
    app,
    hub,
    sockets,
    store
  });

  return {
    app,
    sockets
  };
}

describe("registerRoomHttpRoutes", () => {
  it("creates rooms through POST /api/rooms", async () => {
    const { app, sockets } = createApp();

    const response = await app.inject({
      method: "POST",
      payload: {
        hostName: "Mina"
      },
      url: "/api/rooms"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      roomId: "ROOM-0001",
      participantToken: "ID_002",
      hostToken: "ID_002"
    });
    expect(sockets.notifyRoomChanged).toHaveBeenCalledWith("ROOM-0001");

    await app.close();
  });

  it("falls back cleanly for missing API routes instead of serving the SPA", async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/missing"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Not found",
      ok: false
    });

    await app.close();
  });

  it("supports GET compatibility joins with the same room result shape", async () => {
    const { app, sockets } = createApp();

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        hostName: "Mina"
      },
      url: "/api/rooms"
    });
    const createdRoom = createResponse.json();

    const response = await app.inject({
      method: "GET",
      url: `/api/compat/rooms/${createdRoom.roomId}/join?displayName=Kai&_ts=123`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      roomId: createdRoom.roomId
    });
    expect(sockets.notifyRoomChanged).toHaveBeenCalledWith(createdRoom.roomId);

    await app.close();
  });

  it("accepts host reveal actions without a JSON request body", async () => {
    const { app, sockets } = createApp();

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        hostName: "Mina"
      },
      url: "/api/rooms"
    });
    const createdRoom = createResponse.json();

    await app.inject({
      method: "POST",
      payload: {
        story: "Improve onboarding"
      },
      headers: {
        "x-host-token": createdRoom.hostToken
      },
      url: `/api/rooms/${createdRoom.roomId}/story`
    });

    await app.inject({
      method: "POST",
      payload: {
        vote: "3"
      },
      headers: {
        "x-participant-token": createdRoom.participantToken
      },
      url: `/api/rooms/${createdRoom.roomId}/votes`
    });

    const response = await app.inject({
      method: "POST",
      headers: {
        "x-host-token": createdRoom.hostToken
      },
      url: `/api/rooms/${createdRoom.roomId}/reveal`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      snapshot: {
        phase: "revealed",
        roomId: createdRoom.roomId
      }
    });
    expect(sockets.notifyRoomChanged).toHaveBeenCalledWith(createdRoom.roomId);

    await app.close();
  });

  it("marks API payload errors as 400 responses", async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: "POST",
      payload: {},
      url: "/api/rooms"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid hostName."
      },
      ok: false
    });

    await app.close();
  });

  it("requires a cache buster for GET compatibility routes", async () => {
    const { app } = createApp();

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        hostName: "Mina"
      },
      url: "/api/rooms"
    });
    const createdRoom = createResponse.json();

    const response = await app.inject({
      method: "GET",
      url: `/api/compat/rooms/${createdRoom.roomId}/join?displayName=Kai`
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid _ts."
      },
      ok: false
    });

    await app.close();
  });
});
