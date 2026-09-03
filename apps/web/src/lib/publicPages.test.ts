import { describe, expect, it } from "vitest";
import { COPYRIGHT_LABEL, getPublicPage, HELP_PATH, HOME_PATH, SUPPORT_EMAIL } from "./publicPages";

describe("publicPages", () => {
  it("classifies public pages from the pathname", () => {
    expect(getPublicPage(HOME_PATH)).toBe("home");
    expect(getPublicPage(HELP_PATH)).toBe("help");
    expect(getPublicPage("/something-else")).toBe("home");
  });

  it("exports the support contact and copyright label", () => {
    expect(SUPPORT_EMAIL).toBe("eduardoleal.contact@gmail.com");
    expect(COPYRIGHT_LABEL).toBe("© 2026 LealPlanningPoker");
  });
});
