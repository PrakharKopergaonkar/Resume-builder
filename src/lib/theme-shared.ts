// React-free theme helpers, safe to import from server components (the root layout) as well as the client hook.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "resume-builder:theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** A stored choice wins; with none (or garbage), follow the OS setting. */
export function resolveTheme(stored: string | null | undefined, systemPrefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Inline script for <head>: runs before first paint so there is no flash of the wrong theme. It mirrors
 * resolveTheme(), and forces light on /print/ pages so PDFs and thumbnails never depend on the user's theme.
 */
export const THEME_INIT_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light"}if(location.pathname.indexOf("/print/")===0)t="light";document.documentElement.setAttribute("data-theme",t)})()`;
