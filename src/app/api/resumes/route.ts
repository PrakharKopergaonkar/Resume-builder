import { z } from "zod";
import { getCurrentUser, unauthorized } from "@/lib/auth/guard";
import { createResume, listResumes } from "@/lib/resumes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json(await listResumes(user.id));
}

const createSchema = z.object({ name: z.string().max(200).optional(), sample: z.boolean().optional() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.issues }, { status: 400 });
  return Response.json(await createResume(user.id, body.data), { status: 201 });
}
