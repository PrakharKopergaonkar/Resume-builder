import { hasText } from "@/components/renderer/format";
import type { CertificationItem, ResumeContent, Section } from "@/types/resume";

/** "2024" → { year: "2024", month: 0 }; "2024-03" → { year: "2024", month: 3 }; anything else → empty. */
function parseDate(value: string): { year: string; month: number } {
  const m = /^(\d{4})(?:-(\d{1,2}))?$/.exec(value.trim());
  if (!m) return { year: "", month: 0 };
  const month = Number(m[2] ?? 0);
  return { year: m[1], month: month >= 1 && month <= 12 ? month : 0 };
}

/**
 * Brings stored content up to the current shape. Resumes created before the dedicated
 * certifications section kept certifications in a generic "custom" section; convert those
 * when nothing would be lost (no description text).
 */
export function migrateContent(content: ResumeContent): ResumeContent {
  let changed = false;
  const sections = content.sections.map((s): Section => {
    if (s.type !== "custom" || s.title.trim().toLowerCase() !== "certifications") return s;
    if (s.items.some((i) => hasText(i.html))) return s;
    changed = true;
    return {
      id: s.id,
      type: "certifications",
      title: s.title,
      hidden: s.hidden,
      column: s.column,
      items: s.items.map((i): CertificationItem => {
        const issued = parseDate(i.date);
        return {
          id: i.id,
          name: i.heading,
          issuer: "",
          issueMonth: issued.month,
          issueYear: issued.year,
          expiryMonth: 0,
          expiryYear: "",
          credentialId: "",
          credentialUrl: "",
        };
      }),
    };
  });
  return changed ? { ...content, sections } : content;
}
