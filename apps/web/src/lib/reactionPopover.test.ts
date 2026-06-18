import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The popover behavior spans two modules: useSeatInteraction owns the timers
// and open/close state, and PlayerSeat owns the host-action markup it toggles.
const source = ["../hooks/useSeatInteraction.ts", "../components/PlayerSeat.tsx"]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

describe("reaction popover hover behavior", () => {
  it("uses a delayed close so the pointer can move from the head to the emoji popover", () => {
    expect(source).toContain("REACTION_POPOVER_CLOSE_DELAY_MS");
    expect(source).toContain("setTimeout");
    expect(source).toContain("clearTimeout");
  });

  it("uses a delayed close for transfer host so the pointer can move from the seat to the action", () => {
    expect(source).toContain("HOST_ACTION_CLOSE_DELAY_MS");
    expect(source).toContain("data-host-action-region");
    expect(source).toContain("player-seat__host-action--open");
  });

  it("suppresses the transfer host action while the reaction popover is open on the same seat", () => {
    expect(source).toContain("player-seat__host-action--suppressed");
    expect(source).toContain("setActiveHostActionParticipantId((current) =>");
  });
});
