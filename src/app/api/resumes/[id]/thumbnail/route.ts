import { getResume } from "@/lib/resumes";
import { getThumbnail } from "@/lib/render";

export async function GET(req: Request, ctx: RouteContext<"/api/resumes/[id]/thumbnail">) {
  const { id } = await ctx.params;
  const doc = await getResume(id);
  if (!doc) return Response.json({ error: "Resume not found" }, { status: 404 });

  const png = await getThumbnail(new URL(req.url).origin, doc);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
