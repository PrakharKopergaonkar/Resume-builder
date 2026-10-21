import { z } from "zod";
import { formatMonthYear, joinParts, normalizeUrl } from "@/components/renderer/format";
import { isSectionVisible } from "@/components/renderer/sections";
import { newId } from "@/lib/defaults";
import { htmlToBlocks } from "@/lib/richtext";
import type { ResumeContent, ResumeDoc, Section } from "@/types/resume";

/**
 * Our resumes <-> JSON Resume (https://jsonresume.org, schema v1.0.0).
 * The standard has no place for design settings or arbitrary custom sections; those are reported, not dropped silently.
 */

export const JSON_RESUME_SCHEMA_URL = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

const SKILL_LEVELS = ["", "Beginner", "Elementary", "Intermediate", "Advanced", "Expert"];
const FLUENCY = ["", "Elementary", "Limited working proficiency", "Professional working proficiency", "Full professional proficiency", "Native or bilingual"];

/** Free-text level/fluency ("Master", "Native speaker", "Fluent") -> 0–5. */
function levelFromText(text: string | undefined): number {
  const t = (text ?? "").toLowerCase();
  if (!t) return 0;
  if (/native|bilingual|master|expert/.test(t)) return 5;
  if (/full|fluent|advanced/.test(t)) return 4;
  if (/professional|intermediate|working|conversational/.test(t)) return 3;
  if (/limited|elementary|basic/.test(t)) return 2;
  if (/beginner|novice/.test(t)) return 1;
  return 0;
}

/** Rich text -> a plain summary (paragraphs) and highlights (list items), as JSON Resume expects. */
function splitRichText(html: string): { summary: string; highlights: string[] } {
  const text = (runs: ReturnType<typeof htmlToBlocks>[number]["runs"]) => runs.map((r) => ("text" in r ? r.text : "\n")).join("").trim();
  const blocks = htmlToBlocks(html, () => 0);
  return {
    summary: blocks.filter((b) => !b.list).map((b) => text(b.runs)).filter(Boolean).join("\n"),
    highlights: blocks.filter((b) => b.list).map((b) => text(b.runs)).filter(Boolean),
  };
}

const ISO_DATE = /^([1-2]\d{3}-[0-1]\d-[0-3]\d|[1-2]\d{3}-[0-1]\d|[1-2]\d{3})$/;
const isoOrUndefined = (v: string) => (ISO_DATE.test(v.trim()) ? v.trim() : undefined);
const nonEmpty = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))) as Partial<T>;

const titled = (s: Section, name: string) => s.title.trim().toLowerCase() === name;

export type JsonResumeExport = { resume: Record<string, unknown>; skippedSections: string[] };

export function toJsonResume(doc: ResumeDoc): JsonResumeExport {
  const { header, sections } = doc.content;
  const visible = sections.filter(isSectionVisible);
  const skippedSections: string[] = [];
  const out: Record<string, unknown[]> = {};
  const push = (key: string, items: unknown[]) => (out[key] = [...(out[key] ?? []), ...items]);
  let summary = "";

  for (const s of visible) {
    switch (s.type) {
      case "summary":
        summary = [summary, splitRichText(s.html).summary, ...splitRichText(s.html).highlights].filter(Boolean).join("\n");
        break;
      case "experience":
        push(
          "work",
          s.items.map((i) => {
            const rich = splitRichText(i.html);
            return nonEmpty({
              name: i.company,
              position: i.title,
              location: joinParts(i.city, i.country),
              startDate: isoOrUndefined(i.start),
              endDate: i.current ? undefined : isoOrUndefined(i.end),
              summary: rich.summary,
              highlights: rich.highlights,
            });
          }),
        );
        break;
      case "education":
        push(
          "education",
          s.items.map((i) => {
            const rich = splitRichText(i.html);
            return nonEmpty({ institution: i.school, studyType: i.degree, area: i.field, endDate: isoOrUndefined(i.gradYear), courses: rich.highlights, score: undefined });
          }),
        );
        break;
      case "skills": {
        const items = s.items.filter((i) => i.name.trim());
        if (titled(s, "languages")) push("languages", items.map((i) => nonEmpty({ language: i.name, fluency: FLUENCY[i.level] })));
        else if (titled(s, "interests")) push("interests", items.map((i) => ({ name: i.name })));
        else push("skills", items.map((i) => nonEmpty({ name: i.name, level: SKILL_LEVELS[i.level] })));
        break;
      }
      case "certifications":
        push(
          "certificates",
          s.items
            .filter((i) => i.name.trim())
            .map((i) =>
              nonEmpty({
                name: i.name,
                issuer: i.issuer,
                date: i.issueYear ? (i.issueMonth ? `${i.issueYear}-${String(i.issueMonth).padStart(2, "0")}` : i.issueYear) : undefined,
                url: normalizeUrl(i.credentialUrl),
              }),
            ),
        );
        break;
      case "custom":
        if (titled(s, "projects")) {
          push(
            "projects",
            s.items.map((i) => {
              const rich = splitRichText(i.html);
              return nonEmpty({ name: i.heading, description: rich.summary, highlights: rich.highlights, startDate: isoOrUndefined(i.date) });
            }),
          );
        } else if (titled(s, "awards")) {
          push("awards", s.items.map((i) => nonEmpty({ title: i.heading, date: isoOrUndefined(i.date), summary: splitRichText(i.html).summary })));
        } else {
          skippedSections.push(s.title);
        }
        break;
    }
  }

  const country = header.country.trim();
  const basics = nonEmpty({
    name: [header.firstName, header.lastName].filter(Boolean).join(" "),
    label: header.title,
    email: header.email,
    phone: header.phone,
    summary,
    location: nonEmpty({ city: header.city, ...(/^[A-Z]{2}$/.test(country) ? { countryCode: country } : { region: country }) }),
    profiles: header.links.filter((l) => l.url || l.label).map((l) => nonEmpty({ network: l.label, url: normalizeUrl(l.url) })),
  });
  if (basics.location && !Object.keys(basics.location).length) delete basics.location;

  const resume = {
    $schema: JSON_RESUME_SCHEMA_URL,
    basics,
    ...out,
    meta: nonEmpty({
      version: "v1.0.0",
      lastModified: doc.updatedAt || undefined,
      ...(skippedSections.length ? { "x-resume-builder-skipped-sections": skippedSections } : {}),
    }),
  };
  return { resume, skippedSections };
}

