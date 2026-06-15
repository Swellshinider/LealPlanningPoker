import { describe, expect, it } from "vitest";
import type { RoomHistoryEntry } from "@lealplanningpoker/shared";
import { buildHistoryFilename, historyToCsv } from "./historyExport";

function createEntry(overrides: Partial<RoomHistoryEntry> = {}): RoomHistoryEntry {
  return {
    id: "ROUND01",
    story: "Improve onboarding",
    finalizedAt: "2026-06-11T12:00:00.000Z",
    voteSummary: [],
    votes: [
      { participantId: "P1", name: "Mina", vote: "5" },
      { participantId: "P2", name: "Ana", vote: "8" }
    ],
    ...overrides
  };
}

describe("historyToCsv", () => {
  it("emits the header plus one row per participant per round", () => {
    const csv = historyToCsv([createEntry()]);

    const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter((line) => line.length > 0);
    expect(lines[0]).toBe("RoundId,Story,FinalizedAt,ParticipantId,ParticipantName,Vote");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("ROUND01,Improve onboarding,2026-06-11T12:00:00.000Z,P1,Mina,5");
    expect(lines[2]).toBe("ROUND01,Improve onboarding,2026-06-11T12:00:00.000Z,P2,Ana,8");
  });

  it("escapes a story containing a comma by quoting", () => {
    const csv = historyToCsv([
      createEntry({ story: "Sprint 1, retrospective" })
    ]);

    const storyCell = csv.split("\r\n")[1]?.split(",")[1];
    expect(storyCell).toBe('"Sprint 1');
    expect(csv).toContain('"Sprint 1, retrospective"');
  });

  it("doubles internal quotes when quoting", () => {
    const csv = historyToCsv([
      createEntry({ story: 'The "boss" story' })
    ]);

    expect(csv).toContain('"The ""boss"" story"');
  });

  it("quotes values containing newlines", () => {
    const csv = historyToCsv([
      createEntry({ story: "Multi\nline\nstory" })
    ]);

    expect(csv).toContain('"Multi\nline\nstory"');
  });

  it("emits an empty vote cell when a participant abstained", () => {
    const csv = historyToCsv([
      createEntry({
        votes: [{ participantId: "P1", name: "Mina", vote: null }]
      })
    ]);

    const row = csv.split("\r\n")[1];
    expect(row).toMatch(/,$/);
    expect(row).toBe("ROUND01,Improve onboarding,2026-06-11T12:00:00.000Z,P1,Mina,");
  });

  it("renders coffee and question mark vote labels via formatVoteLabel", () => {
    const csv = historyToCsv([
      createEntry({
        votes: [
          { participantId: "P1", name: "Mina", vote: "coffee" },
          { participantId: "P2", name: "Ana", vote: "?" }
        ]
      })
    ]);

    expect(csv).toContain(",☕\r\n");
    expect(csv).toContain(",?\r\n");
  });

  it("emits rounds in chronological order (oldest first)", () => {
    const csv = historyToCsv([
      createEntry({ id: "ROUND01", story: "First" }),
      createEntry({ id: "ROUND02", story: "Second" })
    ]);

    expect(csv.indexOf("ROUND01")).toBeLessThan(csv.indexOf("ROUND02"));
    expect(csv.indexOf("First")).toBeLessThan(csv.indexOf("Second"));
  });

  it("prepends a UTF-8 BOM for spreadsheet compatibility", () => {
    const csv = historyToCsv([createEntry()]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});

describe("buildHistoryFilename", () => {
  it("produces a deterministic extension and includes the room id", () => {
    const filename = buildHistoryFilename("ROOM42", "csv");
    expect(filename.startsWith("planning-poker-history-ROOM42-")).toBe(true);
    expect(filename.endsWith(".csv")).toBe(true);
  });

  it("uses an ISO timestamp with filesystem-safe separators", () => {
    const filename = buildHistoryFilename("ROOM42", "csv");
    const stamp = filename.replace("planning-poker-history-ROOM42-", "").replace(/\.csv$/, "");
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
  });
});
