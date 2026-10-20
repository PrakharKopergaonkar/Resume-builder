import type { ResumeStyle } from "@/types/resume";

const MM_TO_PX = 96 / 25.4;

/** Page sizes and margins shared by the on-screen sheet and the printed @page rule. */
export const PAGE_MARGIN_MM = { x: 14, y: 12 };

export const PAPER: Record<ResumeStyle["paper"], { css: string; widthMm: number; heightMm: number; widthPx: number; heightPx: number }> = {
  A4: { css: "A4", widthMm: 210, heightMm: 297, widthPx: 210 * MM_TO_PX, heightPx: 297 * MM_TO_PX },
  LETTER: { css: "letter", widthMm: 215.9, heightMm: 279.4, widthPx: 215.9 * MM_TO_PX, heightPx: 279.4 * MM_TO_PX },
};

/** Height of the printable area of one page, in CSS px. */
export const contentHeightPx = (paper: ResumeStyle["paper"]) => PAPER[paper].heightPx - 2 * PAGE_MARGIN_MM.y * MM_TO_PX;
export const marginYPx = PAGE_MARGIN_MM.y * MM_TO_PX;
