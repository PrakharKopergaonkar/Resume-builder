import type { CertificationItem, ResumeHeader, Section } from "@/types/resume";
import { formatMonthYear, formatRange, hasText, joinParts, normalizeUrl } from "./format";

/** Rich text is sanitized on write by the API (src/lib/resumes.ts). */
function Html({ html, className }: { html: string; className?: string }) {
  if (!hasText(html)) return null;
  return <div className={`r-rich ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Hidden sections and sections with nothing filled in are left out of the page. */
export function isSectionVisible(s: Section): boolean {
  if (s.hidden) return false;
  switch (s.type) {
    case "summary":
      return hasText(s.html);
    case "experience":
      return s.items.some((i) => i.title || i.company || hasText(i.html));
    case "education":
      return s.items.some((i) => i.school || i.degree || i.field);
    case "skills":
      return s.items.some((i) => i.name.trim());
    case "custom":
      return s.items.some((i) => i.heading || hasText(i.html));
    case "certifications":
      return s.items.some((i) => i.name.trim());
  }
}

/** "Issued Mar 2024 · Expires Mar 2027"; "No expiration" only when an issue date is known. */
export function certificationDates(i: CertificationItem): string {
  const issued = formatMonthYear(i.issueMonth, i.issueYear);
  const expires = formatMonthYear(i.expiryMonth, i.expiryYear);
  if (issued && expires) return `Issued ${issued} · Expires ${expires}`;
  if (issued) return `Issued ${issued} · No expiration`;
  return expires ? `Expires ${expires}` : "";
}

function SkillLevel({ level }: { level: number }) {
  if (!level) return null;
  return (
    <span className="r-level" aria-label={`${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= level ? "on" : ""} />
      ))}
    </span>
  );
}

export function SectionBody({ section, compact }: { section: Section; compact?: boolean }) {
  switch (section.type) {
    case "summary":
      return <Html html={section.html} />;

    case "experience":
      return (
        <>
          {section.items
            .filter((i) => i.title || i.company || hasText(i.html))
            .map((i) => (
              <div key={i.id} className="r-entry">
                <div className="r-entry-head">
                  <div>
                    <span className="r-entry-title">{i.title}</span>
                    {i.company && <span className="r-entry-org">{i.title ? ` · ${i.company}` : i.company}</span>}
                  </div>
                  <div className="r-entry-meta">{formatRange(i.start, i.end, i.current)}</div>
                </div>
                {(i.city || i.country) && <div className="r-entry-sub">{joinParts(i.city, i.country)}</div>}
                <Html html={i.html} />
              </div>
            ))}
        </>
      );

    case "education":
      return (
        <>
          {section.items
            .filter((i) => i.school || i.degree || i.field)
            .map((i) => (
              <div key={i.id} className="r-entry">
                <div className="r-entry-head">
                  <div>
                    <span className="r-entry-title">{joinParts(i.degree, i.field)}</span>
                  </div>
                  <div className="r-entry-meta">{i.gradYear}</div>
                </div>
                <div className="r-entry-sub">{joinParts(i.school, i.city)}</div>
                <Html html={i.html} />
              </div>
            ))}
        </>
      );

    case "skills": {
      const items = section.items.filter((i) => i.name.trim());
      const anyLevel = items.some((i) => i.level > 0);
      return (
        <ul className={`r-skills ${compact || anyLevel ? "r-skills-list" : "r-skills-grid"}`}>
          {items.map((i) => (
            <li key={i.id}>
              <span>{i.name}</span>
              <SkillLevel level={i.level} />
            </li>
          ))}
        </ul>
      );
    }

    case "certifications":
      return (
        <>
          {section.items
            .filter((i) => i.name.trim())
            .map((i) => {
              const dates = certificationDates(i);
              const url = normalizeUrl(i.credentialUrl);
              return (
                <div key={i.id} className="r-entry">
                  <div className="r-entry-head">
                    <div>
                      <span className="r-entry-title">{i.name}</span>
                      {i.issuer && <span className="r-entry-org"> · {i.issuer}</span>}
                    </div>
                    {dates && <div className="r-entry-meta">{dates}</div>}
                  </div>
                  {(i.credentialId || url) && (
                    <div className="r-entry-sub">
                      {i.credentialId && <span>Credential ID {i.credentialId}</span>}
                      {i.credentialId && url && " · "}
                      {url && (
                        <a className="r-cred-link" href={url} target="_blank" rel="noreferrer">
                          Show credential
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </>
      );

    case "custom":
      return (
        <>
          {section.items
            .filter((i) => i.heading || hasText(i.html))
            .map((i) => (
              <div key={i.id} className="r-entry">
                {(i.heading || i.date) && (
                  <div className="r-entry-head">
                    <div className="r-entry-title">{i.heading}</div>
                    <div className="r-entry-meta">{i.date}</div>
                  </div>
                )}
                <Html html={i.html} />
              </div>
            ))}
        </>
      );
  }
}

export function contactItems(h: ResumeHeader): { key: string; text: string; href?: string }[] {
  const items: { key: string; text: string; href?: string }[] = [];
  if (h.email) items.push({ key: "email", text: h.email, href: `mailto:${h.email}` });
  if (h.phone) items.push({ key: "phone", text: h.phone });
  const place = joinParts(h.city, h.country);
  if (place) items.push({ key: "place", text: place });
  for (const l of h.links) {
    if (!l.url && !l.label) continue;
    const href = l.url && !/^https?:\/\//i.test(l.url) ? `https://${l.url}` : l.url;
    items.push({ key: l.id, text: l.label || l.url.replace(/^https?:\/\//i, ""), href: href || undefined });
  }
  return items;
}
