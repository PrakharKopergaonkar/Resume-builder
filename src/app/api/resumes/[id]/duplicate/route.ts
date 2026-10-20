import { getCurrentUser, notFound, unauthorized } from "@/lib/auth/guard";
import { duplicateResume } from "@/lib/resumes";

export async function POST(_req: Request, ctx: RouteContext<"/api/resumes/[id]/duplicate">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const doc = await duplicateResume(user.id, (await ctx.params).id);
  return doc ? Response.json(doc, { status: 201 }) : notFound();
}
