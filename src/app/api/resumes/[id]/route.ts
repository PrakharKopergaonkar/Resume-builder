import { deleteResume, getResume, updateResume } from "@/lib/resumes";
import { clearThumbnail } from "@/lib/render";
import { resumePatchSchema } from "@/types/resume";

const notFound = () => Response.json({ error: "Resume not found" }, { status: 404 });

export async function GET(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const { id } = await ctx.params;
  const doc = await getResume(id);
  return doc ? Response.json(doc) : notFound();
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const { id } = await ctx.params;
  const patch = resumePatchSchema.safeParse(await req.json().catch(() => null));
  if (!patch.success) return Response.json({ error: patch.error.issues }, { status: 400 });
  if (!(await getResume(id))) return notFound();
  return Response.json(await updateResume(id, patch.data));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const { id } = await ctx.params;
  if (!(await deleteResume(id))) return notFound();
  await clearThumbnail(id);
  return new Response(null, { status: 204 });
}
