import { describe, expect, it } from "vitest";
import { getPublicPage, HELP_PATH, HOME_PATH, ISSUES_URL, REPO_URL } from "./publicPages";

describe("publicPages", () => {
  it("classifies public pages from the pathname", () => {
    expect(getPublicPage(HOME_PATH)).toBe("home");
    expect(getPublicPage(HELP_PATH)).toBe("help");
    expect(getPublicPage("/something-else")).toBe("home");
  });

  it("exports the canonical repository links", () => {
    expect(REPO_URL).toBe("https://github.com/Swellshinider/LealPlanningPoker");
    expect(ISSUES_URL).toBe("https://github.com/Swellshinider/LealPlanningPoker/issues");
  });
});
