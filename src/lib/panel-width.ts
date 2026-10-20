/** Width limits for the editor's form panel (the preview takes whatever is left). */
export const DEFAULT_LEFT_WIDTH = 440;
export const MIN_LEFT_WIDTH = 320;
export const MAX_LEFT_WIDTH = 720;
/** The preview never gets narrower than this, so small windows cap the form panel lower than MAX. */
export const MIN_PREVIEW_WIDTH = 420;

export const LEFT_WIDTH_STORAGE_KEY = "resume-builder:left-width";

/**
 * Clamps the form panel width. `available` is the horizontal space shared by the form
 * panel and the preview. If the window is too narrow for both minimums, the form panel
 * keeps its minimum and the preview scrolls.
 */
export function clampLeftWidth(width: number, available: number): number {
  const w = Number.isFinite(width) ? width : DEFAULT_LEFT_WIDTH;
  const max = Math.min(MAX_LEFT_WIDTH, available - MIN_PREVIEW_WIDTH);
  return Math.round(Math.max(MIN_LEFT_WIDTH, Math.min(w, max)));
}

export function readStoredLeftWidth(): number | null {
  try {
    const raw = localStorage.getItem(LEFT_WIDTH_STORAGE_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function storeLeftWidth(width: number) {
  try {
    localStorage.setItem(LEFT_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // storage unavailable; the width just isn't remembered
  }
}
