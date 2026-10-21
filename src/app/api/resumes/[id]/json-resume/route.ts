import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { toJsonResume } from "@/lib/codec/jsonResume";
import { attachmentHeader } from "@/lib/download";
import { getResume } from "@/lib/resumes";

/**
 * Exports the resume in the open JSON Resume format (jsonresume.org) as a download. Custom sections the standard
 * can't hold are listed in `meta` and in the X-Skipped-Sections header.
 */
async function exportJsonResumeHandler(_req: Request, { user, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  if (!doc) return notFound();

  const { resume, skippedSections } = toJsonResume(doc);
  return new Response(JSON.stringify(resume, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": attachmentHeader(doc.name, "json"),
      "Cache-Control": "no-store",
      ...(skippedSections.length ? { "X-Skipped-Sections": encodeURIComponent(skippedSections.join(", ")) } : {}),
    },
  });
}

export const GET = handle(withUser, exportJsonResumeHandler);
