import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { buildResumeDocx } from "@/lib/docx/build";
import { attachmentHeader } from "@/lib/download";
import { getResume } from "@/lib/resumes";

/** Builds a Word (.docx) version of the resume and sends it as a download. */
async function downloadDocxHandler(_req: Request, { user, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  if (!doc) return notFound();

  const file = await buildResumeDocx(doc);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": attachmentHeader(doc.name, "docx"),
      "Cache-Control": "no-store",
    },
  });
}

export const GET = handle(withUser, downloadDocxHandler);
