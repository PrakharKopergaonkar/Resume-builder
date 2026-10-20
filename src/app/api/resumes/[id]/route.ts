import { getCurrentUser, notFound, unauthorized } from "@/lib/auth/guard";
import { deleteResume, getResume, updateResume } from "@/lib/resumes";
import { clearThumbnail } from "@/lib/render";
import { resumePatchSchema } from "@/types/resume";

export async function GET(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const doc = await getResume(user.id, (await ctx.params).id);
  return doc ? Response.json(doc) : notFound();
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const patch = resumePatchSchema.safeParse(await req.json().catch(() => null));
  if (!patch.success) return Response.json({ error: patch.error.issues }, { status: 400 });
  const doc = await updateResume(user.id, (await ctx.params).id, patch.data);
  return doc ? Response.json(doc) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!(await deleteResume(user.id, id))) return notFound();
  await clearThumbnail(id);
  return new Response(null, { status: 204 });
}
