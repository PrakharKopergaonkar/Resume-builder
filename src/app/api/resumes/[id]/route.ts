import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { deleteResume, getResume, updateResume } from "@/lib/resumes";
import { clearThumbnail } from "@/lib/render";
import { resumePatchSchema } from "@/types/resume";

/** Returns one of the user's resumes. */
async function getResumeHandler(_req: Request, { user, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  return doc ? Response.json(doc) : notFound();
}

/** Partially updates a resume (name, template, style and/or content). Used by the editor's autosave. */
async function updateResumeHandler(req: Request, { user, params }: UserContext) {
  const patch = resumePatchSchema.safeParse(await req.json().catch(() => null));
  if (!patch.success) return Response.json({ error: "Invalid request", issues: patch.error.issues }, { status: 400 });
  const doc = await updateResume(user.id, params.id, patch.data);
  return doc ? Response.json(doc) : notFound();
}

/** Deletes a resume and its cached thumbnail. */
async function deleteResumeHandler(_req: Request, { user, params }: UserContext) {
  if (!(await deleteResume(user.id, params.id))) return notFound();
  await clearThumbnail(params.id);
  return new Response(null, { status: 204 });
}

export const GET = handle(withUser, getResumeHandler);
export const PATCH = handle(withUser, updateResumeHandler);
export const DELETE = handle(withUser, deleteResumeHandler);
