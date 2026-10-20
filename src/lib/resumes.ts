import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/db";
import { blankContent, DEFAULT_STYLE, sampleContent } from "@/lib/defaults";
import type { Resume } from "@/generated/prisma/client";
import type { ResumeContent, ResumeDoc, ResumePatch, ResumeSummary, TemplateId } from "@/types/resume";

const RICH_TEXT = { ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li"], ALLOWED_ATTR: [] };

const clean = (html: string) => DOMPurify.sanitize(html, RICH_TEXT);

/** Strips anything but basic formatting tags from every rich-text field. */
export function sanitizeContent(content: ResumeContent): ResumeContent {
  return {
    ...content,
    sections: content.sections.map((s) => {
      switch (s.type) {
        case "summary":
          return { ...s, html: clean(s.html) };
        case "experience":
        case "education":
        case "custom":
          return { ...s, items: s.items.map((i) => ({ ...i, html: clean(i.html) })) } as typeof s;
        case "skills":
          return s;
      }
    }),
  };
}

export function toDoc(r: Resume): ResumeDoc {
  return {
    id: r.id,
    name: r.name,
    templateId: r.templateId as TemplateId,
    style: { ...DEFAULT_STYLE, ...(r.style as object) },
    content: r.content as ResumeContent,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listResumes(): Promise<ResumeSummary[]> {
  const rows = await prisma.resume.findMany({
    select: { id: true, name: true, templateId: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    ...r,
    templateId: r.templateId as TemplateId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getResume(id: string) {
  const r = await prisma.resume.findUnique({ where: { id } });
  return r ? toDoc(r) : null;
}

export async function createResume(opts: { name?: string; sample?: boolean } = {}) {
  const count = await prisma.resume.count();
  const r = await prisma.resume.create({
    data: {
      name: opts.name?.trim() || `My Resume ${count + 1}`,
      templateId: "classic",
      style: DEFAULT_STYLE,
      content: opts.sample ? sampleContent() : blankContent(),
    },
  });
  return toDoc(r);
}

export async function updateResume(id: string, patch: ResumePatch) {
  const r = await prisma.resume.update({
    where: { id },
    data: { ...patch, content: patch.content ? sanitizeContent(patch.content) : undefined },
  });
  return toDoc(r);
}

export async function duplicateResume(id: string) {
  const src = await prisma.resume.findUnique({ where: { id } });
  if (!src) return null;
  const r = await prisma.resume.create({
    data: {
      name: `${src.name} (copy)`,
      templateId: src.templateId,
      style: src.style ?? DEFAULT_STYLE,
      content: src.content ?? blankContent(),
    },
  });
  return toDoc(r);
}

export async function deleteResume(id: string) {
  const { count } = await prisma.resume.deleteMany({ where: { id } });
  return count > 0;
}
