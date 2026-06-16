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
});
