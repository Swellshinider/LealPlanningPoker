import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoomBoard, type RoomBoardProps } from "./RoomBoard";

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
      voteSummary: [],
      ...viewModelOverrides
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
});