// ---------------------------------------------------------------------------------------------------------- import

const str = z.preprocess((v) => (v == null ? undefined : typeof v === "number" ? String(v) : v), z.string().optional());
const strArray = z.array(z.preprocess((v) => (v == null ? "" : String(v)), z.string())).optional();

/** Loose by design (real-world files vary); only the fields we use, all optional. */
const jsonResumeSchema = z.looseObject({
  basics: z
    .looseObject({
      name: str,
      label: str,
      email: str,
      phone: str,
      url: str,
      summary: str,
      location: z.looseObject({ city: str, countryCode: str, region: str }).optional(),
      profiles: z.array(z.looseObject({ network: str, url: str, username: str })).optional(),
    })
    .optional(),
  work: z.array(z.looseObject({ name: str, position: str, location: str, startDate: str, endDate: str, summary: str, description: str, highlights: strArray })).optional(),
  education: z.array(z.looseObject({ institution: str, studyType: str, area: str, startDate: str, endDate: str, courses: strArray })).optional(),
  skills: z.array(z.looseObject({ name: str, level: str, keywords: strArray })).optional(),
  languages: z.array(z.looseObject({ language: str, fluency: str })).optional(),
  interests: z.array(z.looseObject({ name: str, keywords: strArray })).optional(),
  certificates: z.array(z.looseObject({ name: str, issuer: str, date: str, url: str })).optional(),
  projects: z.array(z.looseObject({ name: str, description: str, highlights: strArray, startDate: str, endDate: str, url: str })).optional(),
  awards: z.array(z.looseObject({ title: str, date: str, awarder: str, summary: str })).optional(),
  volunteer: z.array(z.unknown()).optional(),
  publications: z.array(z.unknown()).optional(),
  references: z.array(z.unknown()).optional(),
});

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = (text = "") => text.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
const bullets = (items: string[] = []) => {
  const li = items.map((h) => h.trim()).filter(Boolean);
  return li.length ? `<ul>${li.map((h) => `<li><p>${escapeHtml(h)}</p></li>`).join("")}</ul>` : "";
};
/** "2023-07-01" / "2023-07" -> "2023-07"; "2023" -> "2023"; anything else -> "". */
const toMonth = (d?: string) => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : d && /^\d{4}$/.test(d) ? d : "");
const toYear = (d?: string) => (d && /^\d{4}/.test(d) ? d.slice(0, 4) : "");

export type JsonResumeImport =
  | { ok: true; content: ResumeContent; imported: string[]; skipped: string[] }
  | { ok: false; error: string };

