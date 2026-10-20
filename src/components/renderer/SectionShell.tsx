import { SectionBody } from "./sections";
import type { SectionShellProps } from "./types";

/** One titled section; clickable in the editor preview so it opens that section's form. */
export function SectionShell({ section, compact, onSectionClick, activeSectionId }: SectionShellProps) {
  const interactive = Boolean(onSectionClick);
  return (
    <section
      className={`r-section${interactive ? " r-interactive" : ""}${activeSectionId === section.id ? " r-active" : ""}`}
      data-section-id={section.id}
      onClick={interactive ? () => onSectionClick?.(section.id) : undefined}
      title={interactive ? `Edit ${section.title}` : undefined}
    >
      <h2 className="r-section-title">{section.title}</h2>
      <div className="r-section-body">
        <SectionBody section={section} compact={compact} />
      </div>
    </section>
  );
}

/** The name/contact header is clickable too; "header" is its pseudo section id. */
export function HeaderShell({
  children,
  className,
  onSectionClick,
  activeSectionId,
}: {
  children: React.ReactNode;
  className?: string;
  onSectionClick?: (id: string) => void;
  activeSectionId?: string | null;
}) {
  const interactive = Boolean(onSectionClick);
  return (
    <header
      className={`${className ?? ""}${interactive ? " r-interactive" : ""}${activeSectionId === "header" ? " r-active" : ""}`}
      onClick={interactive ? () => onSectionClick?.("header") : undefined}
      title={interactive ? "Edit contact details" : undefined}
    >
      {children}
    </header>
  );
}
