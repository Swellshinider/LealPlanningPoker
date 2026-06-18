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
    expect(markup).toContain("2026 LealPlanningPoker contributors");
    expect(markup).toContain("github.com/Swellshinider/LealPlanningPoker");
  });
});
