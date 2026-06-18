import { useCallback, useEffect, useState } from "react";
import {
  DARK_THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  getSystemTheme,
  getThemeToggleTarget,
  parseThemeMode,
  resolveThemeMode,
  type ThemeMode,
} from "../lib/theme";

export interface ThemeApi {
  theme: ThemeMode;
  toggleTheme: () => void;
}

function readStoredTheme(): ThemeMode | null {
  try {
    return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

function readSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return getSystemTheme(window.matchMedia(DARK_THEME_MEDIA_QUERY).matches);
}

// Owns the light/dark theme. The resolved theme mirrors the stored preference
// when set, otherwise it follows the OS preference via a media-query listener.
// `toggleTheme` writes the explicit choice, which also stops the listener.
export function useTheme(): ThemeApi {
  const [themePreference, setThemePreference] = useState<ThemeMode | null>(() => readStoredTheme());
  const [theme, setTheme] = useState<ThemeMode>(() =>
    resolveThemeMode(readStoredTheme(), readSystemTheme()),
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    if (
      themePreference ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_THEME_MEDIA_QUERY);
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setTheme(getSystemTheme(event.matches));
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [themePreference]);

  const toggleTheme = useCallback(() => {
    const nextTheme = getThemeToggleTarget(theme);
    setThemePreference(nextTheme);
    setTheme(nextTheme);
    writeStoredTheme(nextTheme);
  }, [theme]);

  return { theme, toggleTheme };
}
