import { contactItems, isSectionVisible } from "../sections";
import { HeaderShell, SectionShell } from "../SectionShell";
import type { TemplateProps } from "../types";

/** Left-aligned, large accent name, section titles in the margin column. */
export function Modern(props: TemplateProps) {
  const { header, sections } = props.content;
  const contacts = contactItems(header);
  return (
    <div className="t-modern">
      <HeaderShell className="r-header" {...props}>
        <h1 className="r-name">
          <span>{header.firstName || "Your"}</span> <strong>{header.lastName || "Name"}</strong>
        </h1>
        {header.title && <div className="r-title">{header.title}</div>}
        {contacts.length > 0 && (
          <div className="r-contacts">
            {contacts.map((c) => (
              <span key={c.key}>{c.href ? <a href={c.href}>{c.text}</a> : c.text}</span>
            ))}
          </div>
        )}
      </HeaderShell>
      {sections.filter(isSectionVisible).map((s) => (
        <SectionShell key={s.id} section={s} {...props} />
      ))}
    </div>
  );
}
