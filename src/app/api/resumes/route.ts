import { z } from "zod";
import { handle } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { createResume, listResumes } from "@/lib/resumes";

const createSchema = z.object({ name: z.string().max(200).optional(), sample: z.boolean().optional() });

/** Lists the signed-in user's resumes, most recently modified first. */
async function listResumesHandler(_req: Request, { user }: UserContext) {
  return Response.json(await listResumes(user.id));
}

/** Creates a blank resume (or one with example content when `sample` is true). */
async function createResumeHandler(req: Request, { user }: UserContext) {
  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Invalid request", issues: body.error.issues }, { status: 400 });
  return Response.json(await createResume(user.id, body.data), { status: 201 });
}

export const GET = handle(withUser, listResumesHandler);
export const POST = handle(withUser, createResumeHandler);
