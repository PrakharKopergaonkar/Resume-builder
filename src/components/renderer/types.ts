import type { ResumeContent, ResumeStyle, Section, TemplateId } from "@/types/resume";

export type RenderableResume = { templateId: TemplateId; style: ResumeStyle; content: ResumeContent };

export type TemplateProps = {
  content: ResumeContent;
  /** Called when a section is clicked in the editor preview; absent when printing. */
  onSectionClick?: (sectionId: string) => void;
  activeSectionId?: string | null;
};

export type SectionShellProps = TemplateProps & { section: Section; compact?: boolean };
