import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/db";
import { blankContent, DEFAULT_STYLE, sampleContent } from "@/lib/defaults";
import { migrateContent } from "@/lib/migrate";
import { normalizeUrl } from "@/components/renderer/format";
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
        case "certifications":
          return { ...s, items: s.items.map((i) => ({ ...i, credentialUrl: normalizeUrl(i.credentialUrl) })) };
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
    content: migrateContent(r.content as ResumeContent),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Every function below is scoped to one user: a resume that doesn't exist and one that belongs to someone else
// look the same (null / false), so callers answer 404 either way and IDs can't be probed.

export async function listResumes(userId: string): Promise<ResumeSummary[]> {
  const rows = await prisma.resume.findMany({
    where: { userId },
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

export async function getResume(userId: string, id: string) {
  const r = await prisma.resume.findFirst({ where: { id, userId } });
  return r ? toDoc(r) : null;
}

export async function createResume(userId: string, opts: { name?: string; sample?: boolean } = {}) {
  const count = await prisma.resume.count({ where: { userId } });
  const r = await prisma.resume.create({
    data: {
      userId,
      name: opts.name?.trim() || `My Resume ${count + 1}`,
      templateId: "classic",
      style: DEFAULT_STYLE,
      content: opts.sample ? sampleContent() : blankContent(),
    },
  });
  return toDoc(r);
}

export async function updateResume(userId: string, id: string, patch: ResumePatch) {
  const { count } = await prisma.resume.updateMany({
    where: { id, userId },
    data: { ...patch, content: patch.content ? sanitizeContent(patch.content) : undefined },
  });
  return count > 0 ? getResume(userId, id) : null;
}

export async function duplicateResume(userId: string, id: string) {
  const src = await prisma.resume.findFirst({ where: { id, userId } });
  if (!src) return null;
  const r = await prisma.resume.create({
    data: {
      userId,
      name: `${src.name} (copy)`,
      templateId: src.templateId,
      style: src.style ?? DEFAULT_STYLE,
      content: src.content ?? blankContent(),
    },
  });
  return toDoc(r);
}

export async function deleteResume(userId: string, id: string) {
  const { count } = await prisma.resume.deleteMany({ where: { id, userId } });
  return count > 0;
}
