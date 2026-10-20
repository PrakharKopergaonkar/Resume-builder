import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { getThumbnail } from "@/lib/render";
import { getResume } from "@/lib/resumes";

/** Returns a PNG preview of the resume's first page (cached until the resume changes). */
async function thumbnailHandler(req: Request, { user, sessionToken, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  if (!doc) return notFound();

  const png = await getThumbnail(new URL(req.url).origin, doc, sessionToken);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}

export const GET = handle(withUser, thumbnailHandler);
