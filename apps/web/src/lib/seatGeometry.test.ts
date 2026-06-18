import { describe, expect, it } from "vitest";
import type { RoomParticipantView } from "./roomView";
import { getPlayerInitials, getPlayerStatus, getSeatGeometry } from "./seatGeometry";

describe("getSeatGeometry", () => {
  it("places a single participant at the bottom with no delay", () => {
    const geo = getSeatGeometry(0, 1);
    expect(geo.zoneClass).toBe("table-seat--lower");
    expect(geo.style["--seat-x"]).toBe("0.000%");
    expect(geo.style["--seat-y"]).toBe("38.000%");
    expect(geo.style["--seat-delay"]).toBe("0ms");
  });

  it("classifies each table edge for a four-seat table", () => {
    expect(getSeatGeometry(0, 4).zoneClass).toBe("table-seat--upper");
    expect(getSeatGeometry(1, 4).zoneClass).toBe("table-seat--right");
    expect(getSeatGeometry(2, 4).zoneClass).toBe("table-seat--lower");
    expect(getSeatGeometry(3, 4).zoneClass).toBe("table-seat--left");
  });
});

describe("getPlayerInitials", () => {
  it("takes the first two letters of a single name", () => {
    expect(getPlayerInitials("Ana")).toBe("AN");
  });

  it("combines the first letter of the first two words", () => {
    expect(getPlayerInitials("Mina Patel")).toBe("MP");
  });

  it("falls back to a question mark for empty input", () => {
    expect(getPlayerInitials("")).toBe("?");
    expect(getPlayerInitials("   ")).toBe("?");
  });
});

describe("getPlayerStatus", () => {
  const base = { connected: true, isHost: false } as RoomParticipantView;

  it("reports online and offline states", () => {
    expect(getPlayerStatus({ ...base, connected: true })).toBe("online");
    expect(getPlayerStatus({ ...base, connected: false })).toBe("offline");
  });

  it("prefixes the host status", () => {
    expect(getPlayerStatus({ ...base, isHost: true })).toBe("Host, online");
  });
});
