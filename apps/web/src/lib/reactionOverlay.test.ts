import { describe, expect, it } from "vitest";
import {
  deriveReactionPhase,
  filterExpiredReactions,
  getReactionPanelGeometry,
} from "./reactionOverlay";

const baseReaction = {
  createdAt: "2026-06-15T12:00:00.000Z",
  emoji: "🔥" as const,
  expiresAt: "2026-06-15T12:00:04.000Z",
  id: "REACTION_1",
  targetParticipantId: "TARGET_1",
  throwerParticipantId: "THROWER_1",
};

describe("deriveReactionPhase", () => {
  it("maps the reaction lifecycle windows to the expected phases", () => {
    expect(deriveReactionPhase(baseReaction, Date.parse("2026-06-15T12:00:00.100Z"))).toEqual({
      elapsedMs: 100,
      phase: "flight",
      progress: 100 / 650,
    });
    expect(deriveReactionPhase(baseReaction, Date.parse("2026-06-15T12:00:00.800Z"))).toEqual({
      elapsedMs: 800,
      phase: "impact",
      progress: (800 - 650) / 400,
    });
    expect(deriveReactionPhase(baseReaction, Date.parse("2026-06-15T12:00:02.000Z"))).toEqual({
      elapsedMs: 2_000,
      phase: "linger",
      progress: (2_000 - 1_050) / 2_550,
    });
    expect(deriveReactionPhase(baseReaction, Date.parse("2026-06-15T12:00:03.800Z"))).toEqual({
      elapsedMs: 3_800,
      phase: "fade",
      progress: 0.5,
    });
    expect(deriveReactionPhase(baseReaction, Date.parse("2026-06-15T12:00:04.000Z"))).toEqual({
      elapsedMs: 4_000,
      phase: "expired",
      progress: 1,
    });
  });
});

describe("filterExpiredReactions", () => {
  it("drops reactions once the expiry instant is reached", () => {
    expect(filterExpiredReactions([baseReaction], Date.parse("2026-06-15T12:00:03.999Z"))).toEqual([
      baseReaction,
    ]);
    expect(filterExpiredReactions([baseReaction], Date.parse("2026-06-15T12:00:04.000Z"))).toEqual(
      [],
    );
  });
});

describe("getReactionPanelGeometry", () => {
  it("returns panel-relative throw, target, and arc control points", () => {
    expect(
      getReactionPanelGeometry({
        panelRect: {
          height: 600,
          left: 100,
          top: 80,
          width: 900,
        },
        targetHeadRect: {
          height: 40,
          left: 740,
          top: 170,
          width: 40,
        },
        throwerSeatRect: {
          height: 120,
          left: 180,
          top: 360,
          width: 160,
        },
      }),
    ).toEqual({
      control: {
        x: 420,
        y: 126,
      },
      end: {
        x: 660,
        y: 110,
      },
      start: {
        x: 160,
        y: 316,
      },
    });
  });
});
