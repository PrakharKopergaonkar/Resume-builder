import type { CSSProperties } from "react";
import { PAGE_MARGIN_MM, PAPER } from "@/lib/paper";
import type { FontId, ResumeStyle, TemplateId } from "@/types/resume";
import { Classic } from "./templates/Classic";
import { Modern } from "./templates/Modern";
import { Sidebar } from "./templates/Sidebar";
import type { RenderableResume, TemplateProps } from "./types";
import "./renderer.css";

export const TEMPLATES: Record<TemplateId, { label: string; Component: (p: TemplateProps) => React.ReactNode; twoColumn: boolean }> = {
  classic: { label: "Classic", Component: Classic, twoColumn: false },
  modern: { label: "Modern", Component: Modern, twoColumn: false },
  sidebar: { label: "Sidebar", Component: Sidebar, twoColumn: true },
};

export const FONTS: Record<FontId, { label: string; stack: string }> = {
  "source-sans": { label: "Source Sans 3", stack: "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif" },
  lato: { label: "Lato", stack: "'Lato', 'Helvetica Neue', Arial, sans-serif" },
  georgia: { label: "Georgia (serif)", stack: "Georgia, 'Times New Roman', serif" },
};

const FONT_SIZE_PT: Record<ResumeStyle["fontSize"], number> = { S: 9.5, M: 10.5, L: 11.5 };

function styleVars(style: ResumeStyle): CSSProperties {
  const paper = PAPER[style.paper];
  return {
    "--r-accent": style.accent,
    "--r-font": FONTS[style.font].stack,
    "--r-size": `${FONT_SIZE_PT[style.fontSize]}pt`,
    "--r-line": String(style.lineHeight),
    "--r-gap": String(style.sectionSpacing),
    "--r-page-w": `${paper.widthMm}mm`,
    "--r-page-h": `${paper.heightMm}mm`,
    "--r-margin-x": `${PAGE_MARGIN_MM.x}mm`,
    "--r-margin-y": `${PAGE_MARGIN_MM.y}mm`,
  } as CSSProperties;
}

/**
 * The one renderer behind the editor preview, the print/PDF page and thumbnails.
 * On screen it draws a paper sheet; in print media the sheet padding is replaced
 * by the @page margins (see PrintView).
 */
export function ResumeRenderer({
  resume,
  onSectionClick,
  activeSectionId,
}: {
  resume: RenderableResume;
  onSectionClick?: (id: string) => void;
  activeSectionId?: string | null;
}) {
  const { Component } = TEMPLATES[resume.templateId] ?? TEMPLATES.classic;
  return (
    <div className="resume-page" data-resume-page style={styleVars(resume.style)}>
      <Component content={resume.content} onSectionClick={onSectionClick} activeSectionId={activeSectionId} />
    </div>
  );
}
