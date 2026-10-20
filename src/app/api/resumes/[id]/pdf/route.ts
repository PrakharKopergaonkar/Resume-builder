import { getCurrentUser, getSessionToken, notFound, unauthorized } from "@/lib/auth/guard";
import { getResume } from "@/lib/resumes";
import { renderPdf } from "@/lib/render";

/** Safe ASCII filename for Content-Disposition, plus an RFC 5987 UTF-8 variant. */
function disposition(name: string) {
  const base = name.trim() || "resume";
  const ascii = base.replace(/[^\w.\- ]+/g, "_");
  return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${encodeURIComponent(base)}.pdf`;
}

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
      "Content-Disposition": disposition(doc.name),
      "Cache-Control": "no-store",
    },
  });
}
