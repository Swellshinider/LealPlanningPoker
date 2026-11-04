export const HOME_PATH = "/";
export const HELP_PATH = "/help";
export const SUPPORT_EMAIL = "eduardoleal.contact@gmail.com";
export const KOFI_URL = "https://ko-fi.com/swellshinider";
export const LIVEPIX_URL = "https://livepix.gg/swellshinider";
export const AUTHOR_NAME = "Eduardo Leal";
export const COPYRIGHT_LABEL = "\u00A9 2026 LealPlanningPoker";

export type PublicPage = "home" | "help";

export function getPublicPage(pathname: string): PublicPage {
  return pathname === HELP_PATH ? "help" : "home";
}
