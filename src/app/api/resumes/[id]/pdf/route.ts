import { getCurrentUser, getSessionToken, notFound, unauthorized } from "@/lib/auth/guard";
import { getResume } from "@/lib/resumes";
import { attachmentHeader } from "@/lib/download";
import { renderPdf } from "@/lib/render";

export async function GET(req: Request, ctx: RouteContext<"/api/resumes/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const doc = await getResume(user.id, (await ctx.params).id);
  if (!doc) return notFound();

  // The print page loads the resume through the API, so the renderer reuses this user's session.
  const pdf = await renderPdf(new URL(req.url).origin, doc, (await getSessionToken())!);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachmentHeader(doc.name, "pdf"),
      "Cache-Control": "no-store",
    },
  });
}
