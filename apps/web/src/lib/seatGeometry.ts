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

  return {
    style: {
      "--seat-x": `${(x * 42).toFixed(3)}%`,
      "--seat-y": `${(y * 38).toFixed(3)}%`,
      "--seat-delay": `${index * 42}ms`,
    },
    zoneClass,
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
