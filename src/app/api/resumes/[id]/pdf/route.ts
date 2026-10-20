import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { attachmentHeader } from "@/lib/download";
import { renderPdf } from "@/lib/render";
import { getResume } from "@/lib/resumes";

/** Renders the resume to PDF with headless Chrome and sends it as a download. */
async function downloadPdfHandler(req: Request, { user, sessionToken, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  if (!doc) return notFound();

  // The print page loads the resume through the API, so the renderer reuses this user's session.
  const pdf = await renderPdf(new URL(req.url).origin, doc, sessionToken);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentHeader(doc.name, "pdf"),
      "Cache-Control": "no-store",
    },
  });
}

export const GET = handle(withUser, downloadPdfHandler);
