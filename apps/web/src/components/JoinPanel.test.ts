import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JoinPanel, type JoinPanelProps } from "./JoinPanel";

function createProps(overrides: Partial<JoinPanelProps> = {}): JoinPanelProps {
  return {
    displayName: "Mina",
    roomCode: "ROOM01",
    theme: "dark",
    busy: false,
    onDisplayNameChange: () => undefined,
    onRoomCodeChange: () => undefined,
    onCreateRoom: () => undefined,
    onJoinRoom: () => undefined,
    onToggleTheme: () => undefined,
    ...overrides,
  };
}

describe("JoinPanel", () => {
  it("renders the theme toggle in the landing header", () => {
    const markup = renderToStaticMarkup(createElement(JoinPanel, createProps()));

    expect(markup).toContain('aria-label="Switch to light theme"');
    expect(markup).toContain('class="button button--quiet theme-toggle"');
  });
});
