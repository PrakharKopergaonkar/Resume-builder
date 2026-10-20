import { useSyncExternalStore } from "react";
import { DARK_QUERY, resolveTheme, THEME_STORAGE_KEY, type Theme } from "./theme-shared";

/**
 * Client-side theme state. The source of truth is the `data-theme` attribute on <html>: the inline script in
 * the layout sets it before first paint, and everything below reads and updates it.
 */

const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((l) => l());
}

/** Applies and remembers a theme (the choice is stored only when the user makes one). */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable: the theme still applies for this page view
  }
  apply(theme);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia(DARK_QUERY);
  // Until the user picks a theme, follow OS changes live.
  const onMedia = () => {
    if (readStored() === null) apply(resolveTheme(null, media.matches));
  };
  // Keep other tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) apply(resolveTheme(readStored(), media.matches));
  };
  media.addEventListener("change", onMedia);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
