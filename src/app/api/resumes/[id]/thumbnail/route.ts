import { getCurrentUser, getSessionToken, notFound, unauthorized } from "@/lib/auth/guard";
import { getResume } from "@/lib/resumes";
import { getThumbnail } from "@/lib/render";

export async function GET(req: Request, ctx: RouteContext<"/api/resumes/[id]/thumbnail">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const doc = await getResume(user.id, (await ctx.params).id);
  if (!doc) return notFound();

  const png = await getThumbnail(new URL(req.url).origin, doc, (await getSessionToken())!);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
