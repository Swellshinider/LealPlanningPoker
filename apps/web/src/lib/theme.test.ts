import { describe, expect, it } from "vitest";
import { getSystemTheme, getThemeToggleTarget, parseThemeMode, resolveThemeMode } from "./theme";

describe("theme", () => {
  it("accepts only supported stored theme values", () => {
    expect(parseThemeMode("light")).toBe("light");
    expect(parseThemeMode("dark")).toBe("dark");
    expect(parseThemeMode("black")).toBeNull();
    expect(parseThemeMode(null)).toBeNull();
  });

  it("falls back to the system theme when storage is missing or invalid", () => {
    expect(resolveThemeMode(null, "dark")).toBe("dark");
    expect(resolveThemeMode("unknown", "light")).toBe("light");
  });

  it("uses a valid stored theme over the system theme", () => {
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
  });

  it("resolves system preference from a dark media query match", () => {
    expect(getSystemTheme(true)).toBe("dark");
    expect(getSystemTheme(false)).toBe("light");
  });

  it("flips the theme toggle target", () => {
    expect(getThemeToggleTarget("light")).toBe("dark");
    expect(getThemeToggleTarget("dark")).toBe("light");
  });
});
