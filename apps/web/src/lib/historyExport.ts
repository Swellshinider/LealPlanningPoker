import type { RoomHistoryEntry } from "@lealplanningpoker/shared";
import { formatVoteLabel } from "./uiText";

const CSV_HEADER = ["RoundId", "Story", "FinalizedAt", "ParticipantId", "ParticipantName", "Vote"];

function escapeCsvField(value: string): string {
  if (value === "") {
    return "";
  }
  const needsQuoting = /[",\r\n]/.test(value);
  if (!needsQuoting) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Converts finalized voting history into a long-format CSV (one row per
 * participant per round). History is expected in chronological order
 * (oldest first), as stored in the room snapshot.
 */
export function historyToCsv(history: RoomHistoryEntry[]): string {
  const rows: string[] = [CSV_HEADER.join(",")];

  for (const entry of history) {
    const story = escapeCsvField(entry.story ?? "");
    for (const vote of entry.votes) {
      const name = escapeCsvField(vote.name ?? "");
      const voteLabel = vote.vote ? escapeCsvField(formatVoteLabel(vote.vote)) : "";
      rows.push(
        [
          escapeCsvField(entry.id),
          story,
          escapeCsvField(entry.finalizedAt),
          escapeCsvField(vote.participantId),
          name,
          voteLabel
        ].join(",")
      );
    }
  }

  // Prepend UTF-8 BOM so spreadsheet apps (notably Excel) decode special
  // vote labels like "coffee" / "?" / non-ASCII story titles correctly.
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildHistoryFilename(roomId: string, ext: "csv"): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `planning-poker-history-${roomId}-${stamp}.${ext}`;
}
