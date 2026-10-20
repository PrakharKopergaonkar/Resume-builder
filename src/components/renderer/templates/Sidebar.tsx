import { contactItems, isSectionVisible } from "../sections";
import { HeaderShell, SectionShell } from "../SectionShell";
import type { TemplateProps } from "../types";

/** Two columns: contact + column-0 sections on the left, column-1 sections on the right. */
export function Sidebar(props: TemplateProps) {
  const { header, sections } = props.content;
  const contacts = contactItems(header);
  const visible = sections.filter(isSectionVisible);
  return (
    <div className="t-sidebar">
      <HeaderShell className="r-header" {...props}>
        <h1 className="r-name">{[header.firstName, header.lastName].filter(Boolean).join(" ") || "Your Name"}</h1>
        {header.title && <div className="r-title">{header.title}</div>}
      </HeaderShell>
      <div className="r-columns">
        <aside className="r-col-left">
          {contacts.length > 0 && (
            <HeaderShell className="r-section r-contact-block" {...props}>
              <h2 className="r-section-title">Contact</h2>
              <ul className="r-contacts">
                {contacts.map((c) => (
                  <li key={c.key}>{c.href ? <a href={c.href}>{c.text}</a> : c.text}</li>
                ))}
              </ul>
            </HeaderShell>
          )}
          {visible
            .filter((s) => s.column === 0)
            .map((s) => (
              <SectionShell key={s.id} section={s} compact {...props} />
            ))}
        </aside>
        <div className="r-col-right">
          {visible
            .filter((s) => s.column !== 0)
            .map((s) => (
              <SectionShell key={s.id} section={s} {...props} />
            ))}
        </div>
      </div>
    </div>
  );
}
