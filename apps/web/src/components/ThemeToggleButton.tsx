import { getThemeToggleTarget, type ThemeMode } from "../lib/theme";
import { MoonIcon, SunIcon } from "./icons";

export interface ThemeToggleButtonProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function ThemeToggleButton({ theme, onToggleTheme }: ThemeToggleButtonProps) {
  const nextTheme = getThemeToggleTarget(theme);
  const label = nextTheme === "dark" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      aria-label={label}
      className="button button--quiet theme-toggle"
      title={label}
      type="button"
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
