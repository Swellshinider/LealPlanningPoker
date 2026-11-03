import type { CSSProperties } from "react";
import type { RoomParticipantView } from "./roomView";

export type SeatStyle = CSSProperties & {
  "--seat-x": string;
  "--seat-y": string;
  "--seat-delay": string;
};

export interface SeatGeometry {
  style: SeatStyle;
  zoneClass: string;
  /** Where the seat sits on the table: centre (top/bottom), corner or side. */
  placementClass: string;
}

export function getSeatGeometry(index: number, total: number): SeatGeometry {
  const angle = total === 1 ? 90 : -90 + (360 / total) * index;
  const radians = (angle * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const zoneClass =
    normalizedAngle >= 45 && normalizedAngle <= 135
      ? "table-seat--lower"
      : normalizedAngle >= 225 && normalizedAngle <= 315
        ? "table-seat--upper"
        : normalizedAngle > 135 && normalizedAngle < 225
          ? "table-seat--left"
          : "table-seat--right";

  // Thresholds sit just under 0.5 so seats exactly at 30° or 60° land in the corner.
  const placement = Math.abs(y) < 0.49 ? "side" : Math.abs(x) < 0.49 ? "center" : "corner";
  // The card goes toward the table centre, so a seat on the left half puts it to its right.
  const inward = x < -0.01 ? "table-seat--inward-right" : x > 0.01 ? "table-seat--inward-left" : "";
  const placementClass = [`table-seat--${placement}`, placement === "center" ? "" : inward]
    .filter(Boolean)
    .join(" ");

  return {
    style: {
      "--seat-x": `${(x * 42).toFixed(3)}%`,
      "--seat-y": `${(y * 38).toFixed(3)}%`,
      "--seat-delay": `${index * 42}ms`,
    },
    zoneClass,
    placementClass,
  };
}

export function getPlayerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
      : (words[0] ?? "").slice(0, 2);

  return initials.toUpperCase() || "?";
}

export function getPlayerStatus(participant: RoomParticipantView): string {
  const status = participant.connected ? "online" : "offline";
  return participant.isHost ? `Host, ${status}` : status;
}
