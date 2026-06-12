import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomBoard, type RoomBoardProps } from "./RoomBoard";

function createProps(): RoomBoardProps {
  return {
    viewModel: {
      roomId: "ROOM01",
      hostName: "Mina",
      story: "Improve onboarding",
      canVote: true,
      canReveal: false,
      canReset: false,
      canFinalize: false,
      canSetStory: false,
      isFinalized: false,
      participants: [],
      voteSummary: []
    },
    history: [],
    displayName: "Mina",
    storyDraft: "Improve onboarding",
    selectedVote: null,
    busy: false,
    onDisplayNameChange: () => undefined,
    onRename: () => undefined,
    onStoryChange: () => undefined,
    onSaveStory: () => undefined,
    onVote: () => undefined,
    onReveal: () => undefined,
    onReset: () => undefined,
    onFinalize: () => undefined,
    onCopyLink: () => undefined,
    onNewRoom: () => undefined
  };
}

describe("RoomBoard", () => {
  it("caps custom vote input length to the shared digit limit", () => {
    const markup = renderToStaticMarkup(createElement(RoomBoard, createProps()));

    expect(markup).toContain('maxLength="4"');
  });
});
