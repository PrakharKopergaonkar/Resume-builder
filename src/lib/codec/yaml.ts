import { Document, isNode, LineCounter, parseDocument } from "yaml";
import { newId } from "@/lib/defaults";
import type { Snapshot } from "@/store/editor";
import { contentSchema, styleSchema, type ResumeContent, type Section } from "@/types/resume";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { yamlDocSchema, type YamlSection } from "./schema";

/**
 * Resume <-> YAML text for the Code view. The YAML hides internal ids and uses markdown for rich text;
 * see schema.ts for its shape.
 */

const HEADER_COMMENT = [
  " Your resume as YAML. Valid changes apply as you type; undo works as usual.",
  " Rich text: one paragraph per line, \"- \" bullets, \"1. \" numbered items, **bold**, *italic*.",
  " Section types: summary, experience, education, skills, certifications, custom.",
].join("\n");

const col = (c: 0 | 1) => (c === 0 ? "left" : "right");

function sectionToYaml(s: Section): Record<string, unknown> {
  const head: Record<string, unknown> = { type: s.type, title: s.title, ...(s.hidden ? { hidden: true } : {}), column: col(s.column) };
  switch (s.type) {
    case "summary":
      return { ...head, text: htmlToMarkdown(s.html) };
    case "experience":
      return {
        ...head,
        items: s.items.map((i) => ({
          title: i.title,
          company: i.company,
          city: i.city,
          country: i.country,
          start: i.start,
          end: i.current ? "" : i.end,
          current: i.current,
          description: htmlToMarkdown(i.html),
        })),
      };
    case "education":
      return {
        ...head,
        items: s.items.map((i) => ({ school: i.school, degree: i.degree, field: i.field, city: i.city, gradYear: i.gradYear, details: htmlToMarkdown(i.html) })),
      };
    case "skills":
      return { ...head, items: s.items.map((i) => (i.level ? { name: i.name, level: i.level } : i.name)) };
    case "certifications":
      return {
        ...head,
        items: s.items.map((i) => ({
          name: i.name,
          issuer: i.issuer,
          issueMonth: i.issueMonth,
          issueYear: i.issueYear,
          expiryMonth: i.expiryMonth,
          expiryYear: i.expiryYear,
          credentialId: i.credentialId,
          credentialUrl: i.credentialUrl,
        })),
      };
    case "custom":
      return { ...head, items: s.items.map((i) => ({ heading: i.heading, date: i.date, description: htmlToMarkdown(i.html) })) };
  }
}

export function toYaml(doc: Snapshot): string {
  const { header, sections } = doc.content;
  const data = {
    name: doc.name,
    design: {
      template: doc.templateId,
      accent: doc.style.accent,
      font: doc.style.font,
      fontSize: doc.style.fontSize,
      sectionSpacing: doc.style.sectionSpacing,
      lineHeight: doc.style.lineHeight,
      paper: doc.style.paper,
    },
    header: {
      firstName: header.firstName,
      lastName: header.lastName,
      title: header.title,
      email: header.email,
      phone: header.phone,
      city: header.city,
      country: header.country,
      links: header.links.map((l) => ({ label: l.label, url: l.url })),
    },
    sections: sections.map(sectionToYaml),
  };
  const yamlDoc = new Document(data);
  yamlDoc.commentBefore = HEADER_COMMENT;
  return yamlDoc.toString({ lineWidth: 0 });
}

export type YamlError = { line: number; column: number; message: string };
export type FromYamlResult = { ok: true; doc: Snapshot } | { ok: false; errors: YamlError[] };

/**
 * Rich text from YAML: if the markdown is unchanged, keep the previous HTML exactly (so editing one field doesn't
 * rewrite every description), otherwise convert.
 */
function rich(md: string, previousHtml: string | undefined): string {
  if (previousHtml !== undefined && htmlToMarkdown(previousHtml) === md.trim()) return previousHtml;
  return md.trim() ? markdownToHtml(md) : "";
}

/** Keeps the previous id of the item at the same position, so open cards and drag handles stay stable. */
const idAt = <T extends { id: string }>(prev: T[] | undefined, i: number) => prev?.[i]?.id ?? newId();

