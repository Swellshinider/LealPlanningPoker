export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "lpp.theme";
export const DARK_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemeMode(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

export function getSystemTheme(prefersDark: boolean): ThemeMode {
  return prefersDark ? "dark" : "light";
}

export function resolveThemeMode(storedTheme: string | null, systemTheme: ThemeMode): ThemeMode {
  return parseThemeMode(storedTheme) ?? systemTheme;
}

export function getThemeToggleTarget(theme: ThemeMode): ThemeMode {
  return theme === "dark" ? "light" : "dark";
}
