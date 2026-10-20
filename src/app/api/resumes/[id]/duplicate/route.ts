import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { duplicateResume } from "@/lib/resumes";

/** Copies a resume as "<name> (copy)". */
async function duplicateResumeHandler(_req: Request, { user, params }: UserContext) {
  const doc = await duplicateResume(user.id, params.id);
  return doc ? Response.json(doc, { status: 201 }) : notFound();
}

export const POST = handle(withUser, duplicateResumeHandler);
