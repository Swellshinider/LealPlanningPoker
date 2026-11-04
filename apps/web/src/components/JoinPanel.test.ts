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

  it("renders the simplified landing page with shared branding and footer metadata", () => {
    const markup = renderToStaticMarkup(createElement(JoinPanel, createProps()));

    expect(markup).toContain('src="/branding/logo-header-light.png"');
    expect(markup).toContain('src="/branding/logo-header-dark.png"');
    expect(markup).toContain('alt=""');
    expect(markup).toContain('href="/help"');
    expect(markup).toContain(">Help</a>");
    expect(markup).not.toContain("How it works");
    expect(markup).not.toContain("Three quick steps");
    expect(markup).not.toContain(
      "Run focused estimation sessions without adding process overhead.",
    );
    expect(markup).toContain("Eduardo Leal");
    expect(markup).toContain("© 2026 LealPlanningPoker");
    expect(markup).not.toContain("github.com");
  });

  it("asks for a display name in both the create and join cards", () => {
    const markup = renderToStaticMarkup(createElement(JoinPanel, createProps()));

    expect(markup.match(/Display name/g)).toHaveLength(2);
    expect(markup).toContain("Create room");
  });

  it("shows only the join form when opened from an invite link", () => {
    const markup = renderToStaticMarkup(createElement(JoinPanel, createProps({ invited: true })));

    expect(markup).toContain("You&#x27;re invited to room ROOM01");
    expect(markup).toContain("Join room");
    expect(markup).toContain("Create a new room instead");
    expect(markup).not.toContain(">Create room<");
    expect(markup).not.toContain("Room code");
  });

  it("links to the donation pages without exposing a Pix key", () => {
    const markup = renderToStaticMarkup(createElement(JoinPanel, createProps()));

    expect(markup).toContain('href="https://ko-fi.com/swellshinider"');
    expect(markup).toContain('href="https://livepix.gg/swellshinider"');
  });
});
