import { contactItems, isSectionVisible } from "../sections";
import { HeaderShell, SectionShell } from "../SectionShell";
import type { TemplateProps } from "../types";

/** Single column, centered header, accent-colored rules under section titles. */
export function Classic(props: TemplateProps) {
  const { header, sections } = props.content;
  const contacts = contactItems(header);
  return (
    <div className="t-classic">
      <HeaderShell className="r-header" {...props}>
        <h1 className="r-name">{[header.firstName, header.lastName].filter(Boolean).join(" ") || "Your Name"}</h1>
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
