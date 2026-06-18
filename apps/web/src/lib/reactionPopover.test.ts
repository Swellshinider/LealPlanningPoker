import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roomBoardSource = readFileSync(
  new URL("../components/RoomBoard.tsx", import.meta.url),
  "utf8",
);

describe("reaction popover hover behavior", () => {
  it("uses a delayed close so the pointer can move from the head to the emoji popover", () => {
    expect(roomBoardSource).toContain("REACTION_POPOVER_CLOSE_DELAY_MS");
    expect(roomBoardSource).toContain("setTimeout");
    expect(roomBoardSource).toContain("clearTimeout");
  });

  it("uses a delayed close for transfer host so the pointer can move from the seat to the action", () => {
    expect(roomBoardSource).toContain("HOST_ACTION_CLOSE_DELAY_MS");
    expect(roomBoardSource).toContain("data-host-action-region");
    expect(roomBoardSource).toContain("player-seat__host-action--open");
  });

  it("suppresses the transfer host action while the reaction popover is open on the same seat", () => {
    expect(roomBoardSource).toContain("player-seat__host-action--suppressed");
    expect(roomBoardSource).toContain("setActiveHostActionParticipantId((current) =>");
  });
});
