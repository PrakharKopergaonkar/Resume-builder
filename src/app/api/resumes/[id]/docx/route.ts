import { getCurrentUser, notFound, unauthorized } from "@/lib/auth/guard";
import { buildResumeDocx } from "@/lib/docx/build";
import { attachmentHeader } from "@/lib/download";
import { getResume } from "@/lib/resumes";

export async function GET(_req: Request, ctx: RouteContext<"/api/resumes/[id]/docx">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const doc = await getResume(user.id, (await ctx.params).id);
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
