export const HOME_PATH = "/";
export const HELP_PATH = "/help";
export const REPO_URL = "https://github.com/Swellshinider/LealPlanningPoker";
export const ISSUES_URL = `${REPO_URL}/issues`;
export const AUTHOR_NAME = "Eduardo Leal";
export const COPYRIGHT_LABEL = "\u00A9 2026 LealPlanningPoker contributors";

export type PublicPage = "home" | "help";

export function getPublicPage(pathname: string): PublicPage {
  return pathname === HELP_PATH ? "help" : "home";
}
