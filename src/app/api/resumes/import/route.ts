import { z } from "zod";
import { handle } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { fromJsonResume } from "@/lib/codec/jsonResume";
import { createResumeFromContent } from "@/lib/resumes";

const MAX_BYTES = 1_000_000;

const importSchema = z.object({
  fileName: z.string().max(255).optional(),
  resume: z.unknown(),
});

/**
 * Imports a JSON Resume file as a new resume (never overwrites an existing one). Answers with the new resume and
 * which sections were imported or skipped.
 */
async function importJsonResumeHandler(req: Request, { user }: UserContext) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ error: "That file is too large (the limit is 1 MB)." }, { status: 413 });
  }
  const body = importSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request", issues: body.error.issues }, { status: 400 });

  const result = fromJsonResume(body.data.resume);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422 });

  const name = (body.data.fileName ?? "").replace(/\.json$/i, "") || "Imported resume";
  const doc = await createResumeFromContent(user.id, name, result.content);
  return Response.json({ resume: doc, imported: result.imported, skipped: result.skipped }, { status: 201 });
}

export const POST = handle(withUser, importJsonResumeHandler);
