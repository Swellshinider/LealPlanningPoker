import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerRuntime } from "./main";
import { RoomStore } from "./roomStore";

class ExpiringStore extends RoomStore {
  expireCalls = 0;

  override expireRooms(): string[] {
    this.expireCalls += 1;
    return [];
  }
}

describe("createServerRuntime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs room expiration on an interval and stops on close", async () => {
    vi.useFakeTimers();
    const store = new ExpiringStore({
      roomTtlMs: 5,
      now: () => new Date("2026-06-11T12:00:00.000Z"),
    });

    const runtime = await createServerRuntime({
      logger: false,
      store,
    });

    expect(store.expireCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(5);
    expect(store.expireCalls).toBeGreaterThan(0);

    await runtime.close();
    const callsAfterClose = store.expireCalls;

    await vi.advanceTimersByTimeAsync(25);
    expect(store.expireCalls).toBe(callsAfterClose);
  });
});
