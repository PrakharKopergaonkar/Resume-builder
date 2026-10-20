import { duplicateResume } from "@/lib/resumes";

export async function POST(_req: Request, ctx: RouteContext<"/api/resumes/[id]/duplicate">) {
  const { id } = await ctx.params;
  const doc = await duplicateResume(id);
  return doc ? Response.json(doc, { status: 201 }) : Response.json({ error: "Resume not found" }, { status: 404 });
}
