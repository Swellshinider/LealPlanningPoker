import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ThemeMode } from "../lib/theme";
import { HelpPage } from "./HelpPage";

describe("HelpPage", () => {
  it("renders step-by-step usage guidance and support links", () => {
    const markup = renderToStaticMarkup(
      createElement(HelpPage, {
        theme: "dark" satisfies ThemeMode,
        onToggleTheme: () => undefined,
      }),
    );

    expect(markup).toContain('src="/branding/logo-header-light.png"');
    expect(markup).toContain('src="/branding/logo-header-dark.png"');
    expect(markup).toContain(">Home</a>");
    expect(markup).not.toContain("How to run a planning poker session from start to finish.");
    expect(markup).toContain("Create a room");
    expect(markup).toContain("Share the room code or link");
    expect(markup).toContain("Vote privately");
    expect(markup).toContain("Finalize the round");
    expect(markup).toContain("mailto:eduardoleal.contact@gmail.com");
    expect(markup).not.toContain("github.com");
    expect(markup).toContain("bug");
    expect(markup).toContain("Support the project");
    expect(markup).toContain('href="https://ko-fi.com/swellshinider"');
    expect(markup).toContain('href="https://livepix.gg/swellshinider"');
    expect(markup).not.toContain("wait for the host");
  });
});
