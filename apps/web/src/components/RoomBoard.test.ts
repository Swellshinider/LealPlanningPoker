import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomBoard, type RoomBoardProps } from "./RoomBoard";

type Participant = RoomBoardProps["viewModel"]["participants"][number];

function createParticipant(index: number, overrides: Partial<Participant> = {}): Participant {
  return {
    id: `PLAYER_${index}`,
    name: `Player ${index}`,
    isHost: index === 1,
    isSelf: index === 1,
    connected: true,
    hasVoted: false,
    vote: null,
    visibleVote: null,
    tableVote: null,
    joinedAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
    ...overrides
  };
}

function createProps(viewModelOverrides: Partial<RoomBoardProps["viewModel"]> = {}): RoomBoardProps {
  return {
    viewModel: {
      roomId: "ROOM01",
      hostName: "Mina",
      story: "Improve onboarding",
      isHost: false,
      canVote: true,
      canReveal: false,
      canReset: false,
      canFinalize: false,
      canSetStory: false,
      isFinalized: false,
      participants: [],
      activeReactions: [],
      resultStats: null,
      voteSummary: [],
      ...viewModelOverrides
    },
    history: [],
    displayName: "Mina",
    storyDraft: "Improve onboarding",
    selectedVote: null,
    theme: "light",
    roomLink: "http://localhost:5173/?room=ROOM01",
    busy: false,
    onDisplayNameChange: () => undefined,
    onRename: () => undefined,
    onStoryChange: () => undefined,
    onSaveStory: () => undefined,
    onVote: () => undefined,
    onClearVote: () => undefined,
    onReveal: () => undefined,
    onReset: () => undefined,
    onFinalize: () => undefined,
    onThrowReaction: () => undefined,
    onCopyLink: () => undefined,
    onNewRoom: () => undefined,
    onToggleTheme: () => undefined
  };
}

describe("RoomBoard", () => {
  it("caps custom vote input length to the shared digit limit", () => {
    const markup = renderToStaticMarkup(createElement(RoomBoard, createProps()));

    expect(markup).toContain('maxLength="4"');
  });

  it("renders the theme toggle in the room header", () => {
    const markup = renderToStaticMarkup(createElement(RoomBoard, createProps()));

    expect(markup).toContain('aria-label="Switch to dark theme"');
    expect(markup).toContain('class="button button--quiet theme-toggle"');
  });

  it("hides the story panel for non-host viewers", () => {
    const markup = renderToStaticMarkup(createElement(RoomBoard, createProps()));

    expect(markup).not.toContain("Story / ticket");
    expect(markup).not.toContain("Set the next round");
    expect(markup).toContain("workspace-controls--profile-only");
  });

  it("keeps the story panel visible for hosts even when editing is locked", () => {
    const markup = renderToStaticMarkup(
      createElement(RoomBoard, createProps({ isHost: true, canSetStory: false }))
    );

    expect(markup).toContain("Story / ticket");
    expect(markup).toContain("Story locked");
  });

  it("renders participants as seated players around the table", () => {
    const markup = renderToStaticMarkup(
      createElement(
        RoomBoard,
        createProps({
          participants: [
            createParticipant(1, {
              name: "Mina Lead",
              hasVoted: true
            }),
            createParticipant(2, {
              name: "Ana Bell",
              hasVoted: true,
              vote: "5",
              visibleVote: "5",
              tableVote: "5"
            }),
            createParticipant(3, {
              name: "Kai",
              connected: false
            })
          ]
        })
      )
    );

    expect(markup).toContain("seat-ring");
    expect(markup).toContain("table-seat--ring");
    expect(markup).toContain("ML");
    expect(markup).toContain("Host, online");
    expect(markup).toContain("Player, offline");
    expect(markup).toContain("table-card--back");
    expect(markup).toContain("table-card--front");
    expect(markup).toContain(">5</span>");
  });

  it("moves participants beyond twelve into the overflow bench", () => {
    const participants = Array.from({ length: 14 }, (_, index) => createParticipant(index + 1));
    const markup = renderToStaticMarkup(createElement(RoomBoard, createProps({ participants })));

    expect(markup.match(/table-seat--ring/g)).toHaveLength(12);
    expect(markup.match(/table-seat--bench/g)).toHaveLength(2);
    expect(markup).toContain("2 overflow players");
  });

  it("renders round result stats after reveal", () => {
    const markup = renderToStaticMarkup(
      createElement(
        RoomBoard,
        createProps({
          resultStats: {
            average: 4.5,
            confidence: 67,
            numericVoteCount: 3,
            unknownVoteCount: 1
          }
        })
      )
    );

    expect(markup).toContain('aria-label="Round result"');
    expect(markup).toContain("Average");
    expect(markup).toContain(">4.5</strong>");
    expect(markup).toContain("Confidence");
    expect(markup).toContain(">67%</strong>");
    expect(markup.indexOf("LEAL")).toBeLessThan(markup.indexOf('aria-label="Round result"'));
    expect(markup.indexOf('aria-label="Round result"')).toBeLessThan(markup.indexOf("Planning Poker"));
  });

  it("renders Clear votes before Reveal in the split action row", () => {
    const markup = renderToStaticMarkup(
      createElement(
        RoomBoard,
        createProps({
          isHost: true,
          canReveal: true,
          canReset: true,
          canFinalize: true
        })
      )
    );

    expect(markup).toContain("Clear votes");
    expect(markup).toContain("Reveal votes");
    expect(markup.indexOf("Clear votes")).toBeLessThan(markup.indexOf("Reveal votes"));
    expect(markup).toContain("action-row--table-split");
  });

  it("shows reaction triggers only for connected non-self participants and renders the fixed emoji set", () => {
    const markup = renderToStaticMarkup(
      createElement(
        RoomBoard,
        createProps({
          participants: [
            createParticipant(1, { isHost: true, isSelf: true, name: "You" }),
            createParticipant(2, { isSelf: false, name: "Ana" }),
            createParticipant(3, { connected: false, isSelf: false, name: "Offline Kai" })
          ]
        })
      )
    );

    expect(markup.match(/data-reaction-trigger=/g)).toHaveLength(1);
    expect(markup).toContain("Throw a reaction at Ana");
    expect(markup).not.toContain("Throw a reaction at You");
    expect(markup).not.toContain("Throw a reaction at Offline Kai");
    expect(markup).toContain("👏");
    expect(markup).toContain("🔥");
    expect(markup).toContain("💯");
    expect(markup).toContain("🍅");
    expect(markup).toContain("👎");
    expect(markup).toContain("💀");
  });
});
