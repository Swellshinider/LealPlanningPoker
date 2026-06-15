import type { RoomActiveReactionSnapshot } from "@lealplanningpoker/shared";

const FLIGHT_MS = 650;
const IMPACT_END_MS = 1_050;
const LINGER_END_MS = 3_600;
const FADE_END_MS = 4_000;

export type ReactionPhase = "flight" | "impact" | "linger" | "fade" | "expired";

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ReactionPhaseState {
  phase: ReactionPhase;
  progress: number;
  elapsedMs: number;
}

export function deriveReactionPhase(
  reaction: Pick<RoomActiveReactionSnapshot, "createdAt" | "expiresAt">,
  nowMs = Date.now()
): ReactionPhaseState {
  const createdAtMs = Date.parse(reaction.createdAt);
  const expiresAtMs = Date.parse(reaction.expiresAt);
  const elapsedMs = clamp(nowMs - createdAtMs, 0, expiresAtMs - createdAtMs);

  if (elapsedMs >= FADE_END_MS) {
    return { phase: "expired", progress: 1, elapsedMs };
  }

  if (elapsedMs < FLIGHT_MS) {
    return { phase: "flight", progress: elapsedMs / FLIGHT_MS, elapsedMs };
  }

  if (elapsedMs < IMPACT_END_MS) {
    return {
      phase: "impact",
      progress: (elapsedMs - FLIGHT_MS) / (IMPACT_END_MS - FLIGHT_MS),
      elapsedMs
    };
  }

  if (elapsedMs < LINGER_END_MS) {
    return {
      phase: "linger",
      progress: (elapsedMs - IMPACT_END_MS) / (LINGER_END_MS - IMPACT_END_MS),
      elapsedMs
    };
  }

  return {
    phase: "fade",
    progress: (elapsedMs - LINGER_END_MS) / (FADE_END_MS - LINGER_END_MS),
    elapsedMs
  };
}

export function filterExpiredReactions<T extends Pick<RoomActiveReactionSnapshot, "expiresAt">>(
  reactions: readonly T[],
  nowMs = Date.now()
): T[] {
  return reactions.filter((reaction) => Date.parse(reaction.expiresAt) > nowMs);
}

export function getReactionPanelGeometry(input: {
  panelRect: RectLike;
  throwerSeatRect: RectLike;
  targetHeadRect: RectLike;
}): {
  start: Point;
  end: Point;
  control: Point;
} {
  const start = toPanelPoint(input.throwerSeatRect, input.panelRect, 0.5, 0.3);
  const end = toPanelPoint(input.targetHeadRect, input.panelRect, 0.5, 0.5);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const control = {
    x: Math.round(start.x + (end.x - start.x) * 0.52),
    y: Math.round(((start.y + end.y) / 2) - clamp((distance * 0.15) + 6, 56, 132))
  };

  return { start, end, control };
}

export function getQuadraticPoint(progress: number, geometry: {
  start: Point;
  control: Point;
  end: Point;
}): Point {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;

  return {
    x: (inverse * inverse * geometry.start.x) + (2 * inverse * t * geometry.control.x) + (t * t * geometry.end.x),
    y: (inverse * inverse * geometry.start.y) + (2 * inverse * t * geometry.control.y) + (t * t * geometry.end.y)
  };
}

function toPanelPoint(rect: RectLike, panelRect: RectLike, anchorX: number, anchorY: number): Point {
  return {
    x: Math.round((rect.left - panelRect.left) + rect.width * anchorX),
    y: Math.round((rect.top - panelRect.top) + rect.height * anchorY)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