function sectionFromYaml(s: YamlSection, prev: Section | undefined): Section {
  const same = prev && prev.type === s.type ? prev : undefined;
  const base = { id: same?.id ?? newId(), title: s.title, hidden: s.hidden, column: s.column === "left" ? 0 : s.column === "right" ? 1 : (same?.column ?? 1) } as const;
  switch (s.type) {
    case "summary":
      return { ...base, type: "summary", html: rich(s.text, same?.type === "summary" ? same.html : undefined) };
    case "experience": {
      const p = same?.type === "experience" ? same.items : undefined;
      return {
        ...base,
        type: "experience",
        items: s.items.map((i, n) => ({
          id: idAt(p, n),
          title: i.title,
          company: i.company,
          city: i.city,
          country: i.country,
          start: i.start,
          end: i.current ? "" : i.end,
          current: i.current,
          html: rich(i.description, p?.[n]?.html),
        })),
      };
    }
    case "education": {
      const p = same?.type === "education" ? same.items : undefined;
      return {
        ...base,
        type: "education",
        items: s.items.map((i, n) => ({ id: idAt(p, n), school: i.school, degree: i.degree, field: i.field, city: i.city, gradYear: i.gradYear, html: rich(i.details, p?.[n]?.html) })),
      };
    }
    case "skills": {
      const p = same?.type === "skills" ? same.items : undefined;
      return {
        ...base,
        type: "skills",
        items: s.items.map((i, n) => (typeof i === "string" ? { id: idAt(p, n), name: i, level: 0 } : { id: idAt(p, n), name: i.name, level: i.level })),
      };
    }
    case "certifications": {
      const p = same?.type === "certifications" ? same.items : undefined;
      return { ...base, type: "certifications", items: s.items.map((i, n) => ({ id: idAt(p, n), ...i })) };
    }
    case "custom": {
      const p = same?.type === "custom" ? same.items : undefined;
      return {
        ...base,
        type: "custom",
        items: s.items.map((i, n) => ({ id: idAt(p, n), heading: i.heading, date: i.date, html: rich(i.description, p?.[n]?.html) })),
      };
    }
  }
}

/** ["sections", 1, "items", 0, "start"] -> "sections[1].items[0].start" */
const formatPath = (path: PropertyKey[]) =>
  path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s ? `${s}.${String(k)}` : String(k)), "");

/** Parses and validates YAML; on success returns the full resume (ids reused from `previous` by position). */
export function fromYaml(text: string, previous: Snapshot): FromYamlResult {
  const lineCounter = new LineCounter();
  const parsed = parseDocument(text, { lineCounter, prettyErrors: false });
  if (parsed.errors.length) {
    // One syntax mistake (usually indentation) makes the parser report a cascade; the first error is the real one.
    const e = parsed.errors[0];
    const pos = lineCounter.linePos(e.pos[0]);
    return { ok: false, errors: [{ line: pos.line, column: pos.col, message: `${e.message.split("\n")[0]} (check the indentation here)` }] };
  }

  const result = yamlDocSchema.safeParse(parsed.toJS() ?? {});
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => {
        // Point at the deepest node of the path that exists in the document.
        let node: unknown;
        for (let n = issue.path.length; n >= 0 && !node; n--) node = parsed.getIn(issue.path.slice(0, n) as (string | number)[], true);
        const offset = isNode(node) && node.range ? node.range[0] : 0;
        const pos = lineCounter.linePos(offset);
        const where = issue.path.length ? `${formatPath(issue.path)}: ` : "";
        return { line: pos.line, column: pos.col, message: `${where}${issue.message}` };
      }),
    };
  }

  const y = result.data;
  const content: ResumeContent = {
    header: {
      ...y.header,
      links: y.header.links.map((l, n) => ({ id: idAt(previous.content.header.links, n), label: l.label, url: l.url })),
    },
    sections: y.sections.map((s, n) => sectionFromYaml(s, previous.content.sections[n])),
  };
  // Design keys left out of the YAML keep their current values.
  const { template, ...design } = y.design;
  return {
    ok: true,
    doc: {
      name: y.name,
      templateId: template ?? previous.templateId,
      style: styleSchema.parse({ ...previous.style, ...design }),
      content: contentSchema.parse(content), // the stored model's own validation, as a final guarantee
    },
  };
}