export function fromJsonResume(input: unknown): JsonResumeImport {
  const parsed = jsonResumeSchema.safeParse(input);
  const looksLikeJsonResume =
    parsed.success && ["basics", "work", "education", "skills", "projects"].some((k) => (parsed.data as Record<string, unknown>)[k] !== undefined);
  if (!parsed.success || !looksLikeJsonResume) {
    return { ok: false, error: "This doesn't look like a JSON Resume file (expected fields like basics, work and education)." };
  }
  const r = parsed.data;
  const b = r.basics ?? {};
  const [firstName = "", ...rest] = (b.name ?? "").trim().split(/\s+/);
  const sections: Section[] = [];
  const imported: string[] = [];
  const add = (s: Section, label: string) => {
    sections.push(s);
    imported.push(label);
  };
  const base = (title: string, column: 0 | 1) => ({ id: newId(), title, hidden: false, column });

  if (b.summary?.trim()) add({ ...base("Summary", 1), type: "summary", html: paragraphs(b.summary) }, "Summary");
  if (r.work?.length) {
    add(
      {
        ...base("Work History", 1),
        type: "experience",
        items: r.work.map((w) => {
          const [city = "", ...country] = (w.location ?? "").split(",").map((x) => x.trim());
          return {
            id: newId(),
            title: w.position ?? "",
            company: w.name ?? "",
            city,
            country: country.join(", "),
            start: toMonth(w.startDate),
            end: toMonth(w.endDate),
            current: !w.endDate,
            html: paragraphs(w.summary ?? w.description) + bullets(w.highlights),
          };
        }),
      },
      "Work History",
    );
  }
  if (r.education?.length) {
    add(
      {
        ...base("Education", 1),
        type: "education",
        items: r.education.map((e) => ({
          id: newId(),
          school: e.institution ?? "",
          degree: e.studyType ?? "",
          field: e.area ?? "",
          city: "",
          gradYear: toYear(e.endDate),
          html: bullets(e.courses),
        })),
      },
      "Education",
    );
  }
  if (r.skills?.length) {
    add(
      {
        ...base("Skills", 0),
        type: "skills",
        items: r.skills.map((s) => ({
          id: newId(),
          name: s.keywords?.length ? `${s.name ?? ""}: ${s.keywords.join(", ")}`.replace(/^: /, "") : (s.name ?? ""),
          level: levelFromText(s.level),
        })),
      },
      "Skills",
    );
  }
  if (r.languages?.length) {
    add({ ...base("Languages", 0), type: "skills", items: r.languages.map((l) => ({ id: newId(), name: l.language ?? "", level: levelFromText(l.fluency) })) }, "Languages");
  }
  if (r.interests?.length) {
    add({ ...base("Interests", 0), type: "skills", items: r.interests.map((i) => ({ id: newId(), name: i.name ?? "", level: 0 })) }, "Interests");
  }
  if (r.certificates?.length) {
    add(
      {
        ...base("Certifications", 1),
        type: "certifications",
        items: r.certificates.map((c) => {
          const m = /^(\d{4})(?:-(\d{2}))?/.exec(c.date ?? "");
          return {
            id: newId(),
            name: c.name ?? "",
            issuer: c.issuer ?? "",
            issueMonth: m?.[2] ? Number(m[2]) : 0,
            issueYear: m?.[1] ?? "",
            expiryMonth: 0,
            expiryYear: "",
            credentialId: "",
            credentialUrl: c.url ?? "",
          };
        }),
      },
      "Certifications",
    );
  }
  if (r.projects?.length) {
    add(
      {
        ...base("Projects", 1),
        type: "custom",
        items: r.projects.map((p) => ({
          id: newId(),
          heading: p.name ?? "",
          date: [toMonth(p.startDate), toMonth(p.endDate)].filter(Boolean).map((d) => formatMonthYear(Number(d.slice(5, 7)) || 0, d.slice(0, 4))).join(" – "),
          html: paragraphs(p.description) + bullets(p.highlights),
        })),
      },
      "Projects",
    );
  }
  if (r.awards?.length) {
    add(
      {
        ...base("Awards", 1),
        type: "custom",
        items: r.awards.map((a) => ({ id: newId(), heading: a.title ?? "", date: toYear(a.date), html: paragraphs([a.awarder, a.summary].filter(Boolean).join("\n")) })),
      },
      "Awards",
    );
  }

  const skipped = (["volunteer", "publications", "references"] as const).filter((k) => r[k]?.length).map((k) => k[0].toUpperCase() + k.slice(1));
  const links = [
    ...(b.url ? [{ id: newId(), label: "Website", url: b.url }] : []),
    ...(b.profiles ?? []).filter((p) => p.url || p.network).map((p) => ({ id: newId(), label: p.network ?? "", url: p.url ?? "" })),
  ];
  return {
    ok: true,
    imported,
    skipped,
    content: {
      header: {
        firstName,
        lastName: rest.join(" "),
        title: b.label ?? "",
        email: b.email ?? "",
        phone: b.phone ?? "",
        city: b.location?.city ?? "",
        country: b.location?.countryCode ?? b.location?.region ?? "",
        links,
      },
      sections,
    },
  };
}
